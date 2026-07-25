import { describe, expect, it, vi } from "vitest";

import { GraphViewSynchronizer } from "../src/GraphViewSynchronizer";

describe("GraphViewSynchronizer visual modules", () => {
    it("keeps renderer visibility, persistent labels, and mini-map data in sync", () => {
        const visible = {
            nodes: [
                { id: "team", label: "Team", type: "group" },
                { id: "api", label: "API", type: "service" },
            ],
            links: [{ id: "team-api", source: "team", target: "api" }],
        };

        const physicsNodes = visible.nodes.map((node, index) => ({
            ...node,
            x: index * 10,
            y: 0,
            z: 0,
        }));

        const dataStore = {
            getOrCreatePhysicsNode: vi.fn((node, index) => physicsNodes[index]),
        };
        const explorer = { getVisibleData: vi.fn(() => visible) };
        const filter = {
            getVisibleData: vi.fn(() => visible),
            getMinimumLinkWeight: vi.fn(() => 0.2),
        };
        const physics = {
            start: vi.fn((_: unknown, __: unknown, onTick: () => void) => onTick()),
            stop: vi.fn(),
            setLayout: vi.fn(),
            unpin: vi.fn(),
        };
        const renderer = {
            addNode: vi.fn(),
            addLink: vi.fn(),
            setVisibleNodeIds: vi.fn(),
            clear: vi.fn(),
            syncPositions: vi.fn(),
        };
        const labels = {
            setVisibleNodes: vi.fn(),
            hide: vi.fn(),
            updatePosition: vi.fn(),
        };
        const particles = { setLinks: vi.fn(), clear: vi.fn() };
        const onGraphPositionChange = vi.fn();

        const synchronizer = new GraphViewSynchronizer(
            dataStore as never,
            explorer as never,
            filter as never,
            physics as never,
            renderer as never,
            labels as never,
            particles as never,
            {
                layout: "force",
                layoutOptions: {},
                onGraphPositionChange,
            },
        );

        synchronizer.refresh();

        expect(renderer.setVisibleNodeIds).toHaveBeenCalledWith(
            new Set(["team", "api"]),
            0.2,
        );
        expect(labels.setVisibleNodes).toHaveBeenLastCalledWith(visible.nodes);
        expect(onGraphPositionChange).toHaveBeenLastCalledWith(
            physicsNodes,
            expect.arrayContaining([
                expect.objectContaining({ id: "team-api" }),
            ]),
        );
    });
});