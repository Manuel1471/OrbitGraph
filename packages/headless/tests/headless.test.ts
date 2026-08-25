import { describe, expect, it } from "vitest";
import { analyzeGraph, HeadlessOrbitGraph, layoutGraph, renderGraphPDF, renderGraphSVG } from "../src";
const data = { nodes: [{ id: "a" }, { id: "b" }], links: [{ source: "a", target: "b" }] };
describe("headless runtime", () => {
    it("runs layouts, analytics and SVG without DOM", () => { expect(layoutGraph(data)).toHaveLength(2); expect(renderGraphSVG(data)).toContain("<circle"); expect(analyzeGraph(data).degree.a.degree).toBe(1); });
    it("creates a PDF byte stream in Node", async () => expect((await renderGraphPDF(data)).byteLength).toBeGreaterThan(100));
    it("provides validated editing, history, selection, diff and routing without DOM", () => {
        const graph = new HeadlessOrbitGraph(data); expect(graph.findWeightedPath("a", "b")?.nodeIds).toEqual(["a", "b"]);
        graph.applyOperations([{ type: "add-node", node: { id: "c" } }]); expect(graph.getNode("c")?.id).toBe("c");
        expect(graph.selectNodes(["a", "missing"])).toEqual(["a"]); expect(graph.compare(data).nodes.removed).toHaveLength(1);
        expect(graph.undo()).toBe(true); expect(graph.getNode("c")).toBeUndefined(); expect(graph.redo()).toBe(true);
        expect(graph.exportJSON()).toContain('"c"'); expect(graph.exportSVG()).toContain("<svg");
    });
});
