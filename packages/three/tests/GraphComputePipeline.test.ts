import { describe, expect, it } from "vitest";
import { computePackedGraph, packGraph } from "../src/GraphComputePipeline";
describe("GraphComputePipeline", () => {
    it("packs graph objects into transferable typed arrays", () => { const packed = packGraph({ nodes: [{ id: "a", type: "one" }, { id: "b", type: "two" }], links: [{ source: "a", target: "b", weight: .5 }] }); expect(packed.edges).toEqual(new Uint32Array([0, 1])); expect(packed.weights[0]).toBe(.5); });
    it("computes deterministic layouts and clusters without DOM", () => { const result = computePackedGraph(packGraph({ nodes: [{ id: "a", type: "one" }, { id: "b", type: "two" }], links: [] }), "radial"); expect(result.positions.every(Number.isFinite)).toBe(true); expect(result.clusters).toEqual(new Uint32Array([0, 1])); });
});
