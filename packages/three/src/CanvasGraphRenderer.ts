import type { GraphLink } from "@orbitgraph/core";
import type { PhysicsNode } from "./PhysicsEngine";

/** Lightweight 2D Canvas renderer usable as a low-power fallback. */
export class CanvasGraphRenderer {
    private context: CanvasRenderingContext2D;
    constructor(public readonly canvas: HTMLCanvasElement) { const context = canvas.getContext("2d"); if (!context) throw new Error("Canvas 2D is unavailable."); this.context = context; }
    render(nodes: readonly PhysicsNode[], links: readonly GraphLink[]): void {
        const { width, height } = this.canvas; const ctx = this.context; ctx.clearRect(0, 0, width, height);
        const scale = Math.max(1, Math.max(...nodes.map((node) => Math.max(Math.abs(node.x), Math.abs(node.y))), 1)); const point = (node: PhysicsNode) => ({ x: width / 2 + (node.x / scale) * width * .42, y: height / 2 - (node.y / scale) * height * .42 }); const byId = new Map(nodes.map((node) => [node.id, node]));
        ctx.strokeStyle = "rgba(99,102,241,.4)"; for (const link of links) { const source = byId.get(link.source); const target = byId.get(link.target); if (!source || !target) continue; const a = point(source); const b = point(target); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
        for (const node of nodes) { const p = point(node); ctx.fillStyle = node.color ?? "#22d3ee"; ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(3, (node.size ?? .65) * 5), 0, Math.PI * 2); ctx.fill(); }
    }
}
