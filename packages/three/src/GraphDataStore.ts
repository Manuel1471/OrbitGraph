import type { GraphData, GraphLink, GraphNode } from "@orbitgraph/core";

import type { PhysicsNode } from "./PhysicsEngine";

/**
 * Owns the complete graph data and persistent physics-node positions.
 *
 * The stored graph may contain more nodes than the active rendered view.
 * GraphExplorer and GraphViewSynchronizer decide which subset is visible.
 */
export class GraphDataStore {
    private data: GraphData = { nodes: [], links: [] };

    /**
     * Retains positions, velocities, and pinning across exploration changes.
     */
    private readonly nodeStates = new Map<string, PhysicsNode>();

    getData(): GraphData {
        return this.data;
    }

    setData(data: GraphData): void {
        this.nodeStates.clear();

        this.data = {
            nodes: data.nodes.map((node) => ({ ...node })),
            links: data.links.map((link) => this.normalizeLink(link)),
        };
    }

    addNode(node: GraphNode): void {
        if (this.data.nodes.some((item) => item.id === node.id)) {
            throw new Error(`Node "${node.id}" already exists.`);
        }

        this.data.nodes.push({ ...node });
    }

    removeNode(nodeId: string): void {
        this.data.nodes = this.data.nodes.filter((node) => node.id !== nodeId);
        this.data.links = this.data.links.filter(
            (link) => link.source !== nodeId && link.target !== nodeId,
        );

        this.nodeStates.delete(nodeId);
    }

    addLink(link: GraphLink): void {
        const nodeIds = new Set(this.data.nodes.map((node) => node.id));

        if (!nodeIds.has(link.source) || !nodeIds.has(link.target)) {
            throw new Error("Both link nodes must exist before adding a link.");
        }

        const normalizedLink = this.normalizeLink(link);

        if (this.data.links.some((item) => item.id === normalizedLink.id)) {
            throw new Error(`Link "${normalizedLink.id}" already exists.`);
        }

        this.data.links.push(normalizedLink);
    }

    removeLink(linkId: string): void {
        this.data.links = this.data.links.filter((link) => link.id !== linkId);
    }

    getNode(nodeId: string): GraphNode | undefined {
        return this.data.nodes.find((node) => node.id === nodeId);
    }

    /**
     * Adds lazy-loaded graph data while preserving existing local values and
     * cached physics positions.
     */
    merge(data: Pick<GraphData, "nodes" | "links">): void {
        const nodes = [...this.data.nodes];
        const nodeIndexes = new Map(
            nodes.map((node, index) => [node.id, index]),
        );

        for (const node of data.nodes) {
            const index = nodeIndexes.get(node.id);

            if (index === undefined) {
                nodeIndexes.set(node.id, nodes.length);
                nodes.push({ ...node });
            } else {
                nodes[index] = { ...nodes[index], ...node };
            }
        }

        const links = [...this.data.links];
        const linkIndexes = new Map(
            links.map((link, index) => [link.id!, index]),
        );

        for (const link of data.links) {
            const normalizedLink = this.normalizeLink(link);
            const index = linkIndexes.get(normalizedLink.id);

            if (index === undefined) {
                linkIndexes.set(normalizedLink.id, links.length);
                links.push(normalizedLink);
            } else {
                links[index] = { ...links[index], ...normalizedLink };
            }
        }

        this.data = { nodes, links };
    }

    /**
     * Returns a stable physics representation for a visible node.
     */
    getOrCreatePhysicsNode(
        node: GraphNode,
        index: number,
    ): PhysicsNode {
        const existing = this.nodeStates.get(node.id);

        if (existing) {
            Object.assign(existing, node);
            return existing;
        }

        const physicsNode = this.createPhysicsNode(node, index);

        this.nodeStates.set(node.id, physicsNode);

        return physicsNode;
    }

    private normalizeLink(link: GraphLink): GraphLink & { id: string } {
        return {
            ...link,
            id:
                link.id ??
                `${link.source}__${link.type ?? "related"}__${link.target}`,
        };
    }

    private createPhysicsNode(node: GraphNode, index: number): PhysicsNode {
        const seed = index * 12.9898;
        const theta = seed % (Math.PI * 2);
        const phi = Math.acos(1 - 2 * ((seed * 0.618) % 1));
        const distance = 15 + ((seed * 0.371) % 1) * 20;

        return {
            ...node,
            x: distance * Math.sin(phi) * Math.cos(theta),
            y: distance * Math.sin(phi) * Math.sin(theta),
            z: distance * Math.cos(phi),
        };
    }
}