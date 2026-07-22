// @vitest-environment jsdom

import { createRef } from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { OrbitGraphHandle } from "../src/OrbitGraph";

const graph = vi.hoisted(() => ({
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
    })),
    destroy: vi.fn(),
}));

vi.mock("@orbitgraph/three", () => ({
    createOrbitGraph: vi.fn(() => graph),
}));

import { OrbitGraph } from "../src/OrbitGraph";

describe("OrbitGraph React ref", () => {
    afterEach(() => {
        document.body.innerHTML = "";
        vi.clearAllMocks();
    });

    it("forwards exploration, camera, and export actions to the graph instance", async () => {
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

        expect(graph.focusNode).toHaveBeenCalledWith("team");
        expect(graph.expandNode).toHaveBeenCalledWith("team", { depth: 2 });
        expect(graph.resetCamera).toHaveBeenCalledOnce();
        expect(graph.downloadJSON).toHaveBeenCalledWith({ scope: "visible" });

        await expect(ref.current?.exportPNG()).resolves.toBeInstanceOf(Blob);

        act(() => root.unmount());
    });
});