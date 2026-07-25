// @vitest-environment jsdom

import { createRef } from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { OrbitGraphHandle } from "../src/OrbitGraph";

const graph = vi.hoisted(() => {
    const analytics = { degree: vi.fn() };
    const presentation = { clearNodeStyles: vi.fn() };

    return {
        analytics,
        presentation,
        setData: vi.fn(),
        resetCamera: vi.fn(),
        focusNode: vi.fn(),
        expandNode: vi.fn(),
        collapseNode: vi.fn(),
        resetExploration: vi.fn(),
        showAll: vi.fn(),
        setInitialView: vi.fn(),
        exportPNG: vi.fn(() => Promise.resolve(new Blob(["png"]))),
        downloadPNG: vi.fn(() => Promise.resolve()),
        exportJSON: vi.fn(() => '{"nodes":[],"links":[]}'),
        downloadJSON: vi.fn(),
        getLoadingState: vi.fn(() => ({
            loading: false,
            operation: null,
            nodeId: null,
            error: null,
        })),
        loadNode: vi.fn(async (nodeId: string) => ({ id: nodeId })),
        loadNeighborhood: vi.fn(async () => null),
        getAnalytics: vi.fn(() => analytics),
        getPresentation: vi.fn(() => presentation),
        destroy: vi.fn(),
    };
});

vi.mock("@orbitgraph/three", () => ({
    createOrbitGraph: vi.fn(() => graph),
}));

import { OrbitGraph } from "../src/OrbitGraph";

describe("OrbitGraph React ref", () => {
    afterEach(() => {
        document.body.innerHTML = "";
        vi.clearAllMocks();
    });

    it("forwards graph actions, remote loading, and helper controllers", async () => {
        const host = document.createElement("div");
        const root = createRoot(host);
        const ref = createRef<OrbitGraphHandle>();

        await act(async () => {
            root.render(<OrbitGraph ref={ref} data={{ nodes: [], links: [] }} />);
        });

        act(() => {
            ref.current?.focusNode("team");
            ref.current?.expandNode("team", { depth: 2 });
            ref.current?.resetCamera();
            ref.current?.downloadJSON({ scope: "visible" });
        });

        await expect(ref.current?.exportPNG()).resolves.toBeInstanceOf(Blob);
        await expect(ref.current?.loadNode("team")).resolves.toEqual({ id: "team" });
        await ref.current?.loadNeighborhood("team", { depth: 1 });

        expect(graph.focusNode).toHaveBeenCalledWith("team");
        expect(graph.expandNode).toHaveBeenCalledWith("team", { depth: 2 });
        expect(graph.resetCamera).toHaveBeenCalledOnce();
        expect(graph.downloadJSON).toHaveBeenCalledWith({ scope: "visible" });
        expect(graph.loadNeighborhood).toHaveBeenCalledWith("team", { depth: 1 });
        expect(ref.current?.getAnalytics()).toBe(graph.analytics);
        expect(ref.current?.getPresentation()).toBe(graph.presentation);

        act(() => root.unmount());
        expect(graph.destroy).toHaveBeenCalledOnce();
    });
});