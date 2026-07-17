import * as THREE from "three";
import { describe, expect, it } from "vitest";

import { GraphRenderer } from "../src/GraphRenderer";
import type {
    GraphLinkArrowMap,
    GraphLinkLineMap,
    GraphNodeMap,
    GraphNodeMeshMap,
} from "../src/graph-types";

const createRenderer = () => {
    const group = new THREE.Group();

    const nodes: GraphNodeMap = new Map();
    const nodeMeshes: GraphNodeMeshMap = new Map();
    const linkLines: GraphLinkLineMap = new Map();
    const linkArrows: GraphLinkArrowMap = new Map();

    const renderer = new GraphRenderer(
        group,
        nodeMeshes,
        linkLines,
        linkArrows,
        nodes,
        {
            nodeColor: "#22d3ee",
            nodeSize: 0.65,
            linkColor: "#6366f1",
            linkOpacity: 0.55,
        },
    );

    return { renderer, nodes, nodeMeshes, linkLines, linkArrows };
};

describe("GraphRenderer", () => {
    it("creates and removes a node mesh", () => {
        const { renderer, nodeMeshes } = createRenderer();

        renderer.addNode({ id: "manuel", x: 1, y: 2, z: 3 });

        expect(nodeMeshes.has("manuel")).toBe(true);

        renderer.removeNode("manuel");

        expect(nodeMeshes.has("manuel")).toBe(false);
    });

    it("creates a line and an arrow for a relation", () => {
        const { renderer, linkLines, linkArrows } = createRenderer();

        renderer.addNode({ id: "api", x: 0, y: 0, z: 0 });
        renderer.addNode({ id: "db", x: 10, y: 0, z: 0 });

        renderer.addLink({
            id: "api-db",
            source: "api",
            target: "db",
            type: "stores-data-in",
        });

        expect(linkLines.has("api-db")).toBe(true);
        expect(linkArrows.has("api-db")).toBe(true);
    });

    it("hides nodes and links outside visible IDs", () => {
        const { renderer, nodeMeshes, linkLines } = createRenderer();

        renderer.addNode({ id: "api", x: 0, y: 0, z: 0 });
        renderer.addNode({ id: "db", x: 10, y: 0, z: 0 });

        renderer.addLink({
            id: "api-db",
            source: "api",
            target: "db",
            weight: 0.8,
        });

        renderer.setVisibleNodeIds(new Set(["api"]), 0);

        expect(nodeMeshes.get("api")?.visible).toBe(true);
        expect(nodeMeshes.get("db")?.visible).toBe(false);
        expect(linkLines.get("api-db")?.visible).toBe(false);
    });
});