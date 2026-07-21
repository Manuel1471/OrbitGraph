// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";

import type { GraphNode } from "@orbitgraph/core";

import {
    GraphKeyboardNavigation,
    type GraphKeyboardNavigationCallbacks,
} from "../src/GraphKeyboardNavigation";

const nodes: GraphNode[] = [
    { id: "team", label: "Product Team" },
    { id: "workspace", label: "Workspace" },
    { id: "service", label: "Notification Service" },
];

function createCallbacks(): GraphKeyboardNavigationCallbacks {
    return {
        onFocusChange: vi.fn(),
        onActivate: vi.fn(),
        onExpand: vi.fn(),
        onCollapse: vi.fn(),
        onFocusCamera: vi.fn(),
        onClear: vi.fn(),
    };
}

function press(canvas: HTMLCanvasElement, code: string): void {
    canvas.dispatchEvent(
        new KeyboardEvent("keydown", {
            code,
            bubbles: true,
            cancelable: true,
        }),
    );
}

describe("GraphKeyboardNavigation", () => {
    let navigation: GraphKeyboardNavigation | undefined;

    afterEach(() => {
        navigation?.dispose();
        navigation = undefined;
        document.body.replaceChildren();
    });

    it("makes the graph canvas keyboard focusable", () => {
        const canvas = document.createElement("canvas");
        const callbacks = createCallbacks();

        navigation = new GraphKeyboardNavigation(
            canvas,
            () => nodes,
            callbacks,
        );

        expect(canvas.tabIndex).toBe(0);
        expect(canvas.getAttribute("role")).toBe("application");
        expect(canvas.getAttribute("aria-label")).toBe(
            "Interactive relationship graph",
        );
    });

    it("moves focus through visible nodes with arrow keys", () => {
        const canvas = document.createElement("canvas");
        const callbacks = createCallbacks();

        navigation = new GraphKeyboardNavigation(
            canvas,
            () => nodes,
            callbacks,
        );

        press(canvas, "ArrowRight");
        expect(callbacks.onFocusChange).toHaveBeenLastCalledWith(nodes[0]);

        press(canvas, "ArrowDown");
        expect(callbacks.onFocusChange).toHaveBeenLastCalledWith(nodes[1]);

        press(canvas, "ArrowLeft");
        expect(callbacks.onFocusChange).toHaveBeenLastCalledWith(nodes[0]);
    });

    it("wraps focus when navigating past the last node", () => {
        const canvas = document.createElement("canvas");
        const callbacks = createCallbacks();

        navigation = new GraphKeyboardNavigation(
            canvas,
            () => nodes,
            callbacks,
        );

        press(canvas, "ArrowUp");

        expect(callbacks.onFocusChange).toHaveBeenLastCalledWith(nodes[2]);
    });

    it("runs node actions for the currently focused node", () => {
        const canvas = document.createElement("canvas");
        const callbacks = createCallbacks();

        navigation = new GraphKeyboardNavigation(
            canvas,
            () => nodes,
            callbacks,
        );

        press(canvas, "ArrowRight");
        press(canvas, "Enter");
        press(canvas, "KeyE");
        press(canvas, "KeyC");
        press(canvas, "KeyF");

        expect(callbacks.onActivate).toHaveBeenCalledWith(nodes[0]);
        expect(callbacks.onExpand).toHaveBeenCalledWith(nodes[0]);
        expect(callbacks.onCollapse).toHaveBeenCalledWith(nodes[0]);
        expect(callbacks.onFocusCamera).toHaveBeenCalledWith(nodes[0]);
    });

    it("clears focus with Escape", () => {
        const canvas = document.createElement("canvas");
        const callbacks = createCallbacks();

        navigation = new GraphKeyboardNavigation(
            canvas,
            () => nodes,
            callbacks,
        );

        press(canvas, "ArrowRight");
        press(canvas, "Escape");

        expect(callbacks.onFocusChange).toHaveBeenLastCalledWith(null);
        expect(callbacks.onClear).toHaveBeenCalledTimes(1);
    });
});