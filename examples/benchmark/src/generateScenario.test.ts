import { describe, expect, it } from "vitest";
import { generateScenario } from "./generateScenario";

describe("benchmark scenario worker payload", () => {
    it("generates deterministic nodes, valid links, and a final progress event", async () => {
        const progress: number[] = []; const data = await generateScenario(20, 41, { onProgress: (value) => progress.push(value) });
        expect(data?.nodes).toHaveLength(20); expect(data?.links).toHaveLength(38);
        expect(data?.nodes[0]).toMatchObject({ type: "group-0", color: "#22d3ee", data: { time: 0, tier: "hub" } });
        expect(data?.links.every((link) => data.nodes.some((node) => node.id === link.source) && data.nodes.some((node) => node.id === link.target))).toBe(true);
        expect(progress.at(-1)).toBe(100);
    });
    it("stops when cancellation is requested", async () => {
        expect(await generateScenario(1_000, 41, { isCancelled: () => true })).toBeNull();
    });
    it("uses a stable seed so layout comparisons receive identical data", async () => {
        expect(await generateScenario(25, 41)).toEqual(await generateScenario(25, 41));
    });
});
