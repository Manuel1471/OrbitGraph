// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";

const harness = vi.hoisted(() => ({
    neighborhoodRequests: 0,
}));

vi.mock("three", () => {
    class Scene {
        background: unknown;
        add = vi.fn();
    }

    class Group {
        children: unknown[] = [];

        add = (object: unknown): void => {
            this.children.push(object);
        };
    }

    class PerspectiveCamera {
        aspect = 1;
        position = { set: vi.fn() };

        constructor(..._args: unknown[]) {}

        updateProjectionMatrix = vi.fn();
    }

    class WebGLRenderer {
        readonly domElement = document.createElement("canvas");

        constructor(..._args: unknown[]) {}

        setSize = vi.fn();
        setPixelRatio = vi.fn();
        render = vi.fn();
        dispose = vi.fn();
    }

    class Color {
        constructor(..._args: unknown[]) {}
    }

    class AmbientLight {
        constructor(..._args: unknown[]) {}
    }

    return {
        Scene,
        Group,
        PerspectiveCamera,
        WebGLRenderer,
        Color,
        AmbientLight,
    };
});

vi.mock("three/examples/jsm/controls/OrbitControls.js", () => ({
    OrbitControls: class {
        enabled = true;
        dampingFactor = 0;
        enableDamping = false;
        minDistance = 0;
        maxDistance = 0;

        constructor(..._args: unknown[]) {}

        update = vi.fn();
        dispose = vi.fn();
    },
}));

vi.mock("../src/GraphCamera", () => ({
    GraphCamera: class {
        constructor(..._args: unknown[]) {}
        reset = vi.fn();
        focusNode = vi.fn();
    },
}));

vi.mock("../src/GraphExplorer", () => ({
    GraphExplorer: class {
        private data = { nodes: [], links: [] };

        constructor(..._args: unknown[]) {}

        setData = (data: typeof this.data): void => {
            this.data = data;
        };

        updateData = (data: typeof this.data): void => {
            this.data = data;
        };

        reset = vi.fn();
        setInitialView = vi.fn();
        expandNode = vi.fn();
        collapseNode = vi.fn();
        showAll = vi.fn();
        focusPath = vi.fn(() => false);
        goBack = vi.fn(() => false);
        goForward = vi.fn(() => false);
        getHistoryState = vi.fn(() => ({
            canGoBack: false,
            canGoForward: false,
            index: 0,
            length: 1,
        }));
        getNodeExplorationState = vi.fn();
        getState = vi.fn(() => ({}));
        setState = vi.fn();
        getVisibleData = (): typeof this.data => this.data;
    },
}));

vi.mock("../src/GraphFilter", () => ({
    GraphFilter: class {
        search = vi.fn();
        toggleType = vi.fn();
        setTypes = vi.fn();
        setMinimumLinkWeight = vi.fn();
        clear = vi.fn();
        getState = vi.fn(() => ({
            searchQuery: "",
            selectedTypes: [],
            minimumLinkWeight: 0,
        }));
        setState = vi.fn();
        getVisibleData = <T>(data: T): T => data;
    },
}));

vi.mock("../src/GraphRenderer", () => ({
    GraphRenderer: class {
        constructor(..._args: unknown[]) {}
        addNode = vi.fn();
        addLink = vi.fn();
        clear = vi.fn();
        syncPositions = vi.fn();
    },
}));

vi.mock("../src/LinkParticleRenderer", () => ({
    LinkParticleRenderer: class {
        constructor(..._args: unknown[]) {}
        setLinks = vi.fn();
        clear = vi.fn();
        update = vi.fn();
        dispose = vi.fn();
    },
}));

vi.mock("../src/NodeLabelRenderer", () => ({
    NodeLabelRenderer: class {
        constructor(..._args: unknown[]) {}
        show = vi.fn();
        hide = vi.fn();
        updatePosition = vi.fn();
    },
}));

vi.mock("../src/GraphInteraction", () => ({
    GraphInteraction: class {
        constructor(..._args: unknown[]) {}
        dispose = vi.fn();
    },
}));

vi.mock("../src/PhysicsEngine", () => ({
    PhysicsEngine: class {
        start = vi.fn();
        stop = vi.fn();
        setLayout = vi.fn();
        startDrag = vi.fn();
        drag = vi.fn();
        endDrag = vi.fn();
        unpin = vi.fn();
    },
}));

import { createOrbitGraph } from "../src/OrbitGraph";

describe("OrbitGraph lazy loading", () => {
    beforeEach(() => {
        harness.neighborhoodRequests = 0;

        vi.stubGlobal(
            "ResizeObserver",
            class {
                observe(): void {}
                disconnect(): void {}
            },
        );
        vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1));
    });

    it("loads a root, merges a neighborhood page, and caches repeated requests", async () => {
        const loadingStates: string[] = [];

        const graph = createOrbitGraph(document.createElement("div"), {
            dataSource: {
                getNode: vi.fn(async (nodeId: string) => ({
                    id: nodeId,
                    label: "Design Team",
                })),
                getNeighborhood: vi.fn(async () => {
                    harness.neighborhoodRequests += 1;

                    return {
                        nodes: [{ id: "member-1", label: "Member 1" }],
                        links: [
                            {
                                id: "team-member-1",
                                source: "design-team",
                                target: "member-1",
                            },
                        ],
                        hasMore: false,
                        nextOffset: null,
                    };
                }),
            },
            onLoadingChange: ({ loading, operation }) => {
                loadingStates.push(`${loading}:${operation ?? "idle"}`);
            },
        });

        await graph.loadNode("design-team");

        const firstResult = await graph.loadNeighborhood("design-team", {
            direction: "outgoing",
            limit: 25,
        });
        const cachedResult = await graph.loadNeighborhood("design-team", {
            direction: "outgoing",
            limit: 25,
        });

        expect(firstResult?.nodes.map((node) => node.id)).toEqual(["member-1"]);
        expect(cachedResult).toBeNull();
        expect(harness.neighborhoodRequests).toBe(1);
        expect(graph.getLoadingState()).toEqual({
            loading: false,
            operation: null,
            nodeId: null,
        });
        expect(loadingStates).toEqual([
            "true:node",
            "false:idle",
            "true:neighborhood",
            "false:idle",
        ]);
    });
});