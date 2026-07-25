// @vitest-environment jsdom

import * as THREE from "three";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { NodeLabelRenderer } from "../src/NodeLabelRenderer";
import type { GraphNodeMap } from "../src/graph-types";

const canvasContext = {
    font: "",
    fillStyle: "",
    textBaseline: "" as CanvasTextBaseline,
    measureText: vi.fn(() => ({ width: 80 })),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
};

const createNodes = (): GraphNodeMap =>
    new Map([
        ["alpha", { id: "alpha", label: "Alpha", type: "team", x: 0, y: 0, z: 0 }],
        ["beta", { id: "beta", label: "Beta", type: "service", x: 10, y: 2, z: 0 }],
        ["gamma", { id: "gamma", label: "Gamma", x: -4, y: 1, z: 2 }],
    ]);

describe("NodeLabelRenderer", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
            canvasContext as unknown as CanvasRenderingContext2D,
        );
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("renders at most the configured number of persistent labels", () => {
        const scene = new THREE.Scene();
        const nodes = createNodes();
        const labels = new NodeLabelRenderer(scene, nodes);
        labels.setOptions({
            mode: "all",
            maxVisible: 2,
        });

        labels.setVisibleNodes([...nodes.values()]);

        expect(scene.children).toHaveLength(2);
        expect(canvasContext.fillText).toHaveBeenCalledTimes(2);

        labels.clear();
        expect(scene.children).toHaveLength(0);
    });

    it("shows important and selected nodes while retaining the hover label", () => {
        const scene = new THREE.Scene();
        const nodes = createNodes();
        const labels = new NodeLabelRenderer(scene, nodes);
        labels.setOptions({
            mode: "important",
            importantNodeIds: ["alpha"],
            showNodeType: true,
        });

        labels.setVisibleNodes([...nodes.values()]);
        labels.setSelectedNode({ id: "beta", label: "Beta", type: "service" });
        labels.show({ id: "gamma", label: "Gamma" });

        const labelsWithHover = scene.children.length;

        expect(labelsWithHover).toBeGreaterThanOrEqual(3);
        expect(canvasContext.fillText).toHaveBeenCalledWith(
            "team",
            expect.any(Number),
            expect.any(Number),
        );

        labels.hide();

        expect(scene.children).toHaveLength(labelsWithHover - 1);
        expect(canvasContext.fillText).toHaveBeenCalledWith("team", expect.any(Number), expect.any(Number));

        labels.hide();
        expect(scene.children).toHaveLength(3);

        labels.clear();
        expect(scene.children).toHaveLength(0);
    });
});