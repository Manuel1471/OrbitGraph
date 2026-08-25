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
    GraphDiff,
    GraphOperation,
    GraphStyleRule,
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
import { aggregateClusters, GraphCollaborationStore, GraphYjsCollaboration, diffGraphs, findKShortestPaths, findWeightedPath, validateGraphOperations, type GraphYjsProvider } from "@orbitgraph/core";
import { GraphHistory } from "./GraphHistory";

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
import { CanvasGraphRenderer } from "./CanvasGraphRenderer";
import { GraphComputePipeline, type GraphComputeResult } from "./GraphComputePipeline";
import type {
    GraphLinkArrowMap,
    GraphLinkLineMap,
    GraphNodeMap,
    GraphNodeMeshMap,
} from "./graph-types";

const LARGE_GRAPH_LOD_THRESHOLD = 5_000;

/**
 * Public OrbitGraph facade. It coordinates data, exploration, interaction,
 * rendering, and physics without owning their implementation details.
 */
export class OrbitGraph {
    private readonly scene = new THREE.Scene();
    private readonly group = new THREE.Group();
    private readonly camera: THREE.PerspectiveCamera;
    private readonly renderer: THREE.WebGLRenderer | null;
    private readonly renderElement: HTMLCanvasElement;
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
    private readonly history = new GraphHistory();
    private styleRules: GraphStyleRule[] = [];
    private multiSelection = new Set<string>();
    private disconnectStream: (() => void) | null = null;
    private readonly computePipeline = new GraphComputePipeline();
    private readonly yjsSessions = new Set<GraphYjsCollaboration>();

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
    private readonly canvasFallback: CanvasGraphRenderer | null;

    private layout: GraphLayout;
    private layoutOptions: GraphLayoutOptions;
    private visibleData: VisibleGraphData = { nodes: [], links: [] };
    private clusters: GraphCluster[] = [];
    private autoFitTimers: number[] = [];
    private clusterLodEnabled = false;
    private clusterLodCollapsed = false;
    private clusterLodDistance = 0;
    private clusterLodActiveClusterId: string | null = null;
    private suppressAutoFitOnce = false;
    private removeClusterLodListener: (() => void) | null = null;

    constructor(
        private readonly container: HTMLElement,
        private readonly options: OrbitGraphOptions = {},
    ) {

        for (const [name, value] of Object.entries(options.theme?.variables ?? {})) {
            this.container.style.setProperty(`--orbitgraph-${name}`, value);
        }

        const width = container.clientWidth || window.innerWidth;
        const height = container.clientHeight || window.innerHeight;

        this.explorer = new GraphExplorer(options.initialView);
        this.physics = new PhysicsEngine(options.physics);
        this.layout = options.layout ?? "force";
        this.layoutOptions = options.layoutOptions ?? {};

        this.scene.background = new THREE.Color(
            options.theme?.backgroundColor ?? options.backgroundColor ?? "#050816",
        );

        // The far plane must accommodate auto-framed large graph layouts.
        this.camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 200_000);
        this.camera.position.set(0, 0, 90);

        if (options.renderMode === "canvas") {
            const canvas = document.createElement("canvas");
            canvas.width = width * Math.min(window.devicePixelRatio, 2);
            canvas.height = height * Math.min(window.devicePixelRatio, 2);
            canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;z-index:1;touch-action:none";
            container.style.position ||= "relative";
            container.appendChild(canvas);
            this.canvasFallback = new CanvasGraphRenderer(canvas);
            this.renderer = null;
            this.renderElement = canvas;
        } else {
            this.canvasFallback = null;
            this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
            this.renderer.setSize(width, height);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            container.appendChild(this.renderer.domElement);
            this.renderElement = this.renderer.domElement;
        }

