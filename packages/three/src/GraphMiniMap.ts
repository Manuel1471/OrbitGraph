import * as THREE from "three";

import type { GraphMiniMapOptions } from "@orbitgraph/core";

import { GraphCamera } from "./GraphCamera";
import type { PhysicsLink, PhysicsNode } from "./PhysicsEngine";

const DEFAULT_OPTIONS: Required<
    Pick<
        GraphMiniMapOptions,
        "enabled" | "position" | "width" | "height" | "interactive" | "showViewport" | "ariaLabel"
    >
> = {
    enabled: false,
    position: "bottom-right",
    width: 180,
    height: 120,
    interactive: true,
    showViewport: true,
    ariaLabel: "Graph overview",
};

type MiniMapBounds = {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
};

/**
 * Lightweight Canvas 2D overview of the active graph subset.
 *
 * It does not create a second Three.js renderer. Click or tap navigates the
 * main camera target while preserving its current viewing direction.
 */
export class GraphMiniMap {
    private readonly canvas: HTMLCanvasElement | null;
    private readonly context: CanvasRenderingContext2D | null;
    private readonly options: Required<
        Pick<
            GraphMiniMapOptions,
            "enabled" | "position" | "width" | "height" | "interactive" | "showViewport" | "ariaLabel"
        >
    >;
    private nodes: readonly PhysicsNode[] = [];
    private links: readonly PhysicsLink[] = [];
    private bounds: MiniMapBounds | null = null;
    private removeCameraListener: (() => void) | null = null;

    constructor(
        private readonly container: HTMLElement,
        private readonly graphCamera: GraphCamera,
        options: GraphMiniMapOptions = {},
    ) {
        this.options = { ...DEFAULT_OPTIONS, ...options };

        if (!this.options.enabled) {
            this.canvas = null;
            this.context = null;
            return;
        }

        this.canvas = document.createElement("canvas");
        this.context = this.canvas.getContext("2d");

        if (!this.context) {
            this.canvas.remove();
            return;
        }

        this.configureCanvas();
        this.container.appendChild(this.canvas);

        if (this.options.interactive) {
            this.canvas.addEventListener("pointerdown", this.handlePointerDown);
        }

        this.removeCameraListener = this.graphCamera.onChange(() => this.draw());
    }

    /** Replaces the active graph subset drawn by the overview. */
    update(nodes: readonly PhysicsNode[], links: readonly PhysicsLink[]): void {
        this.nodes = nodes;
        this.links = links;
        this.bounds = this.getBounds(nodes);
        this.draw();
    }

    dispose(): void {
        this.removeCameraListener?.();
        this.removeCameraListener = null;

        if (!this.canvas) {
            return;
        }

        this.canvas.removeEventListener("pointerdown", this.handlePointerDown);
        this.canvas.remove();
    }

    private configureCanvas(): void {
        if (!this.canvas) {
            return;
        }

        const { width, height } = this.options;
        const cornerStyles = this.getCornerStyles(this.options.position);

        this.canvas.width = width * Math.min(window.devicePixelRatio, 2);
        this.canvas.height = height * Math.min(window.devicePixelRatio, 2);
        this.canvas.className = "orbitgraph-mini-map";
        this.canvas.style.position = "absolute";
        this.canvas.style.zIndex = "2";
        this.canvas.style.width = `${width}px`;
        this.canvas.style.height = `${height}px`;
        this.canvas.style.border = "1px solid rgba(148, 163, 184, 0.28)";
        this.canvas.style.borderRadius = "12px";
        this.canvas.style.background = "rgba(2, 6, 23, 0.72)";
        this.canvas.style.boxShadow = "0 10px 30px rgba(0, 0, 0, 0.22)";
        this.canvas.style.backdropFilter = "blur(10px)";
        this.canvas.style.touchAction = "none";
        this.canvas.style.cursor = this.options.interactive ? "crosshair" : "default";

        Object.assign(this.canvas.style, cornerStyles);

        if (this.options.interactive) {
            this.canvas.tabIndex = 0;
            this.canvas.setAttribute("role", "button");
            this.canvas.setAttribute("aria-label", this.options.ariaLabel);
        } else {
            this.canvas.style.pointerEvents = "none";
            this.canvas.setAttribute("aria-hidden", "true");
        }
    }

