export type JSONPrimitive = string | number | boolean | null;

export type JSONValue =
    | JSONPrimitive
    | JSONValue[]
    | { [key: string]: JSONValue };

export type GraphNode = {
    id: string;
    label?: string;
    type?: string;
    size?: number;
    color?: string;

    data?: Record<string, JSONValue>;
};

export type GraphLink = {
    id?: string;
    source: string;
    target: string;
    weight?: number;
    type?: string;
    color?: string;

    data?: Record<string, JSONValue>;
};

export type GraphData = {
    nodes: GraphNode[];
    links: GraphLink[];
};

export type OrbitGraphOptions = {
    backgroundColor?: string;
    nodeColor?: string;
    linkColor?: string;
    nodeSize?: number;
    linkOpacity?: number;

    onNodeClick?: (event: NodeClickEvent) => void;
    onLinkClick?: (event: LinkClickEvent) => void;

    onNodeHover?: (event: NodeHoverEvent) => void;
    onLinkHover?: (event: LinkHoverEvent) => void;

    onSelectionChange?: (selection: GraphSelection) => void;

    onVisibleDataChange?: (data: VisibleGraphData) => void;
};

export type NodeClickEvent = {
    node: GraphNode;
    nativeEvent: MouseEvent;
};

export type LinkClickEvent = {
    link: GraphLink;
    nativeEvent: MouseEvent;
};

export type GraphSelection =
    | {
    kind: "node";
    node: GraphNode;
}
    | {
    kind: "link";
    link: GraphLink;
}
    | null;

export type NodeHoverEvent = {
    node: GraphNode | null;
    nativeEvent: PointerEvent;
};

export type LinkHoverEvent = {
    link: GraphLink | null;
    nativeEvent: PointerEvent;
};

export type VisibleGraphData = {
    nodes: GraphNode[];
    links: GraphLink[];
};