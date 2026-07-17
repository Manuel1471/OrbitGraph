import { describe, expect, it } from "vitest";

import { Graph } from "../src/Graph";
import type { GraphData } from "../src/types";

const createData = (): GraphData => ({
    nodes: [
        {
            id: "manuel",
            label: "Manuel",
            type: "person",
        },
        {
            id: "monetra",
            label: "Monetra",
            type: "project",
        },
        {
            id: "api",
            label: "API",
            type: "service",
        },
    ],
    links: [
        {
            id: "manuel-owns-monetra",
            source: "manuel",
            target: "monetra",
            type: "owns",
        },
        {
            id: "monetra-uses-api",
            source: "monetra",
            target: "api",
            type: "uses",
        },
    ],
});

describe("Graph", () => {
    it("loads nodes and links", () => {
        const graph = new Graph(createData());

        expect(graph.getNodes()).toHaveLength(3);
        expect(graph.getLinks()).toHaveLength(2);

        expect(graph.getNode("monetra")?.label).toBe("Monetra");
        expect(graph.getLink("monetra-uses-api")?.type).toBe("uses");
    });

    it("returns neighbors of a node", () => {
        const graph = new Graph(createData());

        expect(graph.getNeighbors("monetra").map((node) => node.id)).toEqual(
            expect.arrayContaining(["manuel", "api"]),
        );

        expect(graph.getNeighbors("monetra")).toHaveLength(2);
    });

    it("returns links associated with a node", () => {
        const graph = new Graph(createData());

        expect(graph.getNodeLinks("monetra").map((link) => link.id)).toEqual(
            expect.arrayContaining([
                "manuel-owns-monetra",
                "monetra-uses-api",
            ]),
        );
    });

    it("adds a node and a link", () => {
        const graph = new Graph(createData());

        graph.addNode({
            id: "postgres",
            label: "PostgreSQL",
            type: "database",
        });

        graph.addLink({
            id: "api-uses-postgres",
            source: "api",
            target: "postgres",
            type: "stores-data-in",
        });

        expect(graph.getNode("postgres")).toBeDefined();
        expect(graph.getLink("api-uses-postgres")).toBeDefined();

        expect(graph.getNeighbors("api").map((node) => node.id)).toEqual(
            expect.arrayContaining(["monetra", "postgres"]),
        );
    });

    it("throws when a link references a missing node", () => {
        const graph = new Graph(createData());

        expect(() => {
            graph.addLink({
                id: "invalid-link",
                source: "api",
                target: "missing-node",
            });
        }).toThrow('Cannot create link: "api" or "missing-node" does not exist.');
    });

    it("removes a link", () => {
        const graph = new Graph(createData());

        graph.removeLink("monetra-uses-api");

        expect(graph.getLink("monetra-uses-api")).toBeUndefined();
        expect(graph.getLinks()).toHaveLength(1);
        expect(graph.getNeighbors("api")).toHaveLength(0);
    });

    it("removes a node and all of its relations", () => {
        const graph = new Graph(createData());

        graph.removeNode("monetra");

        expect(graph.getNode("monetra")).toBeUndefined();

        expect(graph.getLink("manuel-owns-monetra")).toBeUndefined();
        expect(graph.getLink("monetra-uses-api")).toBeUndefined();

        expect(graph.getLinks()).toHaveLength(0);
        expect(graph.getNeighbors("manuel")).toHaveLength(0);
        expect(graph.getNeighbors("api")).toHaveLength(0);
    });

    it("exports the graph back to JSON data", () => {
        const graph = new Graph(createData());

        expect(graph.toJSON()).toEqual(createData());
    });
});