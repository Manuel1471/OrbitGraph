import { afterEach, describe, expect, it, vi } from "vitest";

import {
    PhysicsEngine,
    type PhysicsLink,
    type PhysicsNode,
} from "../src/PhysicsEngine";

const node = (id: string): PhysicsNode => ({
    id,
    x: 0,
    y: 0,
    z: 0,
});

describe("PhysicsEngine", () => {
    let physics: PhysicsEngine;

    afterEach(() => {
        physics?.stop();
    });

    it("starts and stops", () => {
        physics = new PhysicsEngine();

        expect(() => {
            physics.start([node("a")], [], vi.fn());
            physics.stop();
        }).not.toThrow();
    });

    it("fixes and unpins dragged nodes", () => {
        physics = new PhysicsEngine();

        const manuel = node("manuel");

        physics.start([manuel], [], vi.fn());
        physics.startDrag(manuel);
        physics.drag(manuel, 10, 20, 30);

        expect(manuel.fx).toBe(10);
        expect(manuel.fy).toBe(20);
        expect(manuel.fz).toBe(30);

        physics.unpin(manuel);

        expect(manuel.fx).toBeNull();
        expect(manuel.fy).toBeNull();
        expect(manuel.fz).toBeNull();
    });

    it("adds and removes links", () => {
        physics = new PhysicsEngine();

        const source = node("source");
        const target = node("target");

        const link: PhysicsLink = {
            id: "source-target",
            source: "source",
            target: "target",
            graphLink: {
                id: "source-target",
                source: "source",
                target: "target",
            },
        };

        expect(() => {
            physics.start([source, target], [], vi.fn());
            physics.addLink(link);
            physics.removeLink("source-target");
        }).not.toThrow();
    });
});