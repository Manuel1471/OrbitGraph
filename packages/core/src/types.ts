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
    /**
     * Unique node identifier.
     */
    id: string;

    /**
     * Human-readable node name.
     */
    label?: string;

    /**
     * Category used for filtering, styling, and grouping.
     */
    type?: string;

    /**
     * Relative visual size of the node.
     */
    size?: number;

    /**
     * Node color in a CSS-compatible color format.
     */
    color?: string;

    /**
     * Additional JSON-compatible information associated with the node.
     */
    data?: Record<string, JSONValue>;
};

/**
 * A directed relationship between two nodes.
 */
export type GraphLink = {
    /**
     * Unique relationship identifier.
     *
     * When omitted, OrbitGraph generates an ID from the source, type, and target.
     */
    id?: string;

    /**
     * Identifier of the node where the relationship starts.
     */
    source: string;

    /**
     * Identifier of the node where the relationship ends.
     */
    target: string;

    /**
     * Relative importance of the relationship, usually between `0` and `1`.
     */
    weight?: number;

    /**
     * Category describing the relationship.
     */
    type?: string;

    /**
     * Relationship color in a CSS-compatible color format.
     */
    color?: string;

    /**
     * Additional JSON-compatible information associated with the relationship.
     */
    data?: Record<string, JSONValue>;
};

/**
 * Complete graph data used by OrbitGraph.
 */
export type GraphData = {
    /**
     * Entities in the graph.
     */
    nodes: GraphNode[];

    /**
     * Directed relationships between graph nodes.
     */
    links: GraphLink[];
};

/**
 * Configuration for animated directional flow along relationships.
 *
 * Link flow is disabled by default because it adds rendering work.
 */
export type LinkFlowOptions = {
    /**
     * Enables animated relationship flow.
     *
     * @defaultValue false
     */
    enabled?: boolean;

    /**
     * Maximum number of animated flow particles.
     *
     * Higher values create a denser effect but increase rendering cost.
     *
     * @defaultValue 140
     */
    maxParticles?: number;

    /**
     * Relative size of each flow particle.
     *
     * @defaultValue 0.09
     */
    particleSize?: number;

    /**
     * Movement speed of flow particles.
     *
     * @defaultValue 0.12
     */
    particleSpeed?: number;
};

/**
 * Configuration options for an OrbitGraph instance.
 */
export type OrbitGraphOptions = {
    /**
     * Background color of the WebGL canvas.
     *
     * @defaultValue "#050816"
     */
    backgroundColor?: string;

    /**
     * Default node color when a node does not define its own color.
     */
    nodeColor?: string;

    /**
     * Default relationship color when a link does not define its own color.
     */
    linkColor?: string;

    /**
     * Default relative node size when a node does not define its own size.
     */
    nodeSize?: number;

    /**
     * Base opacity applied to relationships.
     *
     * @defaultValue 0.55
     */
    linkOpacity?: number;

    /**
     * Optional animated directional flow configuration.
     */
    linkFlow?: LinkFlowOptions;

    /**
     * Called when a node is clicked.
     */
    onNodeClick?: (event: NodeClickEvent) => void;

    /**
     * Called when a relationship is clicked.
     */
    onLinkClick?: (event: LinkClickEvent) => void;

    /**
     * Called when the pointer enters, moves over, or leaves a node.
     */
    onNodeHover?: (event: NodeHoverEvent) => void;

    /**
     * Called when the pointer enters, moves over, or leaves a relationship.
     */
    onLinkHover?: (event: LinkHoverEvent) => void;

    /**
     * Called when the selected node or relationship changes.
     */
    onSelectionChange?: (selection: GraphSelection) => void;

    /**
     * Called after search or filters change the currently visible graph data.
     */
    onVisibleDataChange?: (data: VisibleGraphData) => void;
};

/**
 * Event emitted after clicking a node.
 */
export type NodeClickEvent = {
    /**
     * Clicked node.
     */
    node: GraphNode;

    /**
     * Native browser mouse event.
     */
    nativeEvent: MouseEvent;
};

/**
 * Event emitted after clicking a relationship.
 */
export type LinkClickEvent = {
    /**
     * Clicked relationship.
     */
    link: GraphLink;

    /**
     * Native browser mouse event.
     */
    nativeEvent: MouseEvent;
};

/**
 * Current graph selection.
 */
export type GraphSelection =
    | {
    /**
     * Indicates that a node is selected.
     */
    kind: "node";

    /**
     * Selected node.
     */
    node: GraphNode;
}
    | {
    /**
     * Indicates that a relationship is selected.
     */
    kind: "link";

    /**
     * Selected relationship.
     */
    link: GraphLink;
}
    | null;

/**
 * Event emitted when node hover state changes.
 */
export type NodeHoverEvent = {
    /**
     * Hovered node, or `null` when the pointer leaves all nodes.
     */
    node: GraphNode | null;

    /**
     * Native browser pointer event.
     */
    nativeEvent: PointerEvent;
};

/**
 * Event emitted when relationship hover state changes.
 */
export type LinkHoverEvent = {
    /**
     * Hovered relationship, or `null` when the pointer leaves all relationships.
     */
    link: GraphLink | null;

    /**
     * Native browser pointer event.
     */
    nativeEvent: PointerEvent;
};

/**
 * Graph data currently visible after search and filters are applied.
 */
export type VisibleGraphData = {
    /**
     * Visible nodes.
     */
    nodes: GraphNode[];

    /**
     * Visible relationships.
     */
    links: GraphLink[];
};