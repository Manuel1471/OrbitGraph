// @vitest-environment jsdom
import { createApp, h, nextTick, ref } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";
const graph = vi.hoisted(() => ({ setData: vi.fn(), destroy: vi.fn(), focusNode: vi.fn() }));
const create = vi.hoisted(() => vi.fn((_host: unknown, _options: Record<string, unknown>) => graph));
vi.mock("@orbitgraph/three", () => ({ createOrbitGraph: create }));
import { OrbitGraph, type OrbitGraphVueExposed } from "../src";

describe("OrbitGraph Vue wrapper", () => {
    afterEach(() => { document.body.innerHTML = ""; vi.clearAllMocks(); });
    it("mounts, emits the complete callback surface, updates data, and exposes the instance", async () => {
        const host = document.createElement("div"), component = ref<OrbitGraphVueExposed>(), events: string[] = [];
        const data = ref({ nodes: [{ id: "a" }], links: [] });
        const app = createApp({ setup: () => () => h(OrbitGraph, { ref: component, data: data.value, onReady: () => events.push("ready"), onSelectionChange: () => events.push("selection") }) });
        app.mount(host); await nextTick(); expect(events).toContain("ready"); expect(component.value?.getGraph()).toBe(graph);
        (create.mock.calls[0]![1].onSelectionChange as (value: unknown) => void)({ nodeIds: [], linkIds: [] }); expect(events).toContain("selection");
        data.value = { nodes: [{ id: "b" }], links: [] }; await nextTick(); expect(graph.setData).toHaveBeenLastCalledWith(data.value);
        app.unmount(); expect(graph.destroy).toHaveBeenCalledOnce();
    });
});
