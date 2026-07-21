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

    /** Initial visual arrangement of the active graph. @defaultValue "force" */
    layout?: GraphLayout;

     /** Configuration used by the initial layout. */
     layoutOptions?: GraphLayoutOptions;

    /** Optional asynchronous source used to load nodes and neighborhoods on demand. */
    dataSource?: GraphDataSource;

    /** Called when a lazy data-source request starts or finishes. */
    onLoadingChange?: (state: GraphLoadingState) => void;

    /** Camera navigation and distance constraints. */
    camera?: OrbitGraphCameraOptions;

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

/** Visual arrangement used to position active graph nodes. */
export type GraphLayout = "force" | "radial" | "grid" | "hierarchical";

/** Additional configuration for a graph layout. */
export type GraphLayoutOptions = {
    /** Root node used by the hierarchical layout. Defaults to the first active node. */
    rootId?: string;

    /** Relationship direction used to build hierarchy levels. @defaultValue "outgoing" */
    direction?: GraphDirection;

    /** Distance between layout positions. @defaultValue 12 or 14 depending on layout. */
    spacing?: number;
};

export type GraphFilterState = {
    /** Current text query, normalized to lowercase. */
    searchQuery: string;
    /** Node types currently included by the type filter. */
    selectedTypes: string[];
    /** Lowest visible relationship weight. */
    minimumLinkWeight: number;
};

/**
 * Serializable expanded-neighborhood pages for one graph node.
 */
export type GraphExplorerExpansionState = {
    /** Node from which the expansion was made. */
    nodeId: string;
    /** Loaded neighborhood pages and their options. */
    pages: GraphExpansionOptions[];
};

/**
 * Serializable path currently focused by graph exploration.
 */
export type GraphPathFocusState = {
    /** Node identifiers belonging to the visible path. */
    nodeIds: string[];
    /** Relationship identifiers belonging to the visible path. */
    linkIds: string[];
};

/**
 * Serializable state of the current graph exploration session.
 *
 * It intentionally excludes undo and redo history. Restoring this state starts
 * a new session from the saved visual exploration point.
 */
export type GraphExplorerState = {
    /** Configured entry point used by reset exploration. */
    initialView: GraphInitialView;
    /** Currently active view, which can temporarily differ from initialView. */
    activeView: GraphInitialView;
    /** Current paginated node expansions. */
    expansions: GraphExplorerExpansionState[];
    /** Current focused path, or null when normal exploration is active. */
    path: GraphPathFocusState | null;
};

export type OrbitGraphViewState = {
    /** Schema version used to safely evolve saved view states. */
    version: 1;

    /** Current exploration entry point, expansions, and focused path. */
    exploration: GraphExplorerState;

    /** Current search, type, and relationship-weight filters. */
    filters: GraphFilterState;

    /** Visual arrangement of the active graph nodes. */
    layout: GraphLayout;

    /** Configuration associated with the active layout. */
    layoutOptions: GraphLayoutOptions;
};

/** Parameters sent to a lazy graph data source when loading a neighborhood. */
export type GraphNeighborhoodQuery = GraphExpansionOptions & {
    /** Node whose direct relationship page should be loaded. */
    nodeId: string;
};

/** A graph-data page returned by a lazy data source. */
export type GraphNeighborhoodResult = {
    /** Newly available nodes. Existing ids are updated when merged. */
    nodes: GraphNode[];
    /** Newly available relationships. Existing ids are updated when merged. */
    links: GraphLink[];
    /** Total direct neighbors when the backend can provide it. */
    totalNeighbors?: number;
    /** Whether another direct-neighbor page can be requested. */
    hasMore?: boolean;
    /** Offset to use for the next page, when available. */
    nextOffset?: number | null;
};

/**
 * Optional asynchronous source for graphs too large to load at once.
 *
 * OrbitGraph does not make HTTP requests itself. The consumer supplies these
 * functions and may use fetch, a database client, GraphQL, or a WebSocket.
 */
export type GraphDataSource = {
    /** Loads one node, commonly used to load the first exploration root. */
    getNode?: (nodeId: string) => Promise<GraphNode | undefined>;
    /** Loads one relationship neighborhood or one paginated neighbor page. */
    getNeighborhood: (
        query: GraphNeighborhoodQuery,
    ) => Promise<GraphNeighborhoodResult>;
};

/** Options used when loading an asynchronous node neighborhood. */
export type GraphNeighborhoodLoadOptions = GraphExpansionOptions & {
    /** Ignores OrbitGraph's in-memory page cache. @defaultValue false */
    force?: boolean;
};

/** Current lazy-load activity, useful for consumer loading indicators. */
export type GraphLoadingState = {
    /** Whether a source request is currently active. */
    loading: boolean;
    /** Operation currently running, or null when idle. */
    operation: "node" | "neighborhood" | null;
    /** Requested node id, or null when idle. */
    nodeId: string | null;
};

/**
 * Configuration for OrbitGraph camera navigation.
 *
 * Touch navigation is always enabled through OrbitControls:
 * one finger rotates, while two fingers pan and zoom.
 */
export type OrbitGraphCameraOptions = {
    /** Enables desktop keyboard movement with WASD and Q/E. @defaultValue true */
    keyboardNavigation?: boolean;

    /** Base speed for keyboard movement. @defaultValue 18 */
    movementSpeed?: number;

    /** Multiplier applied while Shift is pressed. @defaultValue 2.5 */
    boostMultiplier?: number;

    /** Minimum distance between the camera and its target. @defaultValue 2 */
    minDistance?: number;

    /** Maximum distance between the camera and its target. @defaultValue 1000 */
    maxDistance?: number;
};