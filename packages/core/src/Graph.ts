import type { GraphData, GraphLink, GraphNode } from "./types";

/**
 * In-memory graph data structure for nodes and directed relationships.
 *
 * It provides fast lookups for nodes, links, and relationships connected
 * to a specific node.
 *
 * @example
 * ```ts
 * const graph = new Graph({
 *   nodes: [
 *     { id: "team", label: "Product Team" },
 *     { id: "service", label: "Notification Service" }
 *   ],
 *   links: [
 *     {
 *       source: "team",
 *       target: "service",
 *       type: "owns"
 *     }
 *   ]
 * });
 *
 * console.log(graph.getNeighbors("team"));
 * ```
 */
export class Graph {
    private nodes = new Map<string, GraphNode>();
    private links = new Map<string, GraphLink>();
    private linksByNode = new Map<string, Set<string>>();

    /**
     * Creates a graph.
     *
     * @param data Optional initial graph data.
     */
    constructor(data?: GraphData) {
        if (data) {
            this.setData(data);
        }
    }

    /**
     * Replaces all nodes and links in the graph.
     *
     * Links whose source or target node does not exist will throw an error.
     *
     * @param data Complete graph data.
     */
    setData(data: GraphData): void {
        this.nodes.clear();
        this.links.clear();
        this.linksByNode.clear();

        for (const node of data.nodes) {
            this.addNode(node);
        }

        for (const link of data.links) {
            this.addLink(link);
        }
    }

    /**
     * Adds or replaces a node.
     *
     * If a node with the same ID already exists, its data is replaced.
     *
     * @param node Node to add.
     */
    addNode(node: GraphNode): void {
        this.nodes.set(node.id, node);

        if (!this.linksByNode.has(node.id)) {
            this.linksByNode.set(node.id, new Set());
        }
    }

    /**
     * Adds or replaces a relationship.
     *
     * Both the source and target nodes must already exist.
     * When no ID is supplied, OrbitGraph generates one from the source,
     * relationship type, and target.
     *
     * @param link Relationship to add.
     * @throws {Error} When the source or target node does not exist.
     */
    addLink(link: GraphLink): void {
        if (!this.nodes.has(link.source) || !this.nodes.has(link.target)) {
            throw new Error(
                `Cannot create link: "${link.source}" or "${link.target}" does not exist.`,
            );
        }

        const id =
            link.id ??
            `${link.source}__${link.type ?? "related"}__${link.target}`;

        const normalizedLink: GraphLink = {
            ...link,
            id,
        };

        this.links.set(id, normalizedLink);

        this.linksByNode.get(link.source)?.add(id);
        this.linksByNode.get(link.target)?.add(id);
    }

    /**
     * Returns a node by ID.
     *
     * @param nodeId Node identifier.
     * @returns The node, or `undefined` when it does not exist.
     */
    getNode(nodeId: string): GraphNode | undefined {
        return this.nodes.get(nodeId);
    }

    /**
     * Returns a relationship by ID.
     *
     * @param linkId Relationship identifier.
     * @returns The relationship, or `undefined` when it does not exist.
     */
    getLink(linkId: string): GraphLink | undefined {
        return this.links.get(linkId);
    }

    /**
     * Returns all nodes in insertion order.
     */
    getNodes(): GraphNode[] {
        return [...this.nodes.values()];
    }

    /**
     * Returns all relationships in insertion order.
     */
    getLinks(): GraphLink[] {
        return [...this.links.values()];
    }

    /**
     * Returns unique nodes directly connected to a node.
     *
     * This method includes both incoming and outgoing relationships.
     *
     * @param nodeId Node identifier.
     * @returns Directly connected nodes.
     */
    getNeighbors(nodeId: string): GraphNode[] {
        const linkIds = this.linksByNode.get(nodeId) ?? new Set<string>();
        const neighbors = new Map<string, GraphNode>();

        for (const linkId of linkIds) {
            const link = this.links.get(linkId);

            if (!link) {
                continue;
            }

            const neighborId =
                link.source === nodeId ? link.target : link.source;

            const neighbor = this.nodes.get(neighborId);

            if (neighbor) {
                neighbors.set(neighbor.id, neighbor);
            }
        }

        return [...neighbors.values()];
    }

    /**
     * Returns all incoming and outgoing relationships for a node.
     *
     * @param nodeId Node identifier.
     */
    getNodeLinks(nodeId: string): GraphLink[] {
        const linkIds = this.linksByNode.get(nodeId) ?? new Set<string>();

        return [...linkIds]
            .map((linkId) => this.links.get(linkId))
            .filter((link): link is GraphLink => Boolean(link));
    }

    /**
     * Removes a node and every relationship connected to it.
     *
     * @param nodeId Node identifier.
     */
    removeNode(nodeId: string): void {
        const links = this.getNodeLinks(nodeId);

        for (const link of links) {
            this.removeLink(link.id!);
        }

        this.nodes.delete(nodeId);
        this.linksByNode.delete(nodeId);
    }

    /**
     * Removes a relationship.
     *
     * Calling this method with an unknown ID does nothing.
     *
     * @param linkId Relationship identifier.
     */
    removeLink(linkId: string): void {
        const link = this.links.get(linkId);

        if (!link) {
            return;
        }

        this.linksByNode.get(link.source)?.delete(linkId);
        this.linksByNode.get(link.target)?.delete(linkId);
        this.links.delete(linkId);
    }

    /**
     * Returns the graph as serializable graph data.
     *
     * @returns A `GraphData` object containing all nodes and links.
     */
    toJSON(): GraphData {
        return {
            nodes: this.getNodes(),
            links: this.getLinks(),
        };
    }
}