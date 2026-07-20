import { describe, expect, it } from "vitest";

import type { GraphData } from "@orbitgraph/core";
import { GraphExplorer } from "../src/GraphExplorer";

const data: GraphData = {
    nodes: [
        { id: "mayor", type: "official" },
        { id: "promoter-a", type: "promoter" },
        { id: "promoter-b", type: "promoter" },
        { id: "guest-a", type: "guest" },
        { id: "guest-b", type: "guest" },
        { id: "guest-c", type: "guest" },
    ],
    links: [
        { id: "mayor-invites-a", source: "mayor", target: "promoter-a", type: "invited" },
        { id: "a-invites-guest-a", source: "promoter-a", target: "guest-a", type: "invited" },
        { id: "a-knows-b", source: "promoter-a", target: "promoter-b", type: "knows" },
        { id: "b-invites-guest-b", source: "promoter-b", target: "guest-b", type: "invited" },
        { id: "guest-a-knows-c", source: "guest-a", target: "guest-c", type: "knows" },
    ],
};

function nodeIds(explorer: GraphExplorer): string[] {
    return explorer
        .getVisibleData()
        .nodes
        .map((node) => node.id)
        .sort();
}

function linkIds(explorer: GraphExplorer): string[] {
    return explorer
        .getVisibleData()
        .links
        .map((link) => link.id)
        .sort() as string[];
}

describe("GraphExplorer", () => {
    it("shows every node and link with the all initial view", () => {
        const explorer = new GraphExplorer({ mode: "all" });
        explorer.setData(data);

        expect(nodeIds(explorer)).toEqual([
            "guest-a",
            "guest-b",
            "guest-c",
            "mayor",
            "promoter-a",
            "promoter-b",
        ]);
        expect(linkIds(explorer)).toHaveLength(5);
    });

    it("shows exactly one node with the node initial view", () => {
        const explorer = new GraphExplorer({
            mode: "node",
            nodeId: "promoter-a",
        });
        explorer.setData(data);

        expect(nodeIds(explorer)).toEqual(["promoter-a"]);
        expect(linkIds(explorer)).toEqual([]);
    });

    it("shows a neighborhood at the requested depth and direction", () => {
        const explorer = new GraphExplorer({
            mode: "neighborhood",
            nodeId: "promoter-a",
            depth: 1,
            direction: "outgoing",
        });
        explorer.setData(data);

        expect(nodeIds(explorer)).toEqual([
            "guest-a",
            "promoter-a",
            "promoter-b",
        ]);
        expect(linkIds(explorer)).toEqual([
            "a-invites-guest-a",
            "a-knows-b",
        ]);
    });

    it("limits a type initial view", () => {
        const explorer = new GraphExplorer({
            mode: "type",
            nodeType: "promoter",
            maxNodes: 1,
        });
        explorer.setData(data);

        expect(nodeIds(explorer)).toEqual(["promoter-a"]);
    });

    it("expands a node using relationship type and direction", () => {
        const explorer = new GraphExplorer({
            mode: "node",
            nodeId: "promoter-a",
        });
        explorer.setData(data);

        explorer.expandNode("promoter-a", {
            direction: "outgoing",
            relationshipTypes: ["invited"],
        });

        expect(nodeIds(explorer)).toEqual(["guest-a", "promoter-a"]);
        expect(linkIds(explorer)).toEqual(["a-invites-guest-a"]);
    });

    it("expands multiple levels", () => {
        const explorer = new GraphExplorer({
            mode: "node",
            nodeId: "mayor",
        });
        explorer.setData(data);

        explorer.expandNode("mayor", {
            depth: 2,
            direction: "outgoing",
            relationshipTypes: ["invited"],
        });

        expect(nodeIds(explorer)).toEqual([
            "guest-a",
            "mayor",
            "promoter-a",
        ]);
    });

    it("collapses only the selected expansion", () => {
        const explorer = new GraphExplorer({
            mode: "node",
            nodeId: "promoter-a",
        });
        explorer.setData(data);

        explorer.expandNode("promoter-a");
        expect(nodeIds(explorer)).toContain("guest-a");

        explorer.collapseNode("promoter-a");
        expect(nodeIds(explorer)).toEqual(["promoter-a"]);
    });

    it("resets to its configured initial view and can show all data", () => {
        const explorer = new GraphExplorer({
            mode: "type",
            nodeType: "promoter",
        });
        explorer.setData(data);

        explorer.expandNode("promoter-a");
        expect(nodeIds(explorer)).toContain("guest-a");

        explorer.reset();
        expect(nodeIds(explorer)).toEqual(["promoter-a", "promoter-b"]);

        explorer.showAll();
        expect(nodeIds(explorer)).toHaveLength(data.nodes.length);
        expect(linkIds(explorer)).toHaveLength(data.links.length);
    });
});