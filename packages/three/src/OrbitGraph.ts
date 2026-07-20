import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import type {
    GraphData,
    GraphExpansionOptions,
    GraphExplorationHistoryState,
    GraphInitialView,
    GraphLayout,
    GraphLayoutOptions,
    GraphLink,
    GraphNode,
    GraphNodeExplorationState,
    GraphPathOptions,
    GraphSelection,
    OrbitGraphOptions,
    VisibleGraphData,
} from "@orbitgraph/core";

import { GraphCamera } from "./GraphCamera";
import { GraphExplorer } from "./GraphExplorer";
import { GraphFilter } from "./GraphFilter";
import { GraphInteraction } from "./GraphInteraction";
import { GraphRenderer } from "./GraphRenderer";
import { LinkParticleRenderer } from "./LinkParticleRenderer";
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

/**
 * Interactive Three.js renderer for OrbitGraph data.
 *
 * The complete graph stays in `data`, while `GraphExplorer` sends only the
 * active subset to the renderer and physics engine.
 */
export class OrbitGraph {
    private readonly scene = new THREE.Scene();
    private readonly group = new THREE.Group();
    private readonly camera: THREE.PerspectiveCamera;
    private readonly renderer: THREE.WebGLRenderer;
    private readonly controls: OrbitControls;
    private readonly resizeObserver: ResizeObserver;

    private readonly physics = new PhysicsEngine();
    private readonly filter = new GraphFilter();
    private readonly explorer: GraphExplorer;

    /** Active nodes only. GraphRenderer clears this map between views. */
    private readonly nodes: GraphNodeMap = new Map();
    private readonly nodeMeshes: GraphNodeMeshMap = new Map();
    private readonly linkLines: GraphLinkLineMap = new Map();
    private readonly linkArrows: GraphLinkArrowMap = new Map();

    /** Position cache for all known nodes, including currently hidden nodes. */
    private readonly nodeStates = new Map<string, PhysicsNode>();

    private readonly graphRenderer: GraphRenderer;
    private readonly graphCamera: GraphCamera;
    private readonly labels: NodeLabelRenderer;
    private readonly particles: LinkParticleRenderer;
    private readonly interaction: GraphInteraction;

    private data: GraphData = { nodes: [], links: [] };
    private physicsNodes: PhysicsNode[] = [];
    private physicsLinks: PhysicsLink[] = [];
    private layout: GraphLayout;
    private layoutOptions: GraphLayoutOptions;

