import { describe, expect, it } from "vitest";
import { GraphCollaborationStore } from "../src/GraphCollaboration";

const view = { version: 1 as const, exploration: { initialView: { mode: "all" as const }, activeView: { mode: "all" as const }, expansions: [], path: null }, filters: { searchQuery: "", selectedTypes: [], minimumLinkWeight: 0 }, layout: "force" as const, layoutOptions: {} };

describe("GraphCollaborationStore", () => {
    it("exports annotations and immutable bookmark view snapshots", () => {
        const store = new GraphCollaborationStore();
        store.upsertAnnotation({ id: "note", target: { kind: "node", nodeId: "api" }, body: "Review", createdAt: "2026-01-01T00:00:00.000Z" });
        store.createBookmark("review", "Review", view);
        view.filters.searchQuery = "mutated";
        expect(store.export().annotations).toHaveLength(1);
        expect(store.getBookmarks()[0].view.filters.searchQuery).toBe("");
    });
});
