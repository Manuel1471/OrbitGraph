import type { GraphData, GraphLink, GraphNode } from "./types";

export class Graph {
    private nodes = new Map<string, GraphNode>();
    private links = new Map<string, GraphLink>();
    private linksByNode = new Map<string, Set<string>>();

    constructor(data?: GraphData) {
        if (data) {
            this.setData(data);
        }
    }

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

    addNode(node: GraphNode): void {
        this.nodes.set(node.id, node);

        if (!this.linksByNode.has(node.id)) {
            this.linksByNode.set(node.id, new Set());
        }
    }

    addLink(link: GraphLink): void {
        if (!this.nodes.has(link.source) || !this.nodes.has(link.target)) {
            throw new Error(
                `Cannot create link: "${link.source}" or "${link.target}" does not exist.`,
            );
        }

        const id = link.id ?? `${link.source}__${link.type ?? "related"}__${link.target}`;

        const normalizedLink: GraphLink = {
            ...link,
            id,
        };

        this.links.set(id, normalizedLink);

        this.linksByNode.get(link.source)?.add(id);
        this.linksByNode.get(link.target)?.add(id);
    }

    getNode(nodeId: string): GraphNode | undefined {
        return this.nodes.get(nodeId);
    }

    getLink(linkId: string): GraphLink | undefined {
        return this.links.get(linkId);
    }

    getNodes(): GraphNode[] {
        return [...this.nodes.values()];
    }

    getLinks(): GraphLink[] {
        return [...this.links.values()];
    }

    getNeighbors(nodeId: string): GraphNode[] {
        const linkIds = this.linksByNode.get(nodeId) ?? new Set<string>();
        const neighbors = new Map<string, GraphNode>();

        for (const linkId of linkIds) {
            const link = this.links.get(linkId);

            if (!link) {
                continue;
            }

            const neighborId = link.source === nodeId ? link.target : link.source;
            const neighbor = this.nodes.get(neighborId);

            if (neighbor) {
                neighbors.set(neighbor.id, neighbor);
            }
        }

        return [...neighbors.values()];
    }

    getNodeLinks(nodeId: string): GraphLink[] {
        const linkIds = this.linksByNode.get(nodeId) ?? new Set<string>();

        return [...linkIds]
            .map((linkId) => this.links.get(linkId))
            .filter((link): link is GraphLink => Boolean(link));
    }

    removeNode(nodeId: string): void {
        const links = this.getNodeLinks(nodeId);

        for (const link of links) {
            this.removeLink(link.id!);
        }

        this.nodes.delete(nodeId);
        this.linksByNode.delete(nodeId);
    }

    removeLink(linkId: string): void {
        const link = this.links.get(linkId);

        if (!link) {
            return;
        }

        this.linksByNode.get(link.source)?.delete(linkId);
        this.linksByNode.get(link.target)?.delete(linkId);
        this.links.delete(linkId);
    }

    toJSON(): GraphData {
        return {
            nodes: this.getNodes(),
            links: this.getLinks(),
        };
    }
}