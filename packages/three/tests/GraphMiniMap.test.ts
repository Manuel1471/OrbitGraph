// @vitest-environment jsdom

import * as THREE from "three";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GraphMiniMap } from "../src/GraphMiniMap";
import type { GraphCamera } from "../src/GraphCamera";
import type { PhysicsLink, PhysicsNode } from "../src/PhysicsEngine";

const canvasContext = {
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    strokeRect: vi.fn(),
    setTransform: vi.fn(),
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
};

const camera = {
    getTarget: vi.fn(() => new THREE.Vector3(0, 0, 0)),
    onChange: vi.fn(() => () => {}),
    focusPosition: vi.fn(),
};

describe("GraphMiniMap", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        document.body.innerHTML = '<div id="graph"></div>';
        Object.defineProperty(window, "devicePixelRatio", {
            configurable: true,
            value: 1,
        });
        vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
            canvasContext as unknown as CanvasRenderingContext2D,
        );
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("does not mount a canvas when disabled", () => {
        const container = document.querySelector<HTMLElement>("#graph")!;
        const miniMap = new GraphMiniMap(
            container,
            camera as unknown as GraphCamera,
            { enabled: false },
        );

        expect(container.querySelector("canvas")).toBeNull();
        miniMap.dispose();
    });

    it("draws graph positions and focuses the camera after an interactive click", () => {
        const container = document.querySelector<HTMLElement>("#graph")!;
        const miniMap = new GraphMiniMap(container, camera as unknown as GraphCamera, {
            enabled: true,
            interactive: true,
            width: 180,
            height: 120,
        });
        const nodes: PhysicsNode[] = [
            { id: "a", x: -10, y: 0, z: 0 },
            { id: "b", x: 10, y: 3, z: 1 },
        ];
        const links: PhysicsLink[] = [{
            id: "a-b",
            source: "a",
            target: "b",
            graphLink: { id: "a-b", source: "a", target: "b" },
        }];

        miniMap.update(nodes, links);

        const canvas = container.querySelector<HTMLCanvasElement>("canvas");
        if (!canvas) {
            throw new Error("Expected the mini-map canvas to be mounted.");
        }

        Object.defineProperty(canvas, "getBoundingClientRect", {
            value: () => ({
                x: 0,
                y: 0,
                top: 0,
                left: 0,
                right: 180,
                bottom: 120,
                width: 180,
                height: 120,
                toJSON: () => ({}),
            }),
        });

        canvas.dispatchEvent(
            new MouseEvent("pointerdown", {
                bubbles: true,
                clientX: 90,
                clientY: 60,
            }),
        );

        // Two node markers plus the current camera-target viewport indicator.
        expect(canvasContext.arc).toHaveBeenCalledTimes(3);
        expect(camera.focusPosition).toHaveBeenCalledWith(expect.any(THREE.Vector3));

        miniMap.dispose();
        expect(container.querySelector("canvas")).toBeNull();
    });
});