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
    GraphExpansionOptions,
    GraphInitialView,
    GraphJSONExportOptions,
    GraphLoadingState,
    GraphNode,
    GraphSelection,
    OrbitGraphOptions,
    VisibleGraphData,
} from "@orbitgraph/core";

import {
    createOrbitGraph,
    type OrbitGraph as OrbitGraphInstance,
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

    /** Returns the current lazy-loading operation, when configured. */
    getLoadingState(): GraphLoadingState;
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
        | "onNodeClick"
        | "onLinkClick"
        | "onNodeHover"
        | "onLinkHover"
        | "onVisibleDataChange"
        | "onLoadingChange"
        | "onKeyboardFocusChange"
    >;
    style?: CSSProperties;

    onSelectionChange?: (selection: GraphSelection) => void;
    onVisibleDataChange?: (data: VisibleGraphData) => void;
    onLoadingChange?: (state: GraphLoadingState) => void;
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
                collapseNode: (nodeId) => graphRef.current?.collapseNode(nodeId),
                resetExploration: () => graphRef.current?.resetExploration(),
                showAll: () => graphRef.current?.showAll(),
                setInitialView: (view) => graphRef.current?.setInitialView(view),
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
                getLoadingState: () => {
                    return graphRef.current?.getLoadingState() ?? {
                        loading: false,
                        operation: null,
                        nodeId: null,
                        error: null
                    };
                },
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