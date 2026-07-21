// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";

import { GraphExporter } from "../src/GraphExporter";

describe("GraphExporter", () => {
    it("exports complete or visible graph data as JSON", () => {
        const exporter = new GraphExporter({
            canvas: document.createElement("canvas"),
            render: vi.fn(),
            getData: () => ({
                nodes: [{ id: "all" }],
                links: [],
            }),
            getVisibleData: () => ({
                nodes: [{ id: "visible" }],
                links: [],
            }),
        });

        expect(JSON.parse(exporter.exportJSON())).toEqual({
            nodes: [{ id: "all" }],
            links: [],
        });

        expect(
            JSON.parse(exporter.exportJSON({ scope: "visible", pretty: false })),
        ).toEqual({
            nodes: [{ id: "visible" }],
            links: [],
        });
    });

    it("renders the current canvas before exporting PNG", async () => {
        const canvas = document.createElement("canvas");
        const render = vi.fn();

        Object.defineProperty(canvas, "toBlob", {
            value: (callback: BlobCallback) => {
                callback(new Blob(["png"], { type: "image/png" }));
            },
        });

        const exporter = new GraphExporter({
            canvas,
            render,
            getData: () => ({ nodes: [], links: [] }),
            getVisibleData: () => ({ nodes: [], links: [] }),
        });

        await expect(exporter.exportPNG()).resolves.toMatchObject({
            type: "image/png",
        });
        expect(render).toHaveBeenCalledOnce();
    });
});