        this.controls = new OrbitControls(
            this.camera,
            this.renderElement,
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
                nodeColor: options.theme?.nodeColor ?? options.nodeColor ?? "#22d3ee",
                nodeSize: options.nodeSize ?? 0.65,
                linkColor: options.theme?.linkColor ?? options.linkColor ?? "#6366f1",
                linkOpacity: options.linkOpacity ?? 0.55,
            },
        );

        this.presentation = new GraphPresentationController(
            this.graphRenderer,
        );

        this.graphCamera = new GraphCamera(
            this.camera,
            this.controls,
            this.renderElement,
            options.camera,
        );
        this.removeClusterLodListener = this.graphCamera.onChange?.(() => {
            this.graphRenderer.updateFrustumCulling?.(this.camera);
            this.updateClusterLevelOfDetail();
        }) ?? null;
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
                    this.canvasFallback?.render(nodes, links.map((item) => item.graphLink));
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
            () => this.canvasFallback?.render(this.views.getPhysicsNodes(), this.visibleData.links),
        );

        this.exporter = new GraphExporter({
            canvas: this.renderElement,
            render: () => this.renderer ? this.renderer.render(this.scene, this.camera) : this.canvasFallback?.render(this.views.getPhysicsNodes(), this.visibleData.links),
            getData: () => this.dataStore.getData(),
            getVisibleData: () => this.visibleData,
            getNodePositions: () => [...this.views.getPhysicsNodes()],
        });

        this.interaction = new GraphInteraction(
            this.renderElement,
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
            (hit) => this.graphRenderer.resolveNodeHit(hit),
        );

        this.keyboardNavigation = new GraphKeyboardNavigation(
            this.renderElement,
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
            this.canvasFallback?.resize(this.container.clientWidth, this.container.clientHeight, Math.min(window.devicePixelRatio, 2));
        });
        this.resizeObserver.observe(container);
        this.runtime.start();
        this.disconnectStream = options.stream?.connect((message) => this.applyOperations(message.operations)) ?? null;
    }

    /** Replaces all graph data and returns exploration to its initial view. */
    setData(data: GraphData): void {
        this.presentation.clearNodeStyles();
        this.labels.setSelectedNode(null);
        this.dataStore.setData(data);
        this.history.push(data);
        this.explorer.setData(this.dataStore.getData());
        this.explorer.reset();
        this.lazyLoader.resetCache();
        this.graphRenderer.setKeyboardFocus(null);
        this.prepareLargeGraphLod(data);
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
        this.fitVisibleGraph();
    }

    /** Runs transferable layout and clustering preparation outside the UI thread. */
    computeInWorker(layout: GraphLayout = this.layout, signal?: AbortSignal): Promise<GraphComputeResult> {
        return this.computePipeline.compute(this.dataStore.getData(), layout, signal);
    }

    /** Connects graph operations and user awareness through a Yjs CRDT provider. */
    connectYjs(provider: GraphYjsProvider): GraphYjsCollaboration {
        const session = new GraphYjsCollaboration((operations) => this.applyOperations(operations), provider);
        this.yjsSessions.add(session);
        return session;
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
        this.history.push(this.dataStore.getData());
    }

    removeNode(nodeId: string): void {
        this.dataStore.removeNode(nodeId);
        this.explorer.setData(this.dataStore.getData());
        this.refreshVisibleGraph();
        this.history.push(this.dataStore.getData());
    }

    addLink(link: GraphLink): void {
        this.dataStore.addLink(link);
        this.explorer.setData(this.dataStore.getData());
        this.refreshVisibleGraph();
        this.history.push(this.dataStore.getData());
    }

    removeLink(linkId: string): void {
        this.dataStore.removeLink(linkId);
        this.explorer.setData(this.dataStore.getData());
        this.refreshVisibleGraph();
        this.history.push(this.dataStore.getData());
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
        const communities = result.communities.length > 1
            ? result.communities
            : [...this.visibleData.nodes.reduce((groups, node) => {
                const key = node.type ?? "untyped";
                const group = groups.get(key) ?? [];
                group.push(node.id); groups.set(key, group); return groups;
            }, new Map<string, string[]>())].map(([id, nodeIds]) => ({ id: `type:${id}`, nodeIds, size: nodeIds.length }));
        this.clusters = communities.map((community, index) => ({
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

    /** Replaces a community's members with an aggregate node and consolidated links. */
    collapseCluster(clusterId: string): void { this.setClusterCollapsed(clusterId, true); }
    expandCluster(clusterId: string): void { this.setClusterCollapsed(clusterId, false); }

    /** Zoom out for aggregate community nodes and bundled inter-community links; zoom in for full detail. */
    enableClusterLevelOfDetail(zoomOutDistance?: number): boolean {
        if (this.clusters.length === 0) this.clusterCommunities();
        if (this.clusters.length < 2) return false;
        this.clusterLodEnabled = true;
        // Start large full-graph views at the aggregate level immediately;
        // users reveal detail by zooming in past the hysteresis threshold.
        this.clusterLodDistance = zoomOutDistance ?? Math.min(
            this.getVisibleGraphDiameter() * 1.15,
            this.graphCamera.getDistance() * 0.9,
        );
        this.updateClusterLevelOfDetail();
        return true;
    }

    disableClusterLevelOfDetail(): void {
        this.clusterLodEnabled = false;
        this.clusterLodCollapsed = false;
        this.clusterLodActiveClusterId = null;
        if (!this.clusters.some((cluster) => cluster.collapsed)) return;
        this.clusters.forEach((cluster) => { cluster.collapsed = false; });
        this.suppressAutoFitOnce = true;
        this.refreshVisibleGraph();
    }

    isClusterLevelOfDetailEnabled(): boolean { return this.clusterLodEnabled; }

    clearFilters(): void {
        this.filter.clear();
        this.refreshVisibleGraph();
    }

    resetCamera(): void {
        this.graphCamera.reset([...this.views.getPhysicsNodes()]);
        this.labels.hide();
        this.emitSelection(null);
    }

    /** Changes the WASD/QE camera movement speed without recreating the graph. */
    setCameraMovementSpeed(speed: number): void { this.graphCamera.setMovementSpeed(speed); }
    getCameraMovementSpeed(): number { return this.graphCamera.getMovementSpeed(); }

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
    exportSVG(): string { return this.exporter.exportSVG(); }
    downloadSVG(fileName?: string): void { this.exporter.downloadSVG(fileName); }
    exportPDF(options?: { title?: string; summary?: string }): Promise<Blob> { return this.exporter.exportPDF(options); }
    downloadPDF(fileName?: string, options?: { title?: string; summary?: string }): Promise<void> { return this.exporter.downloadPDF(fileName, options); }

    /** Applies edit operations and leaves persistence to the host callback/stream. */
    applyOperations(operations: GraphOperation[]): void {
        const validation = validateGraphOperations(this.dataStore.getData(), operations);
        if (!validation.valid) throw new Error(validation.errors.join(" "));
        for (const operation of operations) {
            if (operation.type === "add-node") this.dataStore.addNode(operation.node);
            else if (operation.type === "remove-node") this.dataStore.removeNode(operation.nodeId);
            else if (operation.type === "add-link") this.dataStore.addLink(operation.link);
            else if (operation.type === "remove-link") this.dataStore.removeLink(operation.linkId);
            else if (operation.type === "update-node") this.dataStore.updateNode(operation.nodeId, operation.patch);
            else this.dataStore.updateLink(operation.linkId, operation.patch);
        }
        this.explorer.setData(this.dataStore.getData()); this.history.push(this.dataStore.getData()); this.refreshVisibleGraph();
    }
    undo(): boolean { const data = this.history.undo(); if (!data) return false; this.dataStore.setData(data); this.explorer.setData(data); this.refreshVisibleGraph(); return true; }
    redo(): boolean { const data = this.history.redo(); if (!data) return false; this.dataStore.setData(data); this.explorer.setData(data); this.refreshVisibleGraph(); return true; }
    compare(data: GraphData): GraphDiff { return diffGraphs(this.dataStore.getData(), data); }
    findWeightedPath(sourceId: string, targetId: string) { return findWeightedPath(this.visibleData, sourceId, targetId); }
    findKShortestPaths(sourceId: string, targetId: string, count?: number) { return findKShortestPaths(this.visibleData, sourceId, targetId, count); }
    selectNodes(nodeIds: Iterable<string>): string[] { this.multiSelection = new Set([...nodeIds].filter((id) => this.visibleData.nodes.some((node) => node.id === id))); return this.getSelectedNodeIds(); }
    getSelectedNodeIds(): string[] { return [...this.multiSelection]; }
    clearNodeSelection(): void { this.multiSelection.clear(); }
    setStyleRules(rules: GraphStyleRule[]): void { this.styleRules = rules; this.applyStyleRules(); }
    addStyleRule(rule: GraphStyleRule): void { this.setStyleRules([...this.styleRules.filter((item) => item.id !== rule.id), rule]); }

    destroy(): void {
        this.disconnectStream?.();
        this.computePipeline.dispose();
        this.yjsSessions.forEach((session) => session.destroy());
        this.yjsSessions.clear();
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
        this.renderer?.dispose();
        // Repeated benchmark scenarios otherwise leave WebGL contexts queued
        // for browser garbage collection and can exhaust the per-process limit.
        (this.renderer as (THREE.WebGLRenderer & { forceContextLoss?: () => void }) | null)?.forceContextLoss?.();

        this.canvasFallback?.canvas.remove();
        this.removeClusterLodListener?.();
        this.autoFitTimers.forEach((timer) => window.clearTimeout(timer));
        this.autoFitTimers = [];

        if (this.container.contains(this.renderElement)) {
            this.container.removeChild(this.renderElement);
        }
    }

    private refreshVisibleGraph(): void {
        const explored = this.explorer.getVisibleData();
        const filtered = this.filter.getVisibleData(explored);
        const hasCollapsedClusters = this.clusters.some((cluster) => cluster.collapsed);
        this.visibleData = this.views.refresh(hasCollapsedClusters ? aggregateClusters(filtered, this.clusters) : filtered);
        this.runtime.setVisibleCounts(this.visibleData.nodes.length, this.visibleData.links.length);
        this.ui.setSemanticNodes(this.visibleData.nodes);
        if (this.options.performance?.levelOfDetail !== false && this.visibleData.nodes.length > 1_000) {
            this.labels.setOptions({ ...(this.options.labels ?? {}), maxVisible: Math.min(this.options.labels?.maxVisible ?? 80, 20) });
        }
        this.applyStyleRules();
        this.graphRenderer.updateFrustumCulling?.(this.camera);
        if (this.suppressAutoFitOnce) this.suppressAutoFitOnce = false;
        else this.fitVisibleGraph();
    }

    /** Frames every newly visible graph state, including large deterministic layouts. */
    private fitVisibleGraph(): void {
        const nodes = this.views.getPhysicsNodes();
        if (nodes.length === 0) return;

        this.autoFitTimers.forEach((timer) => window.clearTimeout(timer));
        this.autoFitTimers = [];
        this.graphCamera.reset([...nodes]);

    }

    private updateClusterLevelOfDetail(): void {
        if (!this.clusterLodEnabled || this.clusterLodDistance <= 0 || this.clusters.length < 2) return;
        const distance = this.graphCamera.getDistance();
        const shouldCollapse = this.clusterLodCollapsed
            ? distance > this.clusterLodDistance * 0.68
            : distance >= this.clusterLodDistance;
        const activeClusterId = shouldCollapse ? null : this.findClosestClusterToCameraTarget();
        if (shouldCollapse === this.clusterLodCollapsed && activeClusterId === this.clusterLodActiveClusterId) return;
        this.clusterLodCollapsed = shouldCollapse;
        this.clusterLodActiveClusterId = activeClusterId;
        // At detail level materialize only the cluster nearest the camera target.
        // This prevents a single zoom gesture from creating tens of thousands of meshes.
        this.clusters.forEach((cluster) => { cluster.collapsed = shouldCollapse || cluster.id !== activeClusterId; });
        this.suppressAutoFitOnce = true;
        this.refreshVisibleGraph();
    }

    private findClosestClusterToCameraTarget(): string | null {
        const target = this.graphCamera.getTarget();
        let closest: string | null = null, closestDistance = Number.POSITIVE_INFINITY;
        for (const cluster of this.clusters) {
            const node = this.nodes.get(`cluster:${cluster.id}`);
            if (!node) continue;
            const dx = node.x - target.x, dy = node.y - target.y, dz = node.z - target.z;
            const distance = dx * dx + dy * dy + dz * dz;
            if (distance < closestDistance) { closestDistance = distance; closest = cluster.id; }
        }
        return closest ?? this.clusters[0]?.id ?? null;
    }

    private getVisibleGraphDiameter(): number {
        const activeNodes = this.views.getPhysicsNodes();
        if (activeNodes.length < 2) return 120;
        const bounds = new THREE.Box3();
        activeNodes.forEach((node) => bounds.expandByPoint(new THREE.Vector3(node.x, node.y, node.z)));
        return Math.max(80, bounds.getSize(new THREE.Vector3()).length());
    }

    /** Large initial views should be legible before users discover the LOD control. */
    private prepareLargeGraphLod(data: GraphData): void {
        this.clusters = [];
        this.clusterLodEnabled = false;
        this.clusterLodCollapsed = false;
        this.clusterLodActiveClusterId = null;
        if (this.options.performance?.levelOfDetail === false || data.nodes.length < LARGE_GRAPH_LOD_THRESHOLD) return;
        let byType = this.createTypeClusters(data);
        // Massive untyped/single-type graphs still need a safe aggregate view.
        // Deterministic segments avoid running community detection on the main thread.
        if (byType.length < 2) byType = this.createSegmentClusters(data);
        if (byType.length < 2) return;
        this.clusters = byType.map((cluster) => ({ ...cluster, collapsed: true }));
        this.clusterLodEnabled = true;
        this.clusterLodCollapsed = true;
        // The full graph has not been mounted, so use a stable semantic-zoom
        // threshold instead of deriving it from temporary node positions.
        this.clusterLodDistance = 90;
    }

    /** Grouping by a declared type is O(n), unlike community detection on a 50K graph. */
    private createTypeClusters(data: GraphData = this.visibleData): GraphCluster[] {
        const groups = new Map<string, string[]>();
        for (const node of data.nodes) {
            const key = node.type ?? "untyped";
            const group = groups.get(key) ?? []; group.push(node.id); groups.set(key, group);
        }
        const clusters: GraphCluster[] = [];
        for (const [type, nodeIds] of groups) {
            for (let offset = 0; offset < nodeIds.length; offset += 1_000) {
                const segment = Math.floor(offset / 1_000);
                clusters.push({
                    id: `type:${type}:${segment}`,
                    label: nodeIds.length > 1_000 ? `${type} ${segment + 1}` : (type === "untyped" ? "Untyped" : type),
                    nodeIds: nodeIds.slice(offset, offset + 1_000), linkIds: [], collapsed: false,
                });
            }
        }
        this.populateClusterLinkIds(data, clusters);
        return clusters;
    }

    private createSegmentClusters(data: GraphData): GraphCluster[] {
        const segmentSize = 1_000;
        const clusters: GraphCluster[] = [];
        for (let index = 0; index < data.nodes.length; index += segmentSize) {
            const segment = Math.floor(index / segmentSize);
            clusters.push({ id: `segment:${segment}`, label: `Segment ${segment + 1}`, nodeIds: data.nodes.slice(index, index + segmentSize).map((node) => node.id), linkIds: [], collapsed: false });
        }
        this.populateClusterLinkIds(data, clusters);
        return clusters;
    }

    private populateClusterLinkIds(data: GraphData, clusters: GraphCluster[]): void {
        const membership = new Map<string, GraphCluster>();
        for (const cluster of clusters) for (const nodeId of cluster.nodeIds) membership.set(nodeId, cluster);
        for (const link of data.links) {
            const source = membership.get(link.source), target = membership.get(link.target);
            if (source && source === target && link.id) source.linkIds.push(link.id);
        }
    }

    private applyStyleRules(): void {
        if (!this.styleRules.length) return;
        const degree = this.analytics.degree({ scope: "visible" }); const pageRank = this.analytics.pageRank({ scope: "visible" }).scores;
        const styles: Record<string, { color?: string; scale?: number; glow?: number }> = {}; const hidden: string[] = [];
        for (const node of this.visibleData.nodes) for (const rule of this.styleRules) { const matches = (!rule.when.type || node.type === rule.when.type) && (!rule.when.minDegree || (degree[node.id]?.degree ?? 0) >= rule.when.minDegree) && (!rule.when.minPageRank || (pageRank[node.id] ?? 0) >= rule.when.minPageRank); if (matches) { if (rule.style.hidden) hidden.push(node.id); else styles[node.id] = { ...styles[node.id], ...rule.style }; } }
        this.filter.setHiddenNodeIds(hidden); this.presentation.setNodeStyles(styles);
    }

    private setClusterCollapsed(clusterId: string, collapsed: boolean): void {
        const cluster = this.clusters.find((item) => item.id === clusterId);
        if (!cluster) return;
        cluster.collapsed = collapsed;
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
