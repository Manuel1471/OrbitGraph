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
    GraphLoadingState,
    GraphSelection,
    OrbitGraphOptions,
    VisibleGraphData,
} from "@orbitgraph/core";

import {
    createOrbitGraph,
    type OrbitGraph as OrbitGraphInstance,
} from "@orbitgraph/three";

/**
 * Imperative access to the underlying `@orbitgraph/three` instance.
 *
 * The returned instance exposes methods such as `expandNode`, `setLayout`,
 * `loadNeighborhood`, `exportViewState`, and `destroy`.
 */
export type OrbitGraphHandle = {
    getInstance(): OrbitGraphInstance | null;
};

export type OrbitGraphProps = Omit<
    HTMLAttributes<HTMLDivElement>,
    "children"
> & {
    /** Complete data currently known by the application. */
    data: GraphData;

    /** Renderer options that do not use a React callback prop. */
    options?: Omit<
        OrbitGraphOptions,
        | "onSelectionChange"
        | "onNodeClick"
        | "onLinkClick"
        | "onNodeHover"
        | "onLinkHover"
        | "onVisibleDataChange"
        | "onLoadingChange"
    >;

    style?: CSSProperties;

    /** Called after the underlying Three.js graph is created and receives data. */
    onReady?: (graph: OrbitGraphInstance) => void;
    onSelectionChange?: (selection: GraphSelection) => void;
    onVisibleDataChange?: (data: VisibleGraphData) => void;
    onLoadingChange?: (state: GraphLoadingState) => void;
    onNodeClick?: OrbitGraphOptions["onNodeClick"];
    onLinkClick?: OrbitGraphOptions["onLinkClick"];
    onNodeHover?: OrbitGraphOptions["onNodeHover"];
    onLinkHover?: OrbitGraphOptions["onLinkHover"];
};

/**
 * React container for an OrbitGraph renderer.
 *
 * Use a ref and `getInstance()` when an application needs imperative graph
 * actions such as lazy loading, expanding a node, or saving view state.
 */
export const OrbitGraph = forwardRef<OrbitGraphHandle, OrbitGraphProps>(
    function OrbitGraph(
        {
            data,
            options,
            onReady,
            onSelectionChange,
            onVisibleDataChange,
            onLoadingChange,
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
            onReady,
            onSelectionChange,
            onVisibleDataChange,
            onLoadingChange,
            onNodeClick,
            onLinkClick,
            onNodeHover,
            onLinkHover,
        });

        callbacksRef.current = {
            onReady,
            onSelectionChange,
            onVisibleDataChange,
            onLoadingChange,
            onNodeClick,
            onLinkClick,
            onNodeHover,
            onLinkHover,
        };

        useImperativeHandle(
            ref,
            () => ({
                getInstance: () => graphRef.current,
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
            callbacksRef.current.onReady?.(graph);

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

OrbitGraph.displayName = "OrbitGraph";