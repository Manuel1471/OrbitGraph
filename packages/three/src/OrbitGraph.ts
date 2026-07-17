import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import type {
    GraphData,
    GraphLink,
    GraphNode,
    GraphSelection,
    OrbitGraphOptions,
    VisibleGraphData,
} from "@orbitgraph/core"

import { GraphCamera } from "./GraphCamera";
import { GraphFilter } from "./GraphFilter";
import { GraphInteraction } from "./GraphInteraction";
import { GraphRenderer } from "./GraphRenderer";
import { NodeLabelRenderer } from "./NodeLabelRenderer";
import {
    PhysicsEngine,
    type PhysicsLink,
    type PhysicsNode,
} from "./PhysicsEngine";

import type {
    GraphLinkArrowMap,
    GraphLinkLineMap,
    GraphNodeMap,
    GraphNodeMeshMap,
} from "./graph-types";

export class OrbitGraph {
    private readonly scene = new THREE.Scene();
    private readonly group = new THREE.Group();
    private readonly camera: THREE.PerspectiveCamera;
    private readonly renderer: THREE.WebGLRenderer;
    private readonly controls: OrbitControls;
    private readonly resizeObserver: ResizeObserver;

    private readonly physics = new PhysicsEngine();
    private readonly filter = new GraphFilter();

    private readonly nodes: GraphNodeMap = new Map();
    private readonly nodeMeshes: GraphNodeMeshMap = new Map();
    private readonly linkLines: GraphLinkLineMap = new Map();
    private readonly linkArrows: GraphLinkArrowMap = new Map();

    private readonly graphRenderer: GraphRenderer;
    private readonly graphCamera: GraphCamera;
    private readonly labels: NodeLabelRenderer;
    private readonly interaction: GraphInteraction;

    private data: GraphData = { nodes: [], links: [] };
    private physicsNodes: PhysicsNode[] = [];
    private physicsLinks: PhysicsLink[] = [];

