import { describe, expect, it } from "vitest";
import { calculateCoreNumbers, calculateNodeSimilarity, detectDegreeAnomalies, findConnectedComponents } from "../src/GraphAdvancedAnalytics";
const data = { nodes: [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }], links: [{ source: "a", target: "b" }, { source: "b", target: "c" }] };
describe("advanced analytics", () => { it("finds components and cores", () => { expect(findConnectedComponents(data).map((x) => x.length)).toEqual([3, 1]); expect(calculateCoreNumbers(data).a).toBe(1); }); it("calculates similarity and anomalies", () => { expect(calculateNodeSimilarity(data, "a", "c")).toBe(1); expect(detectDegreeAnomalies(data, 1)).toContain("b"); }); });
