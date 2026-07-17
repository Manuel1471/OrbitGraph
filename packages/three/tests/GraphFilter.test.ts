import { describe, expect, it } from "vitest";

import { GraphFilter } from "../src/GraphFilter";

const data = {
    nodes: [
        { id: "manuel", label: "Manuel", type: "person" },
        { id: "api", label: "API", type: "service" },
        { id: "postgres", label: "PostgreSQL", type: "database" },
    ],
    links: [
        { id: "manuel-api", source: "manuel", target: "api", weight: 0.4 },
        { id: "api-postgres", source: "api", target: "postgres", weight: 0.9 },
    ],
};

describe("GraphFilter", () => {
    it("shows all data by default", () => {
        const result = new GraphFilter().getVisibleData(data);

        expect(result.nodes).toHaveLength(3);
        expect(result.links).toHaveLength(2);
    });

    it("searches by label", () => {
        const filter = new GraphFilter();

        filter.search("post");

        expect(filter.getVisibleData(data).nodes.map((node) => node.id)).toEqual([
            "postgres",
        ]);
    });

    it("filters multiple node types", () => {
        const filter = new GraphFilter();

        filter.setTypes(["service", "database"]);

        const result = filter.getVisibleData(data);

        expect(result.nodes.map((node) => node.id)).toEqual([
            "api",
            "postgres",
        ]);

        expect(result.links.map((link) => link.id)).toEqual([
            "api-postgres",
        ]);
    });

    it("filters weak links", () => {
        const filter = new GraphFilter();

        filter.setMinimumLinkWeight(0.8);

        expect(filter.getVisibleData(data).links.map((link) => link.id)).toEqual([
            "api-postgres",
        ]);
    });

    it("clears filters", () => {
        const filter = new GraphFilter();

        filter.search("api");
        filter.setTypes(["service"]);
        filter.setMinimumLinkWeight(1);

        filter.clear();

        expect(filter.getVisibleData(data)).toEqual(data);
    });
});