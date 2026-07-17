// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import * as THREE from "three";

import { createOrbitGraph } from "../src/OrbitGraph";

vi.mock("three", async () => {
    const actual = await vi.importActual<typeof THREE>("three");

    class WebGLRendererMock {
        domElement = document.createElement("canvas");
        setSize = vi.fn();
        setPixelRatio = vi.fn();
        render = vi.fn();
        dispose = vi.fn();
    }

    return {
        ...actual,
        WebGLRenderer: WebGLRendererMock,
    };
});

describe("OrbitGraph integration", () => {
    beforeEach(() => {
        document.body.innerHTML = `<div id="graph"></div>`;
    });

    it("loads data and emits visible data", () => {
        const container = document.querySelector<HTMLElement>("#graph")!;
        const onVisibleDataChange = vi.fn();

        const graph = createOrbitGraph(container, {
            onVisibleDataChange,
        });

        graph.setData({
            nodes: [
                { id: "manuel", type: "person" },
                { id: "api", type: "service" },
            ],
            links: [
                {
                    id: "manuel-api",
                    source: "manuel",
                    target: "api",
                    weight: 1,
                },
            ],
        });

        expect(onVisibleDataChange).toHaveBeenLastCalledWith(
            expect.objectContaining({
                nodes: expect.arrayContaining([
                    expect.objectContaining({ id: "manuel" }),
                    expect.objectContaining({ id: "api" }),
                ]),
            }),
        );

        graph.destroy();
    });
});