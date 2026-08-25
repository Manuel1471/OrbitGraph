import {
    forwardRef,
    useEffect,
    useImperativeHandle,
    useRef,
    type CSSProperties,
    type HTMLAttributes,
} from "react";

import type {
    GraphData,
    GraphAnnotation,
    GraphBookmark,
    GraphAttributeFilter,
    GraphCluster,
    GraphOperation,
    GraphStyleRule,
    GraphYjsProvider,
    GraphYjsCollaboration,
    GraphDiff,
    GraphRoute,
    GraphDiagnostic,
    GraphExpansionOptions,
    GraphInitialView,
    GraphJSONExportOptions,
    GraphLoadingState,
    GraphLayout,
    GraphLayoutOptions,
    GraphNeighborhoodLoadOptions,
    GraphNeighborhoodResult,
    GraphNode,
    GraphSelection,
    OrbitGraphOptions,
    VisibleGraphData,
} from "@orbitgraph/core";

import {
    createOrbitGraph,
    type GraphAnalyticsController,
    type OrbitGraph as OrbitGraphInstance,
    type GraphPresentationController,
    type GraphComputeResult,
} from "@orbitgraph/three";

/**
 * Imperative actions exposed through an `OrbitGraph` React ref.
 *
 * Use this for user-driven actions such as camera movement, expanding a
 * relationship branch, or downloading an export. Keep graph data in the
 * declarative `data` prop.
 */
export type OrbitGraphHandle = {
    /** Moves the camera to include all currently visible nodes. */
    resetCamera(): void;

    /** Focuses the camera and selects a currently visible node. */
    focusNode(nodeId: string): void;

    /** Reveals the selected node's relationship neighborhood. */
    expandNode(nodeId: string, options?: GraphExpansionOptions): void;

    /** Removes an explicit expansion from the current exploration view. */
    collapseNode(nodeId: string): void;

    /** Returns the graph to the configured `initialView`. */
    resetExploration(): void;

    /** Temporarily reveals the complete source graph. */
    showAll(): void;

    /** Changes the initial exploration configuration. */
    setInitialView(view: GraphInitialView): void;

    /** Loads one node through the configured remote data source. */
    loadNode(nodeId: string): Promise<GraphNode | undefined>;

    /** Loads and merges one remote relationship neighborhood page. */
    loadNeighborhood(
        nodeId: string,
        options?: GraphNeighborhoodLoadOptions,
    ): Promise<GraphNeighborhoodResult | null>;

    /** Provides graph metrics for the complete or visible data scope. */
    getAnalytics(): GraphAnalyticsController;

    /** Provides temporary visual styles without mutating source graph data. */
    getPresentation(): GraphPresentationController;

    /** Creates a PNG Blob of the current rendered graph view. */
    exportPNG(): Promise<Blob>;

    /** Downloads the current rendered graph view as a PNG file. */
    downloadPNG(fileName?: string): Promise<void>;

    /** Serializes complete or visible graph data as JSON. */
    exportJSON(options?: GraphJSONExportOptions): string;

    /** Downloads complete or visible graph data as JSON. */
    downloadJSON(
        options?: GraphJSONExportOptions & { fileName?: string },
    ): void;
    exportSVG(): string;
    downloadSVG(fileName?: string): void;
    exportPDF(options?: { title?: string; summary?: string }): Promise<Blob>;
    downloadPDF(fileName?: string, options?: { title?: string; summary?: string }): Promise<void>;
    setLayout(layout: GraphLayout, options?: GraphLayoutOptions): void;
    enableClusterLevelOfDetail(zoomOutDistance?: number): boolean;
    disableClusterLevelOfDetail(): void;
    isClusterLevelOfDetailEnabled(): boolean;
    computeInWorker(layout?: GraphLayout, signal?: AbortSignal): Promise<GraphComputeResult>;
    connectYjs(provider: GraphYjsProvider): GraphYjsCollaboration;

    /** Returns the current lazy-loading operation, when configured. */
    getLoadingState(): GraphLoadingState;

    /** Applies relationship-weight and metadata predicates. */
    setAdvancedFilters(options: { minimumLinkWeight?: number; maximumLinkWeight?: number; attributes?: GraphAttributeFilter[] }): void;
    /** Serializes the current exploration, filters, and layout for a URL. */
    shareView(): string;
    loadSharedView(encodedState: string): void;
    addAnnotation(annotation: GraphAnnotation): void;
    getAnnotations(): GraphAnnotation[];
    saveBookmark(id: string, name: string): GraphBookmark | undefined;
    restoreBookmark(id: string): boolean;
    clusterCommunities(): GraphCluster[];
    collapseCluster(clusterId: string): void;
    expandCluster(clusterId: string): void;
    applyOperations(operations: GraphOperation[]): void;
    undo(): boolean;
    redo(): boolean;
    setStyleRules(rules: GraphStyleRule[]): void;
    selectNodes(nodeIds: Iterable<string>): string[];
    getSelectedNodeIds(): string[];
    clearNodeSelection(): void;
    compare(data: GraphData): GraphDiff;
    findWeightedPath(sourceId: string, targetId: string): GraphRoute | null;
    findKShortestPaths(sourceId: string, targetId: string, count?: number): GraphRoute[];
    setCameraMovementSpeed(speed: number): void;
    getCameraMovementSpeed(): number;
};

