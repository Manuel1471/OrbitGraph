import { describe, expect, it } from "vitest";

import {
    calculateBetweennessCentrality,
    calculateDegreeMetrics,
    calculatePageRank,
} from "../src/GraphAnalytics";
import type { GraphData } from "../src/types";

const chain: GraphData = {
    nodes: [
        { id: "a" },
        { id: "b" },
        { id: "c" },
        { id: "d" },
    ],
    links: [
        { source: "a", target: "b", weight: 1 },
        { source: "b", target: "c", weight: 2 },
        { source: "c", target: "d", weight: 1 },
    ],
};

describe("GraphAnalytics", () => {
    it("calculates directed and weighted degree metrics", () => {
        const metrics = calculateDegreeMetrics(chain);

        expect(metrics.a).toMatchObject({
            degree: 1,
            inDegree: 0,
            outDegree: 1,
            weightedDegree: 1,
        });
        expect(metrics.b).toMatchObject({
            degree: 2,
            inDegree: 1,
            outDegree: 1,
            weightedDegree: 3,
        });
        expect(metrics.d).toMatchObject({
            degree: 1,
            inDegree: 1,
            outDegree: 0,
        });
    });

    it("ranks downstream nodes with PageRank", () => {
        const result = calculatePageRank(chain);

        expect(result.converged).toBe(true);
        expect(result.scores.d).toBeGreaterThan(result.scores.a);
    });

    it("identifies bridge nodes with betweenness centrality", () => {
        const scores = calculateBetweennessCentrality(chain);

        expect(scores.b).toBeGreaterThan(scores.a);
        expect(scores.c).toBeGreaterThan(scores.d);
    });
});