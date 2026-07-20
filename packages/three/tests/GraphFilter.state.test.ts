import { describe, expect, it } from "vitest";

import { GraphFilter } from "../src/GraphFilter";

describe("GraphFilter state", () => {
    it("exports and restores search, type, and minimum-weight filters", () => {
        const filter = new GraphFilter();

        filter.search("  Service API ");
        filter.setTypes(["service", "team"]);
        filter.setMinimumLinkWeight(0.72);

        const state = filter.getState();

        expect(state).toEqual({
            searchQuery: "service api",
            selectedTypes: ["service", "team"],
            minimumLinkWeight: 0.72,
        });

        const restoredFilter = new GraphFilter();
        restoredFilter.setState(state);

        expect(restoredFilter.getState()).toEqual(state);
    });
});