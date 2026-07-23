// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";

import type { GraphData } from "@orbitgraph/core";

const harness = vi.hoisted(() => ({
    rendererNodes: [] as string[][],
    rendererLinks: [] as string[][],
    physicsNodes: [] as string[][],
    physicsStops: 0,
}));

vi.mock("three", async (importOriginal) => {
    const actual = await importOriginal<typeof import("three")>();

    class WebGLRenderer {
        readonly domElement = document.createElement("canvas");

        setSize(): void {}
        setPixelRatio(): void {}
        render(): void {}
        dispose(): void {}
    }

    return { ...actual, WebGLRenderer };
});

vi.mock("three/examples/jsm/controls/OrbitControls.js", () => ({
    OrbitControls: class {
        enabled = true;
        enableDamping = false;
        dampingFactor = 0;
        minDistance = 0;
        maxDistance = 0;

        update(): void {}
        dispose(): void {}
    },
}));

vi.mock("../src/GraphRenderer", () => ({
    GraphRenderer: class {
        private nodeIds: string[] = [];
        private linkIds: string[] = [];

        addNode(node: { id: string }): void {
            this.nodeIds.push(node.id);
        }

        addLink(link: { id?: string }): void {
            this.linkIds.push(link.id ?? "unknown");
        }

        setKeyboardFocus(): void {}

        clear(): void {
            harness.rendererNodes.push([...this.nodeIds].sort());
            harness.rendererLinks.push([...this.linkIds].sort());
            this.nodeIds = [];
            this.linkIds = [];
        }

        syncPositions(): void {}
    },
}));

vi.mock("../src/PhysicsEngine", () => ({
    PhysicsEngine: class {
        start(nodes: Array<{ id: string }>): void {
            harness.physicsNodes.push(nodes.map((node) => node.id).sort());
        }

        stop(): void {
            harness.physicsStops += 1;
        }

        dispose(): void {
            this.stop();
        }

        setLayout(): void {}
        startDrag(): void {}
        drag(): void {}
        endDrag(): void {}
        unpin(): void {}
    },
}));

vi.mock("../src/GraphCamera", () => ({
    GraphCamera: class {
        update = vi.fn();
        focusNode = vi.fn();
        reset = vi.fn();
        dispose = vi.fn();
    },
}));

vi.mock("../src/GraphInteraction", () => ({
    GraphInteraction: class {
        dispose(): void {}
    },
}));

vi.mock("../src/NodeLabelRenderer", () => ({
    NodeLabelRenderer: class {
        show(): void {}
        hide(): void {}
        updatePosition(): void {}
    },
}));

vi.mock("../src/LinkParticleRenderer", () => ({
    LinkParticleRenderer: class {
        setLinks(): void {}
        clear(): void {}
        update(): void {}
        dispose(): void {}
    },
}));

vi.mock("../src/GraphKeyboardNavigation", () => ({
    GraphKeyboardNavigation: class {
        dispose(): void {}
    },
}));

import { createOrbitGraph } from "../src/OrbitGraph";

const data: GraphData = {
    nodes: [
        { id: "promoter", label: "Promoter", type: "promoter" },
        { id: "guest-a", label: "Guest A", type: "guest" },
        { id: "guest-b", label: "Guest B", type: "guest" },
        { id: "hidden", label: "Hidden Person", type: "guest" },
    ],
    links: [
        {
            id: "promoter-a",
            source: "promoter",
            target: "guest-a",
            type: "invited",
        },
        {
            id: "a-b",
            source: "guest-a",
            target: "guest-b",
            type: "invited",
        },
    ],
};

describe("OrbitGraph exploration integration", () => {
    beforeEach(() => {
        harness.rendererNodes = [];
        harness.rendererLinks = [];
        harness.physicsNodes = [];
        harness.physicsStops = 0;

        document.body.innerHTML = '<div id="graph"></div>';

        vi.stubGlobal(
            "ResizeObserver",
            class {
                observe(): void {}
                disconnect(): void {}
            },
        );

        vi.stubGlobal("requestAnimationFrame", () => 0);
        vi.stubGlobal("cancelAnimationFrame", () => {});
    });

    it("mounts only explored nodes, keeps hidden nodes out of physics, and resets correctly", () => {
        const visibleData = vi.fn();
        const container = document.querySelector<HTMLElement>("#graph");

        if (!container) {
            throw new Error("Test container was not found.");
        }

        const graph = createOrbitGraph(container, {
            initialView: { mode: "node", nodeId: "promoter" },
            onVisibleDataChange: visibleData,
        });

        graph.setData(data);

        expect(harness.physicsNodes.at(-1)).toEqual(["promoter"]);
        expect(visibleData).toHaveBeenLastCalledWith({
            nodes: [data.nodes[0]],
            links: [],
        });

        graph.expandNode("promoter", {
            direction: "outgoing",
            relationshipTypes: ["invited"],
        });

        expect(harness.physicsNodes.at(-1)).toEqual(["guest-a", "promoter"]);
        expect(
            visibleData.mock.calls
                .at(-1)?.[0]
                .nodes.map((node: { id: string }) => node.id)
                .sort(),
        ).toEqual(["guest-a", "promoter"]);

        // Search only filters the explored subset: it cannot reveal "hidden".
        graph.search("hidden");

        expect(visibleData.mock.calls.at(-1)?.[0]).toEqual({
            nodes: [],
            links: [],
        });
        expect(harness.physicsStops).toBeGreaterThan(0);

        graph.clearFilters();
        expect(harness.physicsNodes.at(-1)).toEqual(["guest-a", "promoter"]);

        graph.showAll();

        expect(harness.physicsNodes.at(-1)).toEqual([
            "guest-a",
            "guest-b",
            "hidden",
            "promoter",
        ]);

        // showAll is temporary; reset returns to the configured node initial view.
        graph.resetExploration();
        expect(harness.physicsNodes.at(-1)).toEqual(["promoter"]);

        graph.destroy();
    });
});