export type OrbitGraphProps = Omit<
    HTMLAttributes<HTMLDivElement>,
    "children"
> & {
    /** Complete source data. Replacing it resets exploration to `initialView`. */
    data: GraphData;

    /** Renderer, camera, exploration, mobile, and link-flow configuration. */
    options?: Omit<
        OrbitGraphOptions,
        | "onSelectionChange"
        | "onVisibleDataChange"
        | "onLoadingChange"
        | "onDiagnostic"
        | "onKeyboardFocusChange"
        | "onNodeClick"
        | "onLinkClick"
        | "onNodeHover"
        | "onLinkHover"
    >;
    style?: CSSProperties;

    onSelectionChange?: (selection: GraphSelection) => void;
    onVisibleDataChange?: (data: VisibleGraphData) => void;
    onLoadingChange?: (state: GraphLoadingState) => void;
    onDiagnostic?: (diagnostic: GraphDiagnostic) => void;
    onKeyboardFocusChange?: (node: GraphNode | null) => void;
    onNodeClick?: OrbitGraphOptions["onNodeClick"];
    onLinkClick?: OrbitGraphOptions["onLinkClick"];
    onNodeHover?: OrbitGraphOptions["onNodeHover"];
    onLinkHover?: OrbitGraphOptions["onLinkHover"];
};

/**
 * React wrapper for OrbitGraph's Three.js renderer.
 *
 * Pass a ref when a parent component needs to invoke graph actions. Use props
 * and callbacks for data and UI state that should remain declarative.
 */