    constructor(
        private readonly container: HTMLElement,
        private readonly options: OrbitGraphOptions = {},
    ) {
        const width = container.clientWidth || window.innerWidth;
        const height = container.clientHeight || window.innerHeight;

        this.scene.background = new THREE.Color(
            options.backgroundColor ?? "#050816",
        );

        this.camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 2000);
        this.camera.position.set(0, 0, 90);

        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: "high-performance",
        });

        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        container.appendChild(this.renderer.domElement);

        this.controls = new OrbitControls(
            this.camera,
            this.renderer.domElement,
        );

        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.08;
        this.controls.minDistance = 10;
        this.controls.maxDistance = 250;

        this.scene.add(this.group);
        this.scene.add(new THREE.AmbientLight("#ffffff", 1.5));

        this.graphRenderer = new GraphRenderer(
            this.group,
            this.nodeMeshes,
            this.linkLines,
            this.linkArrows,
            this.nodes,
            {
                nodeColor: options.nodeColor ?? "#22d3ee",
                nodeSize: options.nodeSize ?? 0.65,
                linkColor: options.linkColor ?? "#6366f1",
                linkOpacity: options.linkOpacity ?? 0.55,
            },
        );

        this.graphCamera = new GraphCamera(this.camera, this.controls);

        this.labels = new NodeLabelRenderer(
            this.scene,
            this.nodes,
            this.nodeMeshes,
        );

        this.interaction = new GraphInteraction(
            this.renderer.domElement,
            this.camera,
            () => this.group.children,
            {
                onNodeClick: (node, event) => {
                    this.labels.show(node);

                    this.options.onNodeClick?.({
                        node,
                        nativeEvent: event,
                    });

                    this.emitSelection({ kind: "node", node });
                },

                onLinkClick: (link, event) => {
                    this.labels.hide();

                    this.options.onLinkClick?.({
                        link,
                        nativeEvent: event,
                    });

                    this.emitSelection({ kind: "link", link });
                },

                onNodeHover: (node, event) => {
                    if (node) this.labels.show(node);

                    this.options.onNodeHover?.({
                        node,
                        nativeEvent: event,
                    });
                },

                onLinkHover: (link, event) => {
                    this.options.onLinkHover?.({
                        link,
                        nativeEvent: event,
                    });
                },

                onDragStart: (node) => {
                    this.controls.enabled = false;

                    const physicsNode = this.nodes.get(node.id);

                    if (physicsNode) {
                        this.physics.startDrag(physicsNode);
                    }
                },

                onDragMove: (node, position) => {
                    const physicsNode = this.nodes.get(node.id);

                    if (physicsNode) {
                        this.physics.drag(
                            physicsNode,
                            position.x,
                            position.y,
                            position.z,
                        );
                    }
                },

                onDragEnd: (node) => {
                    this.controls.enabled = true;
                    this.physics.endDrag();

                    const physicsNode = this.nodes.get(node.id);

                    if (physicsNode) {
                        this.labels.show(physicsNode);
                    }
                },
            },
        );

        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(container);

        this.animate();
    }

    setData(data: GraphData): void {
        this.clearGraph();

        this.data = {
            nodes: data.nodes.map((node) => ({ ...node })),
            links: data.links.map((link) => ({ ...link })),
        };

        this.physicsNodes = this.data.nodes.map((node, index) =>
            this.createPhysicsNode(node, index),
        );

        for (const node of this.physicsNodes) {
            this.graphRenderer.addNode(node);
        }

        for (const link of this.data.links) {
            this.graphRenderer.addLink(link);
        }

        this.physicsLinks = this.data.links.map((link) => ({
            id:
                link.id ??
                `${link.source}__${link.type ?? "related"}__${link.target}`,
            source: link.source,
            target: link.target,
            graphLink: link,
        }));

        this.physics.start(
            this.physicsNodes,
            this.physicsLinks,
            () => {
                this.graphRenderer.syncPositions();
                this.labels.updatePosition();
            },
        );

        this.applyFilters();
    }

    addNode(node: GraphNode): void {
        if (this.data.nodes.some((item) => item.id === node.id)) {
            throw new Error(`Node "${node.id}" already exists.`);
        }

        const physicsNode = this.createPhysicsNode(node, this.data.nodes.length);

        this.data.nodes.push(node);
        this.physicsNodes.push(physicsNode);

        this.graphRenderer.addNode(physicsNode);
        this.physics.addNode(physicsNode);

        this.applyFilters();
    }

    removeNode(nodeId: string): void {
        const relatedLinks = this.data.links.filter(
            (link) => link.source === nodeId || link.target === nodeId,
        );

        relatedLinks.forEach((link) => {
            if (link.id) this.removeLink(link.id);
        });

        this.data.nodes = this.data.nodes.filter((node) => node.id !== nodeId);
        this.physicsNodes = this.physicsNodes.filter((node) => node.id !== nodeId);

        this.graphRenderer.removeNode(nodeId);
        this.physics.removeNode(nodeId);

        this.applyFilters();
    }

    addLink(link: GraphLink): void {
        const id =
            link.id ??
            `${link.source}__${link.type ?? "related"}__${link.target}`;

        const normalized = { ...link, id };

        this.data.links.push(normalized);
        this.graphRenderer.addLink(normalized);

        const physicsLink: PhysicsLink = {
            id,
            source: normalized.source,
            target: normalized.target,
            graphLink: normalized,
        };

        this.physicsLinks.push(physicsLink);
        this.physics.addLink(physicsLink);

        this.applyFilters();
    }

    removeLink(linkId: string): void {
        this.data.links = this.data.links.filter((link) => link.id !== linkId);
        this.physicsLinks = this.physicsLinks.filter((link) => link.id !== linkId);

        this.graphRenderer.removeLink(linkId);
        this.physics.removeLink(linkId);

        this.applyFilters();
    }

    search(query: string): void {
        this.filter.search(query);
        this.applyFilters();
    }

    toggleTypeFilter(type: string): void {
        this.filter.toggleType(type);
        this.applyFilters();
    }

    setTypeFilters(types: string[]): void {
        this.filter.setTypes(types);
        this.applyFilters();
    }

    setMinimumLinkWeight(weight: number): void {
        this.filter.setMinimumLinkWeight(weight);
        this.applyFilters();
    }

    clearFilters(): void {
        this.filter.clear();
        this.applyFilters();
    }

    resetCamera(): void {
        this.graphCamera.reset(this.physicsNodes);
        this.labels.hide();
        this.emitSelection(null);
    }

    focusNode(nodeId: string): void {
        const node = this.nodes.get(nodeId);

        if (!node) return;

        this.graphCamera.focusNode(node);
        this.labels.show(node);
        this.emitSelection({ kind: "node", node });
    }

    unpinNode(nodeId: string): void {
        const node = this.nodes.get(nodeId);

        if (node) this.physics.unpin(node);
    }

    destroy(): void {
        this.resizeObserver.disconnect();
        this.interaction.dispose();
        this.physics.stop();
        this.labels.hide();
        this.clearGraph();
        this.controls.dispose();
        this.renderer.dispose();

        this.container.removeChild(this.renderer.domElement);
    }

    private applyFilters(): void {
        const visible = this.filter.getVisibleData(this.data);

        this.graphRenderer.setVisibleNodeIds(
            new Set(visible.nodes.map((node) => node.id)),
            this.filter.getMinimumLinkWeight(),
        );

        this.options.onVisibleDataChange?.(visible);
    }

    private emitSelection(selection: GraphSelection): void {
        this.options.onSelectionChange?.(selection);
    }

    private clearGraph(): void {
        this.physics.stop();
        this.labels.hide();
        this.graphRenderer.clear();

        this.physicsNodes = [];
        this.physicsLinks = [];
    }

    private createPhysicsNode(
        node: GraphNode,
        index: number,
    ): PhysicsNode {
        const seed = index * 12.9898;
        const theta = seed % (Math.PI * 2);
        const phi = Math.acos(1 - 2 * ((seed * 0.618) % 1));
        const distance = 15 + ((seed * 0.371) % 1) * 20;

        return {
            ...node,
            x: distance * Math.sin(phi) * Math.cos(theta),
            y: distance * Math.sin(phi) * Math.sin(theta),
            z: distance * Math.cos(phi),
        };
    }

    private resize(): void {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        if (!width || !height) return;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    private animate = (): void => {
        requestAnimationFrame(this.animate);

        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    };
}

export function createOrbitGraph(
    container: HTMLElement,
    options?: OrbitGraphOptions,
): OrbitGraph {
    return new OrbitGraph(container, options);
}