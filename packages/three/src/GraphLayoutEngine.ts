import type {
    GraphDirection,
    GraphLayout,
    GraphLayoutOptions,
    GraphLink,
} from "@orbitgraph/core";
import dagre from "dagre";
import { sankey, sankeyCenter } from "d3-sankey";

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
                return this.getDagrePositions(nodes, links, options);
            case "sankey":
                return this.getSankeyPositions(nodes, links, options);
            case "timeline":
                return this.getTimelinePositions(nodes, options);
            case "bipartite":
                return this.getBipartitePositions(nodes, options);
            case "geographic":
                return this.getGeographicPositions(nodes, options);
            case "concentric":
                return this.getConcentricPositions(nodes, links, options);
            case "sphere":
                return this.getSpherePositions(nodes, options);
            case "arc":
                return this.getArcPositions(nodes, options);
            case "force":
            default:
                return new Map();
        }
    }

    private getDagrePositions(nodes: PhysicsNode[], links: GraphLink[], options: GraphLayoutOptions): Map<string, LayoutPosition> {
        const graph = new dagre.graphlib.Graph({ multigraph: true }); graph.setGraph({ rankdir: options.rankDirection ?? "LR", nodesep: options.spacing ?? 30, ranksep: (options.spacing ?? 30) * 2 }); graph.setDefaultEdgeLabel(() => ({}));
        nodes.forEach((node) => graph.setNode(node.id, { width: 24, height: 24 })); links.forEach((link, index) => { if (graph.hasNode(link.source) && graph.hasNode(link.target)) graph.setEdge(link.source, link.target, {}, `${link.id ?? index}`); }); dagre.layout(graph);
        const positions = new Map<string, LayoutPosition>(); nodes.forEach((node) => { const value = graph.node(node.id) as { x: number; y: number }; positions.set(node.id, { x: value.x - (graph.graph().width ?? 0) / 2, y: -(value.y - (graph.graph().height ?? 0) / 2), z: 0 }); }); return positions;
    }

    private getSankeyPositions(nodes: PhysicsNode[], links: GraphLink[], options: GraphLayoutOptions): Map<string, LayoutPosition> {
        const knownIds = new Set(nodes.map((node) => node.id)); const input = { nodes: nodes.map((node) => ({ id: node.id })), links: links.flatMap((link) => knownIds.has(link.source) && knownIds.has(link.target) ? [{ source: link.source, target: link.target, value: Math.max(link.weight ?? 1, .001) }] : []) };
        const width = Math.max(240, nodes.length * (options.spacing ?? 10)); const height = Math.max(160, Math.sqrt(nodes.length) * (options.spacing ?? 10) * 5); const result = sankey<{ id: string }, { source: string; target: string; value: number }>().nodeId((node) => node.id).nodeAlign(sankeyCenter).nodeWidth(16).nodePadding(10).extent([[0, 0], [width, height]])(input as any);
        return new Map(result.nodes.map((node: any) => [node.id, { x: (node.x0 + node.x1) / 2 - width / 2, y: -((node.y0 + node.y1) / 2 - height / 2), z: 0 }]));
    }

    private getConcentricPositions(nodes: PhysicsNode[], links: GraphLink[], options: GraphLayoutOptions): Map<string, LayoutPosition> {
        const degree = new Map(nodes.map((node) => [node.id, 0])); links.forEach((link) => { degree.set(link.source, (degree.get(link.source) ?? 0) + 1); degree.set(link.target, (degree.get(link.target) ?? 0) + 1); }); const groups = new Map<number, PhysicsNode[]>(); nodes.forEach((node) => { const value = degree.get(node.id) ?? 0; const list = groups.get(value) ?? []; list.push(node); groups.set(value, list); }); const spacing = options.spacing ?? 12; const positions = new Map<string, LayoutPosition>(); [...groups.entries()].sort(([a], [b]) => b - a).forEach(([, group], ring) => group.forEach((node, index) => { const radius = Math.max(spacing, (ring + 1) * spacing * 2); const angle = index / group.length * Math.PI * 2; positions.set(node.id, { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius, z: 0 }); })); return positions;
    }

    private getSpherePositions(nodes: PhysicsNode[], options: GraphLayoutOptions): Map<string, LayoutPosition> { const radius = Math.max(options.spacing ?? 12, Math.cbrt(nodes.length) * (options.spacing ?? 12)); return new Map(nodes.map((node, index) => { const phi = Math.acos(1 - 2 * (index + .5) / nodes.length); const theta = Math.PI * (1 + Math.sqrt(5)) * index; return [node.id, { x: radius * Math.cos(theta) * Math.sin(phi), y: radius * Math.sin(theta) * Math.sin(phi), z: radius * Math.cos(phi) }]; })); }
    private getArcPositions(nodes: PhysicsNode[], options: GraphLayoutOptions): Map<string, LayoutPosition> { const spacing = options.spacing ?? 12; return new Map(nodes.map((node, index) => { const x = (index - (nodes.length - 1) / 2) * spacing; return [node.id, { x, y: Math.pow(x / Math.max(spacing, 1), 2) * spacing * .08, z: 0 }]; })); }

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
