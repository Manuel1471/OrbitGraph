import type { GraphData, GraphLink } from "./types";
export type GraphRoute = { nodeIds: string[]; linkIds: string[]; cost: number };

/** Dijkstra shortest route; larger relationship weights represent lower cost. */
export function findWeightedPath(data: GraphData, sourceId: string, targetId: string): GraphRoute | null {
    const queue = new Set(data.nodes.map((node) => node.id)); const distance = new Map<string, number>([[sourceId, 0]]); const previous = new Map<string, GraphLink>();
    while (queue.size) { const current = [...queue].sort((a, b) => (distance.get(a) ?? Infinity) - (distance.get(b) ?? Infinity))[0]; if (!current || !Number.isFinite(distance.get(current))) break; queue.delete(current); if (current === targetId) break; for (const link of data.links.filter((item) => item.source === current)) { const cost = 1 / Math.max(link.weight ?? 1, 0.000001); const candidate = (distance.get(current) ?? Infinity) + cost; if (candidate < (distance.get(link.target) ?? Infinity)) { distance.set(link.target, candidate); previous.set(link.target, link); } } }
    if (!previous.has(targetId) && sourceId !== targetId) return null;
    const nodeIds = [targetId]; const linkIds: string[] = []; let current = targetId;
    while (current !== sourceId) { const link = previous.get(current)!; linkIds.unshift(link.id ?? `${link.source}__${link.target}`); current = link.source; nodeIds.unshift(current); }
    return { nodeIds, linkIds, cost: distance.get(targetId) ?? 0 };
}

/** Returns edge-disjoint shortest alternatives. */
export function findKShortestPaths(data: GraphData, sourceId: string, targetId: string, count = 3): GraphRoute[] {
    const routes: GraphRoute[] = []; let working = data;
    for (let index = 0; index < Math.max(1, count); index += 1) { const route = findWeightedPath(working, sourceId, targetId); if (!route) break; routes.push(route); const removed = new Set(route.linkIds); working = { ...working, links: working.links.filter((link) => !removed.has(link.id ?? `${link.source}__${link.target}`)) }; }
    return routes;
}
