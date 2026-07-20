import { describe, expect, it } from "vitest";

import type { GraphData } from "@orbitgraph/core";

import { GraphExplorer } from "../src/GraphExplorer";

const initialData: GraphData = {
    nodes: [
        { id: "root", label: "Root" },
        { id: "first", label: "First" },
    ],
    links: [
        { id: "root-first", source: "root", target: "first" },
    ],
};

describe("GraphExplorer state", () => {
    it("restores the current exploration without restoring old history", () => {
        const explorer = new GraphExplorer({ mode: "node", nodeId: "root" });
        explorer.setData(initialData);
        explorer.expandNode("root", { direction: "outgoing", limit: 1 });

        const state = explorer.getState();
        const restoredExplorer = new GraphExplorer();

        restoredExplorer.setData(initialData);
        restoredExplorer.setState(state);

        expect(
            restoredExplorer.getVisibleData().nodes.map((node) => node.id),
        ).toEqual(["root", "first"]);
        expect(restoredExplorer.getHistoryState()).toEqual({
            canGoBack: false,
            canGoForward: false,
            index: 0,
            length: 1,
        });
    });

    it("keeps active exploration while source data is incrementally updated", () => {
        const explorer = new GraphExplorer({ mode: "node", nodeId: "root" });
        explorer.setData({ nodes: [{ id: "root" }], links: [] });
        explorer.expandNode("root", { direction: "outgoing" });

        explorer.updateData(initialData);

        expect(
            explorer.getVisibleData().nodes.map((node) => node.id),
        ).toEqual(["root", "first"]);
    });
});