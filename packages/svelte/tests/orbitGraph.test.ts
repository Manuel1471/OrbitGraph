// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
const first = vi.hoisted(() => ({ setData: vi.fn(), destroy: vi.fn(), focusNode: vi.fn() }));
const second = vi.hoisted(() => ({ setData: vi.fn(), destroy: vi.fn(), focusNode: vi.fn() }));
const create = vi.hoisted(() => vi.fn().mockReturnValueOnce(first).mockReturnValueOnce(second));
vi.mock("@orbitgraph/three", () => ({ createOrbitGraph: create }));
import { createOrbitGraphController, orbitGraph } from "../src";

describe("OrbitGraph Svelte bindings", () => {
    afterEach(() => { vi.clearAllMocks(); create.mockReset().mockReturnValueOnce(first).mockReturnValueOnce(second); });
    it("forwards events, exposes the full instance, reacts, recreates, and destroys", () => {
        const selection = vi.fn(), ready = vi.fn(), node = document.createElement("div"), options = { renderMode: "canvas" as const };
        const controller = createOrbitGraphController(node, { data: { nodes: [], links: [] }, options, onSelectionChange: selection, onReady: ready });
        expect(controller.graph).toBe(first); create.mock.calls[0][1].onSelectionChange({ nodeIds: [], linkIds: [] }); expect(selection).toHaveBeenCalledOnce();
        controller.update({ data: { nodes: [{ id: "a" }], links: [] }, options }); expect(first.setData).toHaveBeenLastCalledWith({ nodes: [{ id: "a" }], links: [] });
        controller.update({ data: { nodes: [], links: [] }, options: { renderMode: "webgl" } }); expect(first.destroy).toHaveBeenCalledOnce(); expect(controller.graph).toBe(second);
        controller.destroy(); expect(second.destroy).toHaveBeenCalledOnce();
    });
    it("provides an action lifecycle", () => { const action = orbitGraph(document.createElement("div"), { data: { nodes: [], links: [] } }); action.destroy(); expect(first.destroy).toHaveBeenCalledOnce(); });
});
