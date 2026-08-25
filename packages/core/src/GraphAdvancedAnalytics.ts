import type { GraphData } from "./types";

/** Finds weakly connected components in linear time. */
export function findConnectedComponents(data: GraphData): string[][] {
    const adjacency = new Map(data.nodes.map((node) => [node.id, new Set<string>()]));
    data.links.forEach((link) => { adjacency.get(link.source)?.add(link.target); adjacency.get(link.target)?.add(link.source); });
    const visited = new Set<string>(); const components: string[][] = [];
    for (const node of data.nodes) { if (visited.has(node.id)) continue; const component: string[] = []; const queue = [node.id]; visited.add(node.id); while (queue.length) { const id = queue.shift()!; component.push(id); adjacency.get(id)?.forEach((neighbor) => { if (!visited.has(neighbor)) { visited.add(neighbor); queue.push(neighbor); } }); } components.push(component.sort()); }
    return components.sort((a, b) => b.length - a.length);
}

/** Calculates each node's k-core number using iterative degree peeling. */
export function calculateCoreNumbers(data: GraphData): Record<string, number> {
    const adjacency = new Map(data.nodes.map((node) => [node.id, new Set<string>()])); data.links.forEach((link) => { adjacency.get(link.source)?.add(link.target); adjacency.get(link.target)?.add(link.source); });
    const remaining = new Map([...adjacency].map(([id, neighbors]) => [id, new Set(neighbors)])); const core: Record<string, number> = {}; let k = 0;
    while (remaining.size) { const removable = [...remaining].filter(([, neighbors]) => neighbors.size <= k).map(([id]) => id); if (!removable.length) { k += 1; continue; } for (const id of removable) { core[id] = k; remaining.get(id)?.forEach((neighbor) => remaining.get(neighbor)?.delete(id)); remaining.delete(id); } }
    return core;
}

/** Jaccard similarity between two nodes' undirected neighborhoods. */
export function calculateNodeSimilarity(data: GraphData, leftId: string, rightId: string): number {
    const neighbors = (id: string) => new Set(data.links.flatMap((link) => link.source === id ? [link.target] : link.target === id ? [link.source] : [])); const left = neighbors(leftId); const right = neighbors(rightId); const union = new Set([...left, ...right]); if (!union.size) return 0; return [...left].filter((id) => right.has(id)).length / union.size;
}

/** Flags degree outliers using a configurable standard-deviation threshold. */
export function detectDegreeAnomalies(data: GraphData, threshold = 2): string[] {
    const degree = new Map(data.nodes.map((node) => [node.id, 0])); data.links.forEach((link) => { degree.set(link.source, (degree.get(link.source) ?? 0) + 1); degree.set(link.target, (degree.get(link.target) ?? 0) + 1); }); const values = [...degree.values()]; const mean = values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1); const deviation = Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / Math.max(values.length, 1)); return [...degree].filter(([, value]) => deviation > 0 && Math.abs(value - mean) / deviation >= threshold).map(([id]) => id);
}
