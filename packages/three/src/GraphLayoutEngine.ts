import type {
    GraphDirection,
    GraphLayout,
    GraphLayoutOptions,
    GraphLink,
} from "@orbitgraph/core";

import type { PhysicsNode } from "./PhysicsEngine";

export type LayoutPosition = {
    x: number;
    y: number;
    z: number;
};

/** Calculates deterministic target positions for non-force graph layouts. */
export class GraphLayoutEngine {
    getPositions(
        nodes: PhysicsNode[],
        links: GraphLink[],
        layout: GraphLayout,
        options: GraphLayoutOptions = {},
    ): Map<string, LayoutPosition> {
        switch (layout) {
            case "radial":
                return this.getRadialPositions(nodes, options);
            case "grid":
                return this.getGridPositions(nodes, options);
            case "hierarchical":
                return this.getHierarchicalPositions(nodes, links, options);
            case "force":
            default:
                return new Map();
        }
    }

    private getRadialPositions(
        nodes: PhysicsNode[],
        options: GraphLayoutOptions,
    ): Map<string, LayoutPosition> {
        const positions = new Map<string, LayoutPosition>();
        const spacing = options.spacing ?? 12;
        const radius = Math.max(spacing, (nodes.length * spacing) / (2 * Math.PI));

        nodes.forEach((node, index) => {
            const angle = (index / Math.max(nodes.length, 1)) * Math.PI * 2;

            positions.set(node.id, {
                x: Math.cos(angle) * radius,
                y: Math.sin(angle) * radius,
                z: 0,
            });
        });

        return positions;
    }

    private getGridPositions(
        nodes: PhysicsNode[],
        options: GraphLayoutOptions,
    ): Map<string, LayoutPosition> {
        const positions = new Map<string, LayoutPosition>();
        const spacing = options.spacing ?? 12;
        const columns = Math.max(1, Math.ceil(Math.cbrt(nodes.length)));
        const rows = Math.max(1, Math.ceil(Math.sqrt(nodes.length / columns)));

        nodes.forEach((node, index) => {
            const xIndex = index % columns;
            const yIndex = Math.floor(index / columns) % rows;
            const zIndex = Math.floor(index / (columns * rows));

            positions.set(node.id, {
                x: (xIndex - (columns - 1) / 2) * spacing,
                y: (yIndex - (rows - 1) / 2) * spacing,
                z: (zIndex - Math.floor((nodes.length - 1) / (columns * rows)) / 2) * spacing,
            });
        });

        return positions;
    }

    private getHierarchicalPositions(
        nodes: PhysicsNode[],
        links: GraphLink[],
        options: GraphLayoutOptions,
    ): Map<string, LayoutPosition> {
        const positions = new Map<string, LayoutPosition>();

        if (nodes.length === 0) {
            return positions;
        }

        const spacing = options.spacing ?? 14;
        const rootId = options.rootId && nodes.some((node) => node.id === options.rootId)
            ? options.rootId
            : nodes[0].id;
        const direction = options.direction ?? "outgoing";
        const layers = this.getLayers(rootId, links, direction);
        const assignedIds = new Set<string>();

        for (const layer of layers) {
            for (const nodeId of layer) {
                assignedIds.add(nodeId);
            }
        }

        const unconnected = nodes
            .map((node) => node.id)
            .filter((nodeId) => !assignedIds.has(nodeId));

        if (unconnected.length > 0) {
            layers.push(unconnected);
        }

        const centerLayer = (layers.length - 1) / 2;

        layers.forEach((layer, layerIndex) => {
            const radius = Math.max(spacing, (layer.length * spacing) / (2 * Math.PI));

            layer.forEach((nodeId, index) => {
                const angle = (index / Math.max(layer.length, 1)) * Math.PI * 2;

                positions.set(nodeId, {
                    x: Math.cos(angle) * radius,
                    y: Math.sin(angle) * radius,
                    z: (layerIndex - centerLayer) * spacing * 1.8,
                });
            });
        });

        return positions;
    }

    private getLayers(
        rootId: string,
        links: GraphLink[],
        direction: GraphDirection,
    ): string[][] {
        const layers: string[][] = [[rootId]];
        const visited = new Set([rootId]);
        let frontier = [rootId];

        while (frontier.length > 0) {
            const next = new Set<string>();

            for (const nodeId of frontier) {
                for (const link of links) {
                    const neighborId = this.getNeighborId(nodeId, link, direction);

                    if (neighborId && !visited.has(neighborId)) {
                        visited.add(neighborId);
                        next.add(neighborId);
                    }
                }
            }

            if (next.size === 0) {
                break;
            }

            frontier = [...next].sort();
            layers.push(frontier);
        }

        return layers;
    }

    private getNeighborId(
        nodeId: string,
        link: GraphLink,
        direction: GraphDirection,
    ): string | null {
        if (direction === "outgoing") {
            return link.source === nodeId ? link.target : null;
        }

        if (direction === "incoming") {
            return link.target === nodeId ? link.source : null;
        }

        if (link.source === nodeId) {
            return link.target;
        }

        if (link.target === nodeId) {
            return link.source;
        }

        return null;
    }
}