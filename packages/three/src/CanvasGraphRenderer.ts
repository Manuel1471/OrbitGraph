import type { GraphLink } from "@orbitgraph/core";
import type { PhysicsNode } from "./PhysicsEngine";

/** Lightweight 2D Canvas renderer usable as a low-power fallback. */
export class CanvasGraphRenderer {
    private readonly context: CanvasRenderingContext2D;
    private readonly byId = new Map<string, PhysicsNode>();

    constructor(public readonly canvas: HTMLCanvasElement) {
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Canvas 2D is unavailable.");
        this.context = context;
    }

    resize(width: number, height: number, pixelRatio = 1): void {
        this.canvas.width = Math.max(1, Math.floor(width * pixelRatio));
        this.canvas.height = Math.max(1, Math.floor(height * pixelRatio));
    }

    render(nodes: readonly PhysicsNode[], links: readonly GraphLink[]): void {
        const { width, height } = this.canvas;
        const ctx = this.context;
        ctx.clearRect(0, 0, width, height);
        if (!nodes.length) return;

        let extent = 1;
        this.byId.clear();
        for (const node of nodes) {
            this.byId.set(node.id, node);
            extent = Math.max(extent, Math.abs(node.x), Math.abs(node.y));
        }
        const scaleX = width * 0.42 / extent, scaleY = height * 0.42 / extent;

        ctx.beginPath();
        for (const link of links) {
            const source = this.byId.get(link.source), target = this.byId.get(link.target);
            if (!source || !target) continue;
            ctx.moveTo(width / 2 + source.x * scaleX, height / 2 - source.y * scaleY);
            ctx.lineTo(width / 2 + target.x * scaleX, height / 2 - target.y * scaleY);
        }
        ctx.strokeStyle = "rgba(99,102,241,.4)";
        ctx.stroke();

        for (const node of nodes) {
            ctx.fillStyle = node.color ?? "#22d3ee";
            ctx.beginPath();
            ctx.arc(width / 2 + node.x * scaleX, height / 2 - node.y * scaleY, Math.max(2, (node.size ?? 0.65) * 5), 0, Math.PI * 2);
            ctx.fill();
        }
    }
}
