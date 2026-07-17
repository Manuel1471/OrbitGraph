import { describe, expect, it } from "vitest";

import type {
    GraphData,
    GraphLink,
    GraphNode,
    JSONValue,
} from "../src/types";

describe("Graph types", () => {
    it("accepts JSON-compatible values in node data", () => {
        const node: GraphNode = {
            id: "manuel",
            label: "Manuel",
            type: "person",
            data: {
                name: "Manuel",
                age: 26,
                active: true,
                missingValue: null,
                skills: ["Java", "TypeScript", "Unity"],
                profile: {
                    city: "Monterrey",
                    social: {
                        github: "Manuel1471",
                    },
                },
            },
        };

        expect(node.data?.profile).toEqual({
            city: "Monterrey",
            social: {
                github: "Manuel1471",
            },
        });
    });

    it("accepts JSON-compatible values in link data", () => {
        const link: GraphLink = {
            id: "manuel-owns-monetra",
            source: "manuel",
            target: "monetra",
            type: "owns",
            weight: 1,
            data: {
                ownershipPercentage: 100,
                since: "2026-06-27",
                permissions: ["read", "write", "admin"],
                metadata: {
                    verified: true,
                    expiresAt: null,
                },
            },
        };

        expect(link.data?.ownershipPercentage).toBe(100);
        expect(link.data?.metadata).toEqual({
            verified: true,
            expiresAt: null,
        });
    });

    it("creates valid graph data with nested JSON", () => {
        const nestedValue: JSONValue = {
            organization: {
                name: "MBDN Studios",
                founders: ["Manuel", "Brandon", "Erick", "Daniel"],
            },
            enabled: true,
            score: 9.5,
            note: null,
        };

        const graph: GraphData = {
            nodes: [
                {
                    id: "mbdn",
                    label: "MBDN Studios",
                    type: "organization",
                    data: {
                        details: nestedValue,
                    },
                },
            ],
            links: [],
        };

        expect(graph.nodes[0].data?.details).toEqual(nestedValue);
    });
});