export const OrbitGraph = forwardRef<OrbitGraphHandle, OrbitGraphProps>(
    function OrbitGraph(
        {
            data,
            options,
            onSelectionChange,
            onVisibleDataChange,
            onLoadingChange,
            onDiagnostic,
            onKeyboardFocusChange,
            onNodeClick,
            onLinkClick,
            onNodeHover,
            onLinkHover,
            style,
            ...divProps
        },
        ref,
    ) {
        const containerRef = useRef<HTMLDivElement>(null);
        const graphRef = useRef<OrbitGraphInstance | null>(null);

        const callbacksRef = useRef({
            onSelectionChange,
            onVisibleDataChange,
            onLoadingChange,
            onDiagnostic,
            onKeyboardFocusChange,
            onNodeClick,
            onLinkClick,
            onNodeHover,
            onLinkHover,
        });

        callbacksRef.current = {
            onSelectionChange,
            onVisibleDataChange,
            onLoadingChange,
            onDiagnostic,
            onKeyboardFocusChange,
            onNodeClick,
            onLinkClick,
            onNodeHover,
            onLinkHover,
        };

        useImperativeHandle(
            ref,
            (): OrbitGraphHandle => ({
                resetCamera: () => graphRef.current?.resetCamera(),
                focusNode: (nodeId) => graphRef.current?.focusNode(nodeId),
                expandNode: (nodeId, expansionOptions) => {
                    graphRef.current?.expandNode(nodeId, expansionOptions);
                },
                collapseNode: (nodeId) => {
                    graphRef.current?.collapseNode(nodeId);
                },
                resetExploration: () => graphRef.current?.resetExploration(),
                showAll: () => graphRef.current?.showAll(),
                setInitialView: (view) => {
                    graphRef.current?.setInitialView(view);
                },
                loadNode: (nodeId) => {
                    if (!graphRef.current) {
                        return Promise.reject(
                            new Error("OrbitGraph is not mounted."),
                        );
                    }

                    return graphRef.current.loadNode(nodeId);
                },
                loadNeighborhood: (nodeId, loadOptions) => {
                    if (!graphRef.current) {
                        return Promise.reject(
                            new Error("OrbitGraph is not mounted."),
                        );
                    }

                    return graphRef.current.loadNeighborhood(
                        nodeId,
                        loadOptions,
                    );
                },
                getAnalytics: () => {
                    if (!graphRef.current) {
                        throw new Error("OrbitGraph is not mounted.");
                    }

                    return graphRef.current.analytics;
                },
                getPresentation: () => {
                    if (!graphRef.current) {
                        throw new Error("OrbitGraph is not mounted.");
                    }

                    return graphRef.current.presentation;
                },
                exportPNG: () => {
                    if (!graphRef.current) {
                        return Promise.reject(
                            new Error("OrbitGraph is not mounted."),
                        );
                    }

                    return graphRef.current.exportPNG();
                },
                downloadPNG: (fileName) => {
                    if (!graphRef.current) {
                        return Promise.reject(
                            new Error("OrbitGraph is not mounted."),
                        );
                    }

                    return graphRef.current.downloadPNG(fileName);
                },
                exportJSON: (exportOptions) => {
                    if (!graphRef.current) {
                        throw new Error("OrbitGraph is not mounted.");
                    }

                    return graphRef.current.exportJSON(exportOptions);
                },
                downloadJSON: (exportOptions) => {
                    graphRef.current?.downloadJSON(exportOptions);
                },
                exportSVG: () => graphRef.current?.exportSVG() ?? "",
                downloadSVG: (fileName) => graphRef.current?.downloadSVG(fileName),
                exportPDF: (options) => Promise.resolve(graphRef.current?.exportPDF(options) ?? new Blob()),
                downloadPDF: (fileName, options) => Promise.resolve(graphRef.current?.downloadPDF(fileName, options)),
                setLayout: (nextLayout, layoutOptions) => graphRef.current?.setLayout(nextLayout, layoutOptions),
                enableClusterLevelOfDetail: (distance) => graphRef.current?.enableClusterLevelOfDetail(distance) ?? false,
                disableClusterLevelOfDetail: () => graphRef.current?.disableClusterLevelOfDetail(),
                isClusterLevelOfDetailEnabled: () => graphRef.current?.isClusterLevelOfDetailEnabled() ?? false,
                computeInWorker: (nextLayout, signal) => {
                    if (!graphRef.current) return Promise.reject(new Error("OrbitGraph is not mounted."));
                    return graphRef.current.computeInWorker(nextLayout, signal);
                },
                connectYjs: (provider) => {
                    if (!graphRef.current) throw new Error("OrbitGraph is not mounted.");
                    return graphRef.current.connectYjs(provider);
                },
                getLoadingState: () => {
                    return graphRef.current?.getLoadingState() ?? {
                        loading: false,
                        operation: null,
                        nodeId: null,
                        error: null,
                    };
                },
                setAdvancedFilters: (filterOptions) => graphRef.current?.setAdvancedFilters(filterOptions),
                shareView: () => graphRef.current?.shareView() ?? "",
                loadSharedView: (encodedState) => graphRef.current?.loadSharedView(encodedState),
                addAnnotation: (annotation) => graphRef.current?.addAnnotation(annotation),
                getAnnotations: () => graphRef.current?.getAnnotations() ?? [],
                saveBookmark: (id, name) => graphRef.current?.saveBookmark(id, name),
                restoreBookmark: (id) => graphRef.current?.restoreBookmark(id) ?? false,
                clusterCommunities: () => graphRef.current?.clusterCommunities() ?? [],
                collapseCluster: (id) => graphRef.current?.collapseCluster(id),
                expandCluster: (id) => graphRef.current?.expandCluster(id),
                applyOperations: (operations) => graphRef.current?.applyOperations(operations),
                undo: () => graphRef.current?.undo() ?? false,
                redo: () => graphRef.current?.redo() ?? false,
                setStyleRules: (rules) => graphRef.current?.setStyleRules(rules),
                selectNodes: (ids) => graphRef.current?.selectNodes(ids) ?? [],
                getSelectedNodeIds: () => graphRef.current?.getSelectedNodeIds() ?? [],
                clearNodeSelection: () => graphRef.current?.clearNodeSelection(),
                compare: (data) => graphRef.current?.compare(data) ?? { nodes: { added: [], removed: [], changed: [] }, links: { added: [], removed: [], changed: [] } },
                findWeightedPath: (source, target) => graphRef.current?.findWeightedPath(source, target) ?? null,
                findKShortestPaths: (source, target, count) => graphRef.current?.findKShortestPaths(source, target, count) ?? [],
                setCameraMovementSpeed: (speed) => graphRef.current?.setCameraMovementSpeed(speed),
                getCameraMovementSpeed: () => graphRef.current?.getCameraMovementSpeed() ?? 18,
            }),
            [],
        );

        useEffect(() => {
            const container = containerRef.current;

            if (!container) {
                return;
            }

            const graph = createOrbitGraph(container, {
                ...options,
                onSelectionChange: (selection) => {
                    callbacksRef.current.onSelectionChange?.(selection);
                },
                onVisibleDataChange: (visibleData) => {
                    callbacksRef.current.onVisibleDataChange?.(visibleData);
                },
                onLoadingChange: (state) => {
                    callbacksRef.current.onLoadingChange?.(state);
                },
                onDiagnostic: (diagnostic) => {
                    callbacksRef.current.onDiagnostic?.(diagnostic);
                },
                onKeyboardFocusChange: (node) => {
                    callbacksRef.current.onKeyboardFocusChange?.(node);
                },
                onNodeClick: (event) => {
                    callbacksRef.current.onNodeClick?.(event);
                },
                onLinkClick: (event) => {
                    callbacksRef.current.onLinkClick?.(event);
                },
                onNodeHover: (event) => {
                    callbacksRef.current.onNodeHover?.(event);
                },
                onLinkHover: (event) => {
                    callbacksRef.current.onLinkHover?.(event);
                },
            });

            graphRef.current = graph;
            graph.setData(data);

            return () => {
                graph.destroy();
                graphRef.current = null;
            };
            // The graph instance must persist while React props update.
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, []);

        useEffect(() => {
            graphRef.current?.setData(data);
        }, [data]);

        return (
            <div
                ref={containerRef}
                style={{
                    width: "100%",
                    height: "100%",
                    ...style,
                }}
                {...divProps}
            />
        );
    },
);
