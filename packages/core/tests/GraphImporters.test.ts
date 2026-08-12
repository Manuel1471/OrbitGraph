import { describe, expect, it } from "vitest";
import { importCSVLinks, importCSVNodes, importJSONLD } from "../src/GraphImporters";

describe("GraphImporters", () => {
    it("preserves extra CSV columns as metadata", () => {
        expect(importCSVNodes("id,label,team\na,API,platform")).toEqual([{ id: "a", label: "API", data: { team: "platform" } }]);
        expect(importCSVLinks("source,target,weight\na,b,0.7")).toEqual([{ source: "a", target: "b", weight: 0.7, data: {} }]);
    });

    it("converts JSON-LD IRI references into relationships", () => {
        const graph = importJSONLD([{ "@id": "a", knows: "b" }, { "@id": "b", name: "B" }]);
        expect(graph.links).toEqual([{ id: "a:knows:b", source: "a", target: "b", type: "knows" }]);
    });
});
