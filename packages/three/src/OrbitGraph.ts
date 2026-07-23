import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import type {
    GraphData,
    GraphDataSource,
    GraphExpansionOptions,
    GraphExplorationHistoryState,
    GraphInitialView,
    GraphLayout,
    GraphLayoutOptions,
    GraphLink,
    GraphJSONExportOptions,
    GraphLoadingState,
    GraphNode,
    GraphNodeExplorationState,
    GraphNeighborhoodLoadOptions,
    GraphNeighborhoodResult,
    GraphPathOptions,
    GraphSelection,
    OrbitGraphOptions,
    OrbitGraphViewState,
    VisibleGraphData,
} from "@orbitgraph/core";

import { GraphCamera } from "./GraphCamera";
import { GraphDataStore } from "./GraphDataStore";
import { GraphExplorer } from "./GraphExplorer";
import { GraphExporter } from "./GraphExporter";
import { GraphFilter } from "./GraphFilter";
import { GraphInteraction } from "./GraphInteraction";
import { GraphKeyboardNavigation } from "./GraphKeyboardNavigation";
import { GraphLazyLoader } from "./GraphLazyLoader";
import { GraphRenderer } from "./GraphRenderer";
import { GraphRuntime } from "./GraphRuntime";
import { GraphViewSynchronizer } from "./GraphViewSynchronizer";
import { LinkParticleRenderer } from "./LinkParticleRenderer";
import { GraphMobileControls } from "./GraphMobileControls";
import { NodeLabelRenderer } from "./NodeLabelRenderer";
import { PhysicsEngine } from "./PhysicsEngine";
import { GraphAnalyticsController } from "./GraphAnalyticsController";
import type {
    GraphLinkArrowMap,
    GraphLinkLineMap,
    GraphNodeMap,
    GraphNodeMeshMap,
} from "./graph-types";

/**
 * Public OrbitGraph facade. It coordinates data, exploration, interaction,
 * rendering, and physics without owning their implementation details.
 */
export class OrbitGraph {
    private readonly scene = new THREE.Scene();
    private readonly group = new THREE.Group();
    private readonly camera: THREE.PerspectiveCamera;
    private readonly renderer: THREE.WebGLRenderer;
    private readonly controls: OrbitControls;
    private readonly resizeObserver: ResizeObserver;

    private readonly dataStore = new GraphDataStore();
    private readonly explorer: GraphExplorer;
    private readonly filter = new GraphFilter();
    private readonly physics: PhysicsEngine;
    public readonly analytics: GraphAnalyticsController;

    /** Active objects only; they are replaced after each view refresh. */
    private readonly nodes: GraphNodeMap = new Map();
    private readonly nodeMeshes: GraphNodeMeshMap = new Map();
    private readonly linkLines: GraphLinkLineMap = new Map();
    private readonly linkArrows: GraphLinkArrowMap = new Map();

    private readonly graphRenderer: GraphRenderer;
    private readonly graphCamera: GraphCamera;
    private readonly labels: NodeLabelRenderer;
    private readonly particles: LinkParticleRenderer;
    private readonly views: GraphViewSynchronizer;
    private readonly lazyLoader: GraphLazyLoader;
    private readonly runtime: GraphRuntime;
    private readonly interaction: GraphInteraction;
    private readonly keyboardNavigation: GraphKeyboardNavigation;
    private readonly exporter: GraphExporter;
    private readonly mobileControls: GraphMobileControls;

    private layout: GraphLayout;
    private layoutOptions: GraphLayoutOptions;
    private visibleData: VisibleGraphData = { nodes: [], links: [] };