    constructor(
        private readonly container: HTMLElement,
        private readonly options: OrbitGraphOptions = {},
    ) {
        const width = container.clientWidth || window.innerWidth;
        const height = container.clientHeight || window.innerHeight;

        this.explorer = new GraphExplorer(options.initialView);
        this.layout = options.layout ?? "force";
        this.layoutOptions = options.layoutOptions ?? {};

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
        this.labels = new NodeLabelRenderer(this.scene, this.nodes);
        this.particles = new LinkParticleRenderer(
            this.scene,
            this.nodes,
            options.linkFlow,
        );

        this.interaction = new GraphInteraction(
            this.renderer.domElement,
            this.camera,
            () => this.group.children,
            {
                onNodeClick: (node, event) => {
                    this.labels.show(node);
                    this.options.onNodeClick?.({ node, nativeEvent: event });
                    this.emitSelection({ kind: "node", node });
                },
                onLinkClick: (link, event) => {
                    this.labels.hide();
                    this.options.onLinkClick?.({ link, nativeEvent: event });
                    this.emitSelection({ kind: "link", link });
                },
                onNodeHover: (node, event) => {
                    if (node) {
                        this.labels.show(node);
                    }

                    this.options.onNodeHover?.({ node, nativeEvent: event });
                },
                onLinkHover: (link, event) => {
                    this.options.onLinkHover?.({ link, nativeEvent: event });
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

    /** Replaces the complete source graph and resets exploration state. */
    setData(data: GraphData): void {
        this.nodeStates.clear();

        this.data = {
            nodes: data.nodes.map((node) => ({ ...node })),
            links: data.links.map((link) => this.normalizeLink(link)),
        };

        this.explorer.setData(this.data);
        this.explorer.reset();
        this.refreshVisibleGraph();
    }

    /** Changes the initial exploration entry point and resets expansions. */
    setInitialView(view: GraphInitialView): void {
        this.explorer.setInitialView(view);
        this.refreshVisibleGraph();
    }

    /** Changes the visual arrangement of the active graph subset. */
    setLayout(
        layout: GraphLayout,
        options: GraphLayoutOptions = {},
    ): void {
        this.layout = layout;
        this.layoutOptions = options;

        this.physics.setLayout(layout, options);
        this.graphRenderer.syncPositions();
        this.labels.updatePosition();
    }

    /** Reveals a node's neighborhood without mounting the entire graph. */
    expandNode(nodeId: string, options: GraphExpansionOptions = {}): void {
        this.explorer.expandNode(nodeId, options);
        this.refreshVisibleGraph();
    }

    /** Removes a manual neighborhood expansion. */
    collapseNode(nodeId: string): void {
        this.explorer.collapseNode(nodeId);
        this.refreshVisibleGraph();
    }

    /** Returns to the configured initial view. */
    resetExploration(): void {
        this.explorer.reset();
        this.refreshVisibleGraph();
    }

    /** Makes the complete graph active in the renderer and simulation. */
    showAll(): void {
        this.explorer.showAll();
        this.refreshVisibleGraph();
    }

    addNode(node: GraphNode): void {
        if (this.data.nodes.some((item) => item.id === node.id)) {
            throw new Error(`Node "${node.id}" already exists.`);
        }

        this.data.nodes.push({ ...node });
        this.explorer.setData(this.data);
        this.refreshVisibleGraph();
    }

    removeNode(nodeId: string): void {
        this.data.nodes = this.data.nodes.filter((node) => node.id !== nodeId);
        this.data.links = this.data.links.filter(
            (link) => link.source !== nodeId && link.target !== nodeId,
        );
        this.nodeStates.delete(nodeId);
        this.explorer.setData(this.data);
        this.refreshVisibleGraph();
    }

    addLink(link: GraphLink): void {
        const nodeIds = new Set(this.data.nodes.map((node) => node.id));

        if (!nodeIds.has(link.source) || !nodeIds.has(link.target)) {
            throw new Error("Both link nodes must exist before adding a link.");
        }

        const normalizedLink = this.normalizeLink(link);

        if (this.data.links.some((item) => item.id === normalizedLink.id)) {
            throw new Error(`Link "${normalizedLink.id}" already exists.`);
        }

        this.data.links.push(normalizedLink);
        this.explorer.setData(this.data);
        this.refreshVisibleGraph();
    }

    removeLink(linkId: string): void {
        this.data.links = this.data.links.filter((link) => link.id !== linkId);
        this.explorer.setData(this.data);
        this.refreshVisibleGraph();
    }

    search(query: string): void {
        this.filter.search(query);
        this.refreshVisibleGraph();
    }

    toggleTypeFilter(type: string): void {
        this.filter.toggleType(type);
        this.refreshVisibleGraph();
    }

    setTypeFilters(types: string[]): void {
        this.filter.setTypes(types);
        this.refreshVisibleGraph();
    }

    setMinimumLinkWeight(weight: number): void {
        this.filter.setMinimumLinkWeight(weight);
        this.refreshVisibleGraph();
    }

    clearFilters(): void {
        this.filter.clear();
        this.refreshVisibleGraph();
    }

    resetCamera(): void {
        this.graphCamera.reset(this.physicsNodes);
        this.labels.hide();
        this.emitSelection(null);
    }

    focusNode(nodeId: string): void {
        const node = this.nodes.get(nodeId);

        if (!node) {
            return;
        }

        this.graphCamera.focusNode(node);
        this.labels.show(node);
        this.emitSelection({ kind: "node", node });
    }

    focusPath(
        sourceId: string,
        targetId: string,
        options: GraphPathOptions = {},
    ): boolean {
        const found = this.explorer.focusPath(sourceId, targetId, options);

        if (found) {
            this.refreshVisibleGraph();
        }

        return found;
    }

    goBack(): boolean {
        const changed = this.explorer.goBack();

        if (changed) {
            this.refreshVisibleGraph();
        }

        return changed;
    }

    goForward(): boolean {
        const changed = this.explorer.goForward();

        if (changed) {
            this.refreshVisibleGraph();
        }

        return changed;
    }

    getExplorationHistory(): GraphExplorationHistoryState {
        return this.explorer.getHistoryState();
    }

    getNodeExplorationState(nodeId: string): GraphNodeExplorationState {
        return this.explorer.getNodeExplorationState(nodeId);
    }

    unpinNode(nodeId: string): void {
        const node = this.nodes.get(nodeId);

        if (node) {
            this.physics.unpin(node);
        }
    }

    destroy(): void {
        this.resizeObserver.disconnect();
        this.interaction.dispose();
        this.clearActiveGraph();
        this.particles.dispose();
        this.controls.dispose();
        this.renderer.dispose();
        this.container.removeChild(this.renderer.domElement);
    }

    /**
     * Applies exploration first, then normal filters.
     *
     * Search and type/weight filters never reveal nodes outside the current
     * exploration. Expand a node or change the initial view to reveal more.
     */
    private refreshVisibleGraph(): void {
        const explored = this.explorer.getVisibleData();
        const visible = this.filter.getVisibleData(explored);

        this.clearActiveGraph();

        this.physicsNodes = visible.nodes.map((node, index) =>
            this.getOrCreatePhysicsNode(node, index),
        );

        for (const node of this.physicsNodes) {
            this.graphRenderer.addNode(node);
        }

        for (const link of visible.links) {
            this.graphRenderer.addLink(link);
        }

        this.physicsLinks = visible.links.map((link) => ({
            id: link.id!,
            source: link.source,
            target: link.target,
            graphLink: link,
        }));

        this.particles.setLinks(visible.links);

        if (this.physicsNodes.length > 0) {
            this.physics.start(
                this.physicsNodes,
                this.physicsLinks,
                () => {
                    this.graphRenderer.syncPositions();
                    this.labels.updatePosition();
                },
                this.layout,
                this.layoutOptions,
            );

            this.graphRenderer.syncPositions();
        }

        this.options.onVisibleDataChange?.(visible);
    }

    private clearActiveGraph(): void {
        this.physics.stop();
        this.labels.hide();
        this.particles.clear();
        this.graphRenderer.clear();
        this.physicsNodes = [];
        this.physicsLinks = [];
    }

    private getOrCreatePhysicsNode(
        node: GraphNode,
        index: number,
    ): PhysicsNode {
        const existing = this.nodeStates.get(node.id);

        if (existing) {
            Object.assign(existing, node);
            return existing;
        }

        const physicsNode = this.createPhysicsNode(node, index);
        this.nodeStates.set(node.id, physicsNode);

        return physicsNode;
    }

    private normalizeLink(link: GraphLink): GraphLink & { id: string } {
        return {
            ...link,
            id:
                link.id ??
                `${link.source}__${link.type ?? "related"}__${link.target}`,
        };
    }

    private emitSelection(selection: GraphSelection): void {
        this.options.onSelectionChange?.(selection);
    }

    private createPhysicsNode(node: GraphNode, index: number): PhysicsNode {
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

        if (!width || !height) {
            return;
        }

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    private animate = (): void => {
        requestAnimationFrame(this.animate);
        this.controls.update();
        this.particles.update(performance.now() / 1000);
        this.renderer.render(this.scene, this.camera);
    };
}

/** Creates an OrbitGraph instance inside a container element. */
export function createOrbitGraph(
    container: HTMLElement,
    options?: OrbitGraphOptions,
): OrbitGraph {
    return new OrbitGraph(container, options);
}