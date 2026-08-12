import { describe, expect, it } from "vitest";
import { aggregateClusters, diffGraphs, findKShortestPaths, findWeightedPath } from "../src";

const graph = { nodes: [{ id: "a" }, { id: "b" }, { id: "c" }], links: [{ id: "ab", source: "a", target: "b", weight: 1 }, { id: "bc", source: "b", target: "c", weight: 1 }, { id: "ac", source: "a", target: "c", weight: 0.2 }] };
describe("v1.4 graph utilities", () => {
    it("diffs snapshots", () => expect(diffGraphs(graph, { ...graph, nodes: [...graph.nodes, { id: "d" }] }).nodes.added).toEqual([{ id: "d" }]));
    it("finds weighted routes and alternatives", () => { expect(findWeightedPath(graph, "a", "c")?.nodeIds).toEqual(["a", "b", "c"]); expect(findKShortestPaths(graph, "a", "c", 2)).toHaveLength(2); });
    it("replaces collapsed community members with an aggregate node", () => { const result = aggregateClusters(graph, [{ id: "one", label: "One", nodeIds: ["a", "b"], linkIds: ["ab"], collapsed: true }]); expect(result.nodes.find((node) => node.id === "cluster:one")).toMatchObject({ memberCount: 2 }); });
});