    constructor(
        private readonly container: HTMLElement,
        private readonly options: OrbitGraphOptions = {},
    ) {

        const width = container.clientWidth || window.innerWidth;
        const height = container.clientHeight || window.innerHeight;

        this.explorer = new GraphExplorer(options.initialView);
        this.physics = new PhysicsEngine(options.physics);
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

        this.graphCamera = new GraphCamera(
            this.camera,
            this.controls,
            this.renderer.domElement,
            options.camera,
        );
        this.labels = new NodeLabelRenderer(this.scene, this.nodes);
        this.particles = new LinkParticleRenderer(
            this.scene,
            this.nodes,
            options.linkFlow,
        );

        this.views = new GraphViewSynchronizer(
            this.dataStore,
            this.explorer,
            this.filter,
            this.physics,
            this.graphRenderer,
            this.labels,
            this.particles,
            {
                layout: this.layout,
                layoutOptions: this.layoutOptions,
                onVisibleDataChange: options.onVisibleDataChange,
            },
        );

        this.analytics = new GraphAnalyticsController(
            () => this.dataStore.getData(),
            () => this.visibleData,
        );

        this.lazyLoader = new GraphLazyLoader(
            this.dataStore,
            this.explorer,
            {
                dataSource: options.dataSource,
                onDataChange: () => this.refreshVisibleGraph(),
                onLoadingChange: options.onLoadingChange,
            },
        );

        this.runtime = new GraphRuntime(
            this.renderer,
            this.scene,
            this.camera,
            this.graphCamera,
            this.particles,
        );

        this.exporter = new GraphExporter({
            canvas: this.renderer.domElement,
            render: () => this.renderer.render(this.scene, this.camera),
            getData: () => this.dataStore.getData(),
            getVisibleData: () => this.visibleData,
        });

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

        this.keyboardNavigation = new GraphKeyboardNavigation(
            this.renderer.domElement,
            () => [...this.nodes.values()],
            {
                onFocusChange: (node) => {
                    this.graphRenderer.setKeyboardFocus(node?.id ?? null);
                    this.options.onKeyboardFocusChange?.(node ?? null);
                },
                onActivate: (node) => {
                    this.focusNode(node.id);
                },
                onExpand: (node) => {
                    this.expandNode(node.id);
                },
                onCollapse: (node) => {
                    this.collapseNode(node.id);
                },
                onFocusCamera: (node) => {
                    this.focusNode(node.id);
                },
                onClear: () => {
                    this.labels.hide();
                    this.graphRenderer.setKeyboardFocus(null);
                    this.emitSelection(null);
                },
            },
            this.options.accessibility,
        );

        this.mobileControls = new GraphMobileControls(
            this.container,
            {
                onZoomIn: () => this.graphCamera.zoomBy(0.8),
                onZoomOut: () => this.graphCamera.zoomBy(1.25),
                onReset: () => this.resetCamera(),
            },
            this.options.mobileControls,
        );

        this.resizeObserver = new ResizeObserver(() => {
            this.runtime.resize(this.container);
        });
        this.resizeObserver.observe(container);
        this.runtime.start();
    }

    /** Replaces all graph data and returns exploration to its initial view. */
    setData(data: GraphData): void {
        this.dataStore.setData(data);
        this.explorer.setData(this.dataStore.getData());
        this.explorer.reset();
        this.lazyLoader.resetCache();
        this.graphRenderer.setKeyboardFocus(null);
        this.refreshVisibleGraph();
    }

    setInitialView(view: GraphInitialView): void {
        this.explorer.setInitialView(view);
        this.refreshVisibleGraph();
    }

    setLayout(layout: GraphLayout, options: GraphLayoutOptions = {}): void {
        this.layout = layout;
        this.layoutOptions = { ...options };
        this.views.setLayout(this.layout, this.layoutOptions);
    }

    exportViewState(): OrbitGraphViewState {
        return {
            version: 1,
            exploration: this.explorer.getState(),
            filters: this.filter.getState(),
            layout: this.layout,
            layoutOptions: { ...this.layoutOptions },
        };
    }

    importViewState(state: OrbitGraphViewState): void {
        if (state.version !== 1) {
            throw new Error(
                `Unsupported OrbitGraph view state version: ${state.version}.`,
            );
        }

        this.explorer.setState(state.exploration);
        this.filter.setState(state.filters);
        this.layout = state.layout;
        this.layoutOptions = { ...state.layoutOptions };
        this.views.setLayout(this.layout, this.layoutOptions);
        this.refreshVisibleGraph();
    }

    setDataSource(dataSource?: GraphDataSource): void {
        this.lazyLoader.setDataSource(dataSource);
    }

    getLoadingState(): GraphLoadingState {
        return this.lazyLoader.getLoadingState();
    }

    loadNode(nodeId: string): Promise<GraphNode | undefined> {
        return this.lazyLoader.loadNode(nodeId);
    }

    loadNeighborhood(
        nodeId: string,
        options: GraphNeighborhoodLoadOptions = {},
    ): Promise<GraphNeighborhoodResult | null> {
        return this.lazyLoader.loadNeighborhood(nodeId, options);
    }

    expandNode(nodeId: string, options: GraphExpansionOptions = {}): void {
        this.explorer.expandNode(nodeId, options);
        this.refreshVisibleGraph();
    }

    collapseNode(nodeId: string): void {
        this.explorer.collapseNode(nodeId);
        this.refreshVisibleGraph();
    }

    resetExploration(): void {
        this.explorer.reset();
        this.refreshVisibleGraph();
    }

    showAll(): void {
        this.explorer.showAll();
        this.refreshVisibleGraph();
    }

    addNode(node: GraphNode): void {
        this.dataStore.addNode(node);
        this.explorer.setData(this.dataStore.getData());
        this.refreshVisibleGraph();
    }

    removeNode(nodeId: string): void {
        this.dataStore.removeNode(nodeId);
        this.explorer.setData(this.dataStore.getData());
        this.refreshVisibleGraph();
    }

    addLink(link: GraphLink): void {
        this.dataStore.addLink(link);
        this.explorer.setData(this.dataStore.getData());
        this.refreshVisibleGraph();
    }

    removeLink(linkId: string): void {
        this.dataStore.removeLink(linkId);
        this.explorer.setData(this.dataStore.getData());
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
        this.graphCamera.reset([...this.views.getPhysicsNodes()]);
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
        this.views.unpinNode(nodeId);
    }

    /** Creates a PNG Blob containing the current rendered graph view. */
    exportPNG(): Promise<Blob> {
        return this.exporter.exportPNG();
    }

    /** Downloads the current rendered graph view as a PNG file. */
    downloadPNG(fileName = "orbitgraph.png"): Promise<void> {
        return this.exporter.downloadPNG(fileName);
    }

    /** Serializes the complete graph or the active visible subset as JSON. */
    exportJSON(options: GraphJSONExportOptions = {}): string {
        return this.exporter.exportJSON(options);
    }

    /** Downloads graph data as a JSON file. */
    downloadJSON(
        options: GraphJSONExportOptions & { fileName?: string } = {},
    ): void {
        this.exporter.downloadJSON(options);
    }

    destroy(): void {
        this.runtime.stop();
        this.resizeObserver.disconnect();
        this.mobileControls.dispose();
        this.keyboardNavigation.dispose();
        this.interaction.dispose();
        this.graphCamera.dispose();
        this.views.clear();
        this.physics.dispose();
        this.particles.dispose();
        this.controls.dispose();
        this.renderer.dispose();

        if (this.container.contains(this.renderer.domElement)) {
            this.container.removeChild(this.renderer.domElement);
        }
    }

    private refreshVisibleGraph(): void {
        this.visibleData = this.views.refresh();
    }

    private emitSelection(selection: GraphSelection): void {
        this.options.onSelectionChange?.(selection);
    }
}

/** Creates an OrbitGraph instance inside a container element. */
export function createOrbitGraph(
    container: HTMLElement,
    options?: OrbitGraphOptions,
): OrbitGraph {
    return new OrbitGraph(container, options);
}