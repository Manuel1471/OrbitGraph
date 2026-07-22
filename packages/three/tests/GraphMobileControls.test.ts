// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";

import { GraphMobileControls } from "../src/GraphMobileControls";

describe("GraphMobileControls", () => {
    afterEach(() => {
        document.body.innerHTML = "";
    });

    it("renders touch-friendly controls when explicitly enabled", () => {
        const onZoomIn = vi.fn();
        const onZoomOut = vi.fn();
        const onReset = vi.fn();
        const container = document.createElement("div");
        document.body.append(container);

        const controls = new GraphMobileControls(
            container,
            { onZoomIn, onZoomOut, onReset },
            { enabled: true },
        );

        const buttons = container.querySelectorAll("button");

        expect(buttons).toHaveLength(3);
        expect(buttons[0].getAttribute("aria-label")).toBe("Zoom in");

        buttons[0].click();
        buttons[1].click();
        buttons[2].click();

        expect(onZoomIn).toHaveBeenCalledOnce();
        expect(onZoomOut).toHaveBeenCalledOnce();
        expect(onReset).toHaveBeenCalledOnce();

        controls.dispose();
        expect(container.querySelector("[role=group]")).toBeNull();
    });

    it("does not add an overlay when it is disabled", () => {
        const container = document.createElement("div");

        new GraphMobileControls(
            container,
            { onZoomIn: vi.fn(), onZoomOut: vi.fn(), onReset: vi.fn() },
            { enabled: false },
        );

        expect(container.children).toHaveLength(0);
    });
});