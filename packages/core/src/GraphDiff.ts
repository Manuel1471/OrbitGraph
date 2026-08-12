import type { GraphData, GraphDiff, GraphLink, GraphNode } from "./types";

/** Compares two snapshots by id, including metadata and visual fields. */
export function diffGraphs(before: GraphData, after: GraphData): GraphDiff {
    return { nodes: diffById(before.nodes, after.nodes), links: diffById(before.links, after.links) };
}

function diffById<T extends GraphNode | GraphLink>(before: T[], after: T[]) {
    const beforeById = new Map(before.map((item, index) => [idOf(item, index), item]));
    const afterById = new Map(after.map((item, index) => [idOf(item, index), item]));
    return {
        added: after.filter((item, index) => !beforeById.has(idOf(item, index))),
        removed: before.filter((item, index) => !afterById.has(idOf(item, index))),
        changed: after.flatMap((item, index) => { const previous = beforeById.get(idOf(item, index)); return previous && JSON.stringify(previous) !== JSON.stringify(item) ? [{ before: previous, after: item }] : []; }),
    };
}
function idOf(item: GraphNode | GraphLink, index: number): string { return "id" in item && item.id ? item.id : "source" in item ? `${item.source}:${item.type ?? ""}:${item.target}:${index}` : `node:${index}`; }
