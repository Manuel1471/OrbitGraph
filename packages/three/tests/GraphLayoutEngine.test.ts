import { describe, expect, it } from "vitest";

import type { GraphLink } from "@orbitgraph/core";

import { GraphLayoutEngine } from "../src/GraphLayoutEngine";
import type { PhysicsNode } from "../src/PhysicsEngine";

const nodes: PhysicsNode[] = [
    { id: "root", x: 0, y: 0, z: 0 },
    { id: "a", x: 0, y: 0, z: 0 },
    { id: "b", x: 0, y: 0, z: 0 },
    { id: "c", x: 0, y: 0, z: 0 },
];

const links: GraphLink[] = [
    { id: "root-a", source: "root", target: "a" },
    { id: "root-b", source: "root", target: "b" },
    { id: "a-c", source: "a", target: "c" },
];

describe("GraphLayoutEngine", () => {
    const engine = new GraphLayoutEngine();

    it("places radial nodes at an equal distance from the center", () => {
        const positions = engine.getPositions(nodes, links, "radial", {
            spacing: 10,
        });
        const distances = [...positions.values()].map((position) =>
            Math.hypot(position.x, position.y),
        );

        expect(positions.size).toBe(nodes.length);
        expect(new Set(distances.map((distance) => distance.toFixed(6))).size).toBe(1);
    });

    it("places every grid node at a unique position", () => {
        const positions = engine.getPositions(nodes, links, "grid", {
            spacing: 10,
        });
        const uniquePositions = new Set(
            [...positions.values()].map((position) => `${position.x}:${position.y}:${position.z}`),
        );

        expect(uniquePositions.size).toBe(nodes.length);
    });

    it("places hierarchical descendants on later layers", () => {
        const positions = engine.getPositions(nodes, links, "hierarchical", {
            rootId: "root",
            direction: "outgoing",
        });

        expect(positions.get("a")!.z).toBeGreaterThan(positions.get("root")!.z);
        expect(positions.get("c")!.z).toBeGreaterThan(positions.get("a")!.z);
    });

    it("returns no target positions for the force layout", () => {
        expect(engine.getPositions(nodes, links, "force")).toEqual(new Map());
    });
});