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
            case "dag":
            case "sankey":
                return this.getHierarchicalPositions(nodes, links, options);
            case "timeline":
                return this.getTimelinePositions(nodes, options);
            case "bipartite":
                return this.getBipartitePositions(nodes, options);
            case "geographic":
                return this.getGeographicPositions(nodes, options);
            case "force":
            default:
                return new Map();
        }
    }

    private getTimelinePositions(nodes: PhysicsNode[], options: GraphLayoutOptions): Map<string, LayoutPosition> {
        const spacing = options.spacing ?? 12;
        const field = options.timeField ?? "time";
        const values = nodes.map((node, index) => {
            const candidate = Number(node.data?.[field]);
            return { node, value: Number.isFinite(candidate) ? candidate : index };
        });
        const min = Math.min(...values.map(({ value }) => value));
        const max = Math.max(...values.map(({ value }) => value));
        return new Map(values.map(({ node, value }, index) => [node.id, {
            x: max === min ? 0 : ((value - min) / (max - min) - 0.5) * Math.max(spacing * nodes.length, spacing),
            y: ((index % 3) - 1) * spacing * 0.35,
            z: 0,
        }]));
    }

    private getBipartitePositions(nodes: PhysicsNode[], options: GraphLayoutOptions): Map<string, LayoutPosition> {
        const spacing = options.spacing ?? 12;
        const [leftType] = options.bipartiteTypes ?? [nodes[0]?.type ?? ""];
        const columns = [nodes.filter((node) => node.type === leftType), nodes.filter((node) => node.type !== leftType)];
        const positions = new Map<string, LayoutPosition>();
        columns.forEach((column, columnIndex) => column.forEach((node, index) => positions.set(node.id, {
            x: (columnIndex === 0 ? -1 : 1) * spacing * 3,
            y: (index - (column.length - 1) / 2) * spacing,
            z: 0,
        })));
        return positions;
    }

    private getGeographicPositions(nodes: PhysicsNode[], options: GraphLayoutOptions): Map<string, LayoutPosition> {
        const longitude = options.longitudeField ?? "longitude";
        const latitude = options.latitudeField ?? "latitude";
        const spacing = options.spacing ?? 0.5;
        return new Map(nodes.map((node) => [node.id, {
            x: Number(node.data?.[longitude] ?? 0) * spacing,
            y: Number(node.data?.[latitude] ?? 0) * spacing,
            z: 0,
        }]));
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
