import { describe, expect, it, vi } from "vitest";

import { GraphViewSynchronizer } from "../src/GraphViewSynchronizer";

describe("GraphViewSynchronizer visual modules", () => {
    it("consolidates only parallel links while retaining every distinct relationship", () => {
        const nodes = Array.from({ length: 1_001 }, (_, index) => ({ id: `node-${index}`, label: `Node ${index}` }));
        const links = [
            ...Array.from({ length: 1_000 }, (_, index) => ({ id: `link-${index}`, source: `node-${index}`, target: `node-${(index + 1) % 1_000}`, weight: 1 })),
            { id: "parallel-a", source: "node-0", target: "node-1", weight: 0.5 },
            { id: "parallel-b", source: "node-0", target: "node-1", weight: 0.75 },
        ];
        const visible = { nodes, links };
        const synchronizer = new GraphViewSynchronizer(
            { getOrCreatePhysicsNode: vi.fn((node: typeof nodes[number]) => ({ ...node, x: 0, y: 0, z: 0 })) } as never,
            { getVisibleData: vi.fn(() => visible) } as never,
            { getVisibleData: vi.fn(() => visible), getMinimumLinkWeight: vi.fn(() => 0) } as never,
            { start: vi.fn(), stop: vi.fn(), setLayout: vi.fn(), unpin: vi.fn() } as never,
            { addNode: vi.fn(), addLink: vi.fn(), setVisibleNodeIds: vi.fn(), clear: vi.fn(), syncPositions: vi.fn() } as never,
            { setVisibleNodes: vi.fn(), hide: vi.fn(), updatePosition: vi.fn() } as never,
            { setLinks: vi.fn(), clear: vi.fn() } as never,
            { layout: "force", layoutOptions: {} },
        );

        const returned = synchronizer.refresh();
        expect(returned.links).toHaveLength(1_002);
        expect(synchronizer.getPhysicsLinks()).toHaveLength(1_000);
        expect(synchronizer.getPhysicsLinks().find((link) => link.id.startsWith("aggregate:"))?.graphLink.data).toMatchObject({ aggregateCount: 3, aggregateWeight: 2.25 });
    });

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
