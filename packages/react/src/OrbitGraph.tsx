import {
    useEffect,
    useRef,
    type CSSProperties,
    type HTMLAttributes,
} from "react";

import type {
    GraphData,
    GraphSelection,
    OrbitGraphOptions,
    VisibleGraphData,
} from "@orbitgraph/core";

import {
    createOrbitGraph,
    type OrbitGraph as OrbitGraphInstance,
} from "@orbitgraph/three";

export type OrbitGraphProps = Omit<
    HTMLAttributes<HTMLDivElement>,
    "children"
> & {
    data: GraphData;
    options?: Omit<
        OrbitGraphOptions,
        | "onSelectionChange"
        | "onNodeClick"
        | "onLinkClick"
        | "onNodeHover"
        | "onLinkHover"
        | "onVisibleDataChange"
    >;
    style?: CSSProperties;

    onSelectionChange?: (selection: GraphSelection) => void;
    onVisibleDataChange?: (data: VisibleGraphData) => void;
    onNodeClick?: OrbitGraphOptions["onNodeClick"];
    onLinkClick?: OrbitGraphOptions["onLinkClick"];
    onNodeHover?: OrbitGraphOptions["onNodeHover"];
    onLinkHover?: OrbitGraphOptions["onLinkHover"];
};

export function OrbitGraph({
                               data,
                               options,
                               onSelectionChange,
                               onVisibleDataChange,
                               onNodeClick,
                               onLinkClick,
                               onNodeHover,
                               onLinkHover,
                               style,
                               ...divProps
                           }: OrbitGraphProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const graphRef = useRef<OrbitGraphInstance | null>(null);

    const callbacksRef = useRef({
        onSelectionChange,
        onVisibleDataChange,
        onNodeClick,
        onLinkClick,
        onNodeHover,
        onLinkHover,
    });

    callbacksRef.current = {
        onSelectionChange,
        onVisibleDataChange,
        onNodeClick,
        onLinkClick,
        onNodeHover,
        onLinkHover,
    };

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
}