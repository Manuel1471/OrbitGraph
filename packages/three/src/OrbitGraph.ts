import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import type {
    GraphData,
    GraphDataSource,
    GraphExpansionOptions,
    GraphAttributeFilter,
    GraphAnnotation,
    GraphBookmark,
    GraphCluster,
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
import { GraphCollaborationStore } from "@orbitgraph/core";

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
import { GraphMiniMap } from "./GraphMiniMap";
import { NodeLabelRenderer } from "./NodeLabelRenderer";
import { PhysicsEngine } from "./PhysicsEngine";
import { GraphAnalyticsController } from "./GraphAnalyticsController";
import { GraphPresentationController } from "./GraphPresentationController";
import { GraphUIController } from "./GraphUIController";
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
    public readonly presentation: GraphPresentationController;
    /** Serializable annotations and named view bookmarks; persistence is owned by the host app. */
    public readonly collaboration = new GraphCollaborationStore();

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
    private readonly miniMap: GraphMiniMap;
    private readonly ui: GraphUIController;

    private layout: GraphLayout;
    private layoutOptions: GraphLayoutOptions;
    private visibleData: VisibleGraphData = { nodes: [], links: [] };
    private clusters: GraphCluster[] = [];

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

        this.presentation = new GraphPresentationController(
            this.graphRenderer,
        );

        this.graphCamera = new GraphCamera(
            this.camera,
            this.controls,
            this.renderer.domElement,
            options.camera,
        );
        this.labels = new NodeLabelRenderer(this.scene, this.nodes);
        this.labels.setOptions(options.labels);
        this.particles = new LinkParticleRenderer(
            this.scene,
            this.nodes,
            options.linkFlow,
        );
        this.miniMap = new GraphMiniMap(
            this.container,
            this.graphCamera,
            options.miniMap,
        );
        this.ui = new GraphUIController(this.container, options.ui, options.accessibility?.semanticView);

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
                onGraphPositionChange: (nodes, links) => {
                    this.miniMap.update(nodes, links);
                },
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
                onDiagnostic: options.onDiagnostic,
            },
        );

        this.runtime = new GraphRuntime(
            this.renderer,
            this.scene,
            this.camera,
            this.graphCamera,
            this.particles,
            options.performance,
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
                    } else {
                        this.labels.hide();
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
        this.presentation.clearNodeStyles();
        this.labels.setSelectedNode(null);
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

    /** Applies inclusive relationship-weight and metadata predicates together. */
    setAdvancedFilters(options: { minimumLinkWeight?: number; maximumLinkWeight?: number; attributes?: GraphAttributeFilter[] }): void {
        this.filter.setLinkWeightRange(options.minimumLinkWeight, options.maximumLinkWeight);
        this.filter.setAttributeFilters(options.attributes ?? []);
        this.refreshVisibleGraph();
    }

    /** Encodes the current serializable view state for URLs, bookmarks, or collaboration. */
    shareView(): string {
        return encodeURIComponent(JSON.stringify(this.exportViewState()));
    }

    /** Restores a state generated by `shareView`. */
    loadSharedView(encodedState: string): void {
        this.importViewState(JSON.parse(decodeURIComponent(encodedState)) as OrbitGraphViewState);
    }

    addAnnotation(annotation: GraphAnnotation): void { this.collaboration.upsertAnnotation(annotation); }
    removeAnnotation(id: string): void { this.collaboration.removeAnnotation(id); }
    getAnnotations(): GraphAnnotation[] { return this.collaboration.getAnnotations(); }
    saveBookmark(id: string, name: string): GraphBookmark { return this.collaboration.createBookmark(id, name, this.exportViewState()); }
    getBookmarks(): GraphBookmark[] { return this.collaboration.getBookmarks(); }
    restoreBookmark(id: string): boolean {
        const bookmark = this.collaboration.getBookmarks().find((item) => item.id === id);
        if (!bookmark) return false;
        this.importViewState(bookmark.view);
        return true;
    }

    /** Detects communities, colors them consistently, and exposes collapsible cluster state. */
    clusterCommunities(): GraphCluster[] {
        const result = this.analytics.detectCommunities({ scope: "visible" });
        const palette = ["#22d3ee", "#a78bfa", "#f59e0b", "#34d399", "#fb7185", "#60a5fa"];
        this.clusters = result.communities.map((community, index) => ({
            id: community.id,
            label: `Community ${index + 1}`,
            nodeIds: community.nodeIds,
            linkIds: this.getClusterLinkIds(community.nodeIds),
            collapsed: false,
        }));
        this.presentation.setNodeStyles(Object.fromEntries(this.clusters.flatMap((cluster, index) => cluster.nodeIds.map((nodeId) => [nodeId, { color: palette[index % palette.length], glow: 0.55 }]))));
        return this.getClusters();
    }

    getClusters(): GraphCluster[] { return this.clusters.map((cluster) => ({ ...cluster, nodeIds: [...cluster.nodeIds], linkIds: [...cluster.linkIds] })); }

    /** Hides a community's members until `expandCluster` restores them. */
    collapseCluster(clusterId: string): void { this.setClusterCollapsed(clusterId, true); }
    expandCluster(clusterId: string): void { this.setClusterCollapsed(clusterId, false); }

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
        this.miniMap.dispose();
        this.ui.dispose();
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
        this.runtime.setVisibleCounts(this.visibleData.nodes.length, this.visibleData.links.length);
        this.ui.setSemanticNodes(this.visibleData.nodes);
        if (this.options.performance?.levelOfDetail !== false && this.visibleData.nodes.length > 1_000) {
            this.labels.setOptions({ ...(this.options.labels ?? {}), maxVisible: Math.min(this.options.labels?.maxVisible ?? 80, 20) });
        }
    }

    private setClusterCollapsed(clusterId: string, collapsed: boolean): void {
        const cluster = this.clusters.find((item) => item.id === clusterId);
        if (!cluster) return;
        cluster.collapsed = collapsed;
        this.filter.setHiddenNodeIds(this.clusters.filter((item) => item.collapsed).flatMap((item) => item.nodeIds));
        this.refreshVisibleGraph();
    }

    /** Uses a Set so grouping remains linear even for communities with thousands of nodes. */
    private getClusterLinkIds(nodeIds: string[]): string[] {
        const members = new Set(nodeIds);
        return this.visibleData.links
            .filter((link) => members.has(link.source) && members.has(link.target))
            .map((link) => link.id ?? `${link.source}__${link.target}`);
    }

    private emitSelection(selection: GraphSelection): void {
        this.labels.setSelectedNode(
            selection?.kind === "node" ? selection.node : null,
        );
        this.options.onSelectionChange?.(selection);
        this.ui.update(selection);
    }
}

/** Creates an OrbitGraph instance inside a container element. */
export function createOrbitGraph(
    container: HTMLElement,
    options?: OrbitGraphOptions,
): OrbitGraph {
    return new OrbitGraph(container, options);
}