    private draw(): void {
        if (!this.canvas || !this.context) {
            return;
        }

        const pixelRatio = Math.min(window.devicePixelRatio, 2);
        const width = this.options.width;
        const height = this.options.height;

        this.context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        this.context.clearRect(0, 0, width, height);

        this.context.fillStyle = "rgba(2, 6, 23, 0.56)";
        this.context.fillRect(0, 0, width, height);

        if (!this.bounds || this.nodes.length === 0) {
            this.drawEmptyState(width, height);
            return;
        }

        const project = (x: number, y: number): [number, number] => {
            const padding = 12;
            const usableWidth = width - padding * 2;
            const usableHeight = height - padding * 2;
            const rangeX = Math.max(this.bounds!.maxX - this.bounds!.minX, 1);
            const rangeY = Math.max(this.bounds!.maxY - this.bounds!.minY, 1);

            return [
                padding + ((x - this.bounds!.minX) / rangeX) * usableWidth,
                height - padding - ((y - this.bounds!.minY) / rangeY) * usableHeight,
            ];
        };

        this.context.lineWidth = 1;
        this.context.strokeStyle = "rgba(99, 102, 241, 0.35)";

        for (const link of this.links) {
            const sourceId = typeof link.source === "string" ? link.source : link.source.id;
            const targetId = typeof link.target === "string" ? link.target : link.target.id;
            const source = this.nodes.find((node) => node.id === sourceId);
            const target = this.nodes.find((node) => node.id === targetId);

            if (!source || !target) {
                continue;
            }

            const [sourceX, sourceY] = project(source.x, source.y);
            const [targetX, targetY] = project(target.x, target.y);

            this.context.beginPath();
            this.context.moveTo(sourceX, sourceY);
            this.context.lineTo(targetX, targetY);
            this.context.stroke();
        }

        for (const node of this.nodes) {
            const [x, y] = project(node.x, node.y);
            const radius = Math.max(2, Math.min(5, (node.size ?? 0.65) * 3));

            this.context.beginPath();
            this.context.arc(x, y, radius, 0, Math.PI * 2);
            this.context.fillStyle = node.color ?? "#22d3ee";
            this.context.fill();
        }

        if (this.options.showViewport) {
            const target = this.graphCamera.getTarget();
            const [x, y] = project(target.x, target.y);

            this.context.strokeStyle = "#f8fafc";
            this.context.lineWidth = 1.5;
            this.context.beginPath();
            this.context.arc(x, y, 7, 0, Math.PI * 2);
            this.context.stroke();
        }
    }

    private drawEmptyState(width: number, height: number): void {
        if (!this.context) {
            return;
        }

        this.context.fillStyle = "#94a3b8";
        this.context.font = "600 11px Inter, Arial, sans-serif";
        this.context.textAlign = "center";
        this.context.textBaseline = "middle";
        this.context.fillText("No visible nodes", width / 2, height / 2);
    }

    private getBounds(nodes: readonly PhysicsNode[]): MiniMapBounds | null {
        if (nodes.length === 0) {
            return null;
        }

        let minX = Number.POSITIVE_INFINITY;
        let maxX = Number.NEGATIVE_INFINITY;
        let minY = Number.POSITIVE_INFINITY;
        let maxY = Number.NEGATIVE_INFINITY;

        for (const node of nodes) {
            minX = Math.min(minX, node.x);
            maxX = Math.max(maxX, node.x);
            minY = Math.min(minY, node.y);
            maxY = Math.max(maxY, node.y);
        }

        const paddingX = Math.max((maxX - minX) * 0.08, 4);
        const paddingY = Math.max((maxY - minY) * 0.08, 4);

        return {
            minX: minX - paddingX,
            maxX: maxX + paddingX,
            minY: minY - paddingY,
            maxY: maxY + paddingY,
        };
    }

    private getCornerStyles(
        position: Required<GraphMiniMapOptions>["position"],
    ): Partial<CSSStyleDeclaration> {
        const offset = "20px";

        switch (position) {
            case "top-left":
                return { top: offset, left: offset };
            case "top-right":
                return { top: offset, right: offset };
            case "bottom-left":
                return { bottom: offset, left: offset };
            case "bottom-right":
            default:
                return { bottom: offset, right: offset };
        }
    }

    private handlePointerDown = (event: PointerEvent): void => {
        if (!this.canvas || !this.bounds || !this.options.interactive) {
            return;
        }

        event.preventDefault();

        const rect = this.canvas.getBoundingClientRect();
        const relativeX = THREE.MathUtils.clamp((event.clientX - rect.left) / rect.width, 0, 1);
        const relativeY = THREE.MathUtils.clamp((event.clientY - rect.top) / rect.height, 0, 1);
        const target = this.graphCamera.getTarget();

        this.graphCamera.focusPosition(
            new THREE.Vector3(
                this.bounds.minX + (this.bounds.maxX - this.bounds.minX) * relativeX,
                this.bounds.maxY - (this.bounds.maxY - this.bounds.minY) * relativeY,
                target.z,
            ),
        );
    };
}