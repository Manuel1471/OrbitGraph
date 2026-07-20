/**
 * Primitive values supported by OrbitGraph metadata.
 */
export type JSONPrimitive = string | number | boolean | null;

/**
 * A JSON-compatible value that can be stored in node or relationship metadata.
 */
export type JSONValue =
    | JSONPrimitive
    | JSONValue[]
    | { [key: string]: JSONValue };

/**
 * An entity displayed in an OrbitGraph visualization.
 */
export type GraphNode = {
    /** Unique node identifier. */
    id: string;

    /** Human-readable node name. */
    label?: string;

    /** Category used for filtering, styling, and grouping. */
    type?: string;

    /** Relative visual size of the node. */
    size?: number;

    /** Node color in a CSS-compatible color format. */
    color?: string;

    /** Additional JSON-compatible information associated with the node. */
    data?: Record<string, JSONValue>;
};

/**
 * A directed relationship between two nodes.
 */
export type GraphLink = {
    /** Unique relationship identifier. Generated when omitted. */
    id?: string;

    /** Identifier of the node where the relationship starts. */
    source: string;

    /** Identifier of the node where the relationship ends. */
    target: string;

    /** Relative relationship importance, usually between 0 and 1. */
    weight?: number;

    /** Category describing the relationship. */
    type?: string;

    /** Relationship color in a CSS-compatible color format. */
    color?: string;

    /** Additional JSON-compatible relationship information. */
    data?: Record<string, JSONValue>;
};

/**
 * Complete graph data used by OrbitGraph.
 */
export type GraphData = {
    nodes: GraphNode[];
    links: GraphLink[];
};

/**
 * Direction used when exploring relationships from a node.
 */
export type GraphDirection = "incoming" | "outgoing" | "both";

/**
 * Options used when expanding a node into its relationship neighborhood.
 */
export type GraphExpansionOptions = {
    /** Number of relationship levels to reveal. @defaultValue 1 */
    depth?: number;

    /** Relationship direction to reveal. @defaultValue "both" */
    direction?: GraphDirection;

    /** Optional relationship types to include while expanding. */
    relationshipTypes?: string[];

    /**
     * Maximum number of direct neighbors to reveal for this expansion.
     *
     * This is useful for paginating highly connected nodes.
     */
    limit?: number;

    /**
     * Number of direct neighbors to skip before applying `limit`.
     *
     * Use it with `limit` to request the next page of neighbors.
     */
    offset?: number;
};

/**
 * Options used when finding and displaying a shortest path.
 */
export type GraphPathOptions = {
    /**
     * Direction used while searching for the path.
     * @defaultValue "both"
     */
    direction?: GraphDirection;
};

/**
 * Defines the first subset of graph data shown after `setData`.
 *
 * The complete data remains in OrbitGraph memory, but only this subset is
 * mounted in the renderer and force simulation.
 */
export type GraphInitialView =
    | {
    /** Render every node and relationship. */
    mode: "all";
}
    | {
    /** Render a single node. */
    mode: "node";

    /** Node to render. */
    nodeId: string;
}
    | {
    /** Render a node and its relationship neighborhood. */
    mode: "neighborhood";

    /** Root node of the neighborhood. */
    nodeId: string;

    /** Number of relationship levels to reveal. @defaultValue 1 */
    depth?: number;

    /** Relationship direction to reveal. @defaultValue "both" */
    direction?: GraphDirection;

    /** Optional relationship types to include. */
    relationshipTypes?: string[];
}
    | {
    /** Render nodes that share a type. */
    mode: "type";

    /** Node type to render, for example "team" or "service". */
    nodeType: string;

    /** Maximum initial nodes to render. */
    maxNodes?: number;
};

/**
 * Exploration status for a node in the currently active graph view.
 */
export type GraphNodeExplorationState = {
    /** Identifier of the node represented by this state. */
    nodeId: string;

    /** Whether the node currently has one or more manual expansions. */
    expanded: boolean;

    /** Number of direct neighbors currently visible in the explored graph. */
    visibleNeighbors: number;

    /** Number of direct neighbors still hidden from the explored graph. */
    hiddenNeighbors: number;

    /** Whether the node has hidden neighbors that can be expanded. */
    canExpand: boolean;
};

/**
 * State of the exploration history.
 */
export type GraphExplorationHistoryState = {
    /** Whether an earlier exploration state can be restored. */
    canGoBack: boolean;

    /** Whether a later exploration state can be restored. */
    canGoForward: boolean;

    /** Current zero-based history entry index. */
    index: number;

    /** Total number of exploration history entries. */
    length: number;
};

/**
 * Configuration for animated directional flow along relationships.
 */
export type LinkFlowOptions = {
    /** Enables animated relationship flow. @defaultValue false */
    enabled?: boolean;

    /** Maximum number of animated flow particles. @defaultValue 140 */
    maxParticles?: number;

    /** Relative size of each flow particle. @defaultValue 0.09 */
    particleSize?: number;

    /** Movement speed of flow particles. @defaultValue 0.12 */
    particleSpeed?: number;
};

/**
 * Configuration options for an OrbitGraph instance.
 */
export type OrbitGraphOptions = {
    /** Scene background color. */
    backgroundColor?: string;

    /** Default color used for nodes without an explicit color. */
    nodeColor?: string;

    /** Default color used for relationships without an explicit color. */
    linkColor?: string;

    /** Default relative size used for nodes without an explicit size. */
    nodeSize?: number;

    /** Base opacity used for relationship lines. */
    linkOpacity?: number;

    /**
     * Initial data subset rendered by OrbitGraph.
     * @defaultValue { mode: "all" }
     */
    initialView?: GraphInitialView;

    /** Configuration for optional animated relationship flow. */
    linkFlow?: LinkFlowOptions;

    /** Called after clicking a node. */
    onNodeClick?: (event: NodeClickEvent) => void;

    /** Called after clicking a relationship. */
    onLinkClick?: (event: LinkClickEvent) => void;

    /** Called when node hover state changes. */
    onNodeHover?: (event: NodeHoverEvent) => void;

    /** Called when relationship hover state changes. */
    onLinkHover?: (event: LinkHoverEvent) => void;

    /** Called when the selected node or relationship changes. */
    onSelectionChange?: (selection: GraphSelection) => void;

    /**
     * Called after exploration and filters change the rendered graph subset.
     */
    onVisibleDataChange?: (data: VisibleGraphData) => void;
};

/**
 * Event emitted after clicking a node.
 */
export type NodeClickEvent = {
    node: GraphNode;
    nativeEvent: MouseEvent;
};

/**
 * Event emitted after clicking a relationship.
 */
export type LinkClickEvent = {
    link: GraphLink;
    nativeEvent: MouseEvent;
};

/**
 * Current graph selection.
 */
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

/**
 * Event emitted when node hover state changes.
 */
export type NodeHoverEvent = {
    node: GraphNode | null;
    nativeEvent: PointerEvent;
};

/**
 * Event emitted when relationship hover state changes.
 */
export type LinkHoverEvent = {
    link: GraphLink | null;
    nativeEvent: PointerEvent;
};

/**
 * Graph data currently rendered after exploration and filters are applied.
 */
export type VisibleGraphData = {
    nodes: GraphNode[];
    links: GraphLink[];
};