import type { GraphData, GraphDiff, GraphLayout, GraphNode, GraphOperation, GraphRoute } from "@orbitgraph/core";
import { calculateDegreeMetrics, calculatePageRank, detectCommunities, diffGraphs, findKShortestPaths, findWeightedPath, validateGraphOperations } from "@orbitgraph/core";
export type HeadlessNodePosition = { id: string; x: number; y: number; z: number };

export function layoutGraph(data: GraphData, layout: GraphLayout = "grid", spacing = 24): HeadlessNodePosition[] {
    const columns = Math.max(1, Math.ceil(Math.sqrt(data.nodes.length)));
    return data.nodes.map((node, index) => { if (layout === "radial" || layout === "concentric") { const angle = index / Math.max(1, data.nodes.length) * Math.PI * 2, radius = spacing * (layout === "concentric" ? 1 + index % 4 : 2); return { id: node.id, x: Math.cos(angle) * radius, y: Math.sin(angle) * radius, z: 0 }; } return { id: node.id, x: (index % columns) * spacing, y: Math.floor(index / columns) * spacing, z: 0 }; });
}

export function renderGraphSVG(data: GraphData, options: { width?: number; height?: number; layout?: GraphLayout } = {}): string {
    const width = options.width ?? 1200, height = options.height ?? 800, positions = layoutGraph(data, options.layout), byId = new Map(positions.map((node) => [node.id, node]));
    const point = createProjector(positions, width, height, 40);
    const links = data.links.flatMap((link) => { const a = byId.get(link.source), b = byId.get(link.target); return a && b ? [`<line x1="${point(a).x}" y1="${point(a).y}" x2="${point(b).x}" y2="${point(b).y}" stroke="#6366f1" stroke-opacity=".5"/>`] : []; }).join("");
    const nodes = data.nodes.map((node) => { const position = byId.get(node.id)!, p = point(position); return `<circle cx="${p.x}" cy="${p.y}" r="${Math.max(3, (node.size ?? .65) * 5)}" fill="${node.color ?? "#22d3ee"}"/>`; }).join("");
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#050816"/>${links}${nodes}</svg>`;
}

export async function renderGraphPDF(data: GraphData, options: { title?: string; width?: number; height?: number; layout?: GraphLayout } = {}): Promise<Uint8Array> {
    const { jsPDF } = await import("jspdf"); const width = options.width ?? 1200, height = options.height ?? 800; const pdf = new jsPDF({ unit: "px", format: [width, height] });
    pdf.setFillColor(5, 8, 22); pdf.rect(0, 0, width, height, "F");
    pdf.setTextColor(238, 242, 255); pdf.setFontSize(22); pdf.text(options.title ?? "OrbitGraph report", 32, 40); pdf.setFontSize(11); pdf.text(`${data.nodes.length} nodes · ${data.links.length} relationships`, 32, 64);
    const positions = layoutGraph(data, options.layout), byId = new Map(positions.map((node) => [node.id, node])), point = createProjector(positions, width, height - 80, 40, 80);
    pdf.setDrawColor(99, 102, 241); pdf.setLineWidth(0.35);
    for (const link of data.links) { const source = byId.get(link.source), target = byId.get(link.target); if (!source || !target) continue; const a = point(source), b = point(target); pdf.line(a.x, a.y, b.x, b.y); }
    for (const node of data.nodes) { const position = byId.get(node.id); if (!position) continue; const p = point(position), color = parseHex(node.color ?? "#22d3ee"); pdf.setFillColor(color[0], color[1], color[2]); pdf.circle(p.x, p.y, Math.max(2, (node.size ?? 0.65) * 4), "F"); }
    return new Uint8Array(pdf.output("arraybuffer"));
}

export function analyzeGraph(data: GraphData) { return { degree: calculateDegreeMetrics(data), pageRank: calculatePageRank(data), communities: detectCommunities(data) }; }

/** Stateful DOM-free runtime for SSR, CLI tools, tests, jobs, and server report generation. */
export class HeadlessOrbitGraph {
    private data: GraphData; private history: GraphData[]; private historyIndex = 0; private selection = new Set<string>();
    constructor(data: GraphData = { nodes: [], links: [] }) { this.data = cloneData(data); this.history = [cloneData(data)]; }
    setData(data: GraphData): void { this.data = cloneData(data); this.history = [cloneData(data)]; this.historyIndex = 0; this.selection.clear(); }
    getData(): GraphData { return cloneData(this.data); }
    getNode(nodeId: string): GraphNode | undefined { return this.data.nodes.find((node) => node.id === nodeId); }
    analyze() { return analyzeGraph(this.data); }
    layout(layout: GraphLayout = "grid", spacing = 24): HeadlessNodePosition[] { return layoutGraph(this.data, layout, spacing); }
    exportJSON(space = 2): string { return JSON.stringify(this.data, null, space); }
    exportSVG(options?: { width?: number; height?: number; layout?: GraphLayout }): string { return renderGraphSVG(this.data, options); }
    exportPDF(options?: { title?: string; width?: number; height?: number; layout?: GraphLayout }): Promise<Uint8Array> { return renderGraphPDF(this.data, options); }
    compare(data: GraphData): GraphDiff { return diffGraphs(this.data, data); }
    findWeightedPath(sourceId: string, targetId: string): GraphRoute | null { return findWeightedPath(this.data, sourceId, targetId); }
    findKShortestPaths(sourceId: string, targetId: string, count?: number): GraphRoute[] { return findKShortestPaths(this.data, sourceId, targetId, count); }
    validateOperations(operations: GraphOperation[]) { return validateGraphOperations(this.data, operations); }
    applyOperations(operations: GraphOperation[]): void {
        const validation = this.validateOperations(operations); if (!validation.valid) throw new Error(validation.errors.join(" "));
        for (const operation of operations) {
            if (operation.type === "add-node") this.data.nodes.push(operation.node);
            else if (operation.type === "remove-node") { this.data.nodes = this.data.nodes.filter((node) => node.id !== operation.nodeId); this.data.links = this.data.links.filter((link) => link.source !== operation.nodeId && link.target !== operation.nodeId); }
            else if (operation.type === "add-link") this.data.links.push(operation.link);
            else if (operation.type === "remove-link") this.data.links = this.data.links.filter((link) => link.id !== operation.linkId);
            else if (operation.type === "update-node") this.data.nodes = this.data.nodes.map((node) => node.id === operation.nodeId ? { ...node, ...operation.patch } : node);
            else this.data.links = this.data.links.map((link) => link.id === operation.linkId ? { ...link, ...operation.patch } : link);
        }
        this.history.splice(this.historyIndex + 1); this.history.push(cloneData(this.data)); this.historyIndex += 1;
    }
    undo(): boolean { if (this.historyIndex === 0) return false; this.historyIndex -= 1; this.data = cloneData(this.history[this.historyIndex]); return true; }
    redo(): boolean { if (this.historyIndex >= this.history.length - 1) return false; this.historyIndex += 1; this.data = cloneData(this.history[this.historyIndex]); return true; }
    selectNodes(nodeIds: Iterable<string>): string[] { const valid = new Set(this.data.nodes.map((node) => node.id)); this.selection = new Set([...nodeIds].filter((id) => valid.has(id))); return this.getSelectedNodeIds(); }
    getSelectedNodeIds(): string[] { return [...this.selection]; }
    clearNodeSelection(): void { this.selection.clear(); }
}

function createProjector(positions: HeadlessNodePosition[], width: number, height: number, padding: number, offsetY = 0) {
    const xs = positions.map((node) => node.x), ys = positions.map((node) => node.y), minX = Math.min(0, ...xs), maxX = Math.max(1, ...xs), minY = Math.min(0, ...ys), maxY = Math.max(1, ...ys);
    return (node: HeadlessNodePosition) => ({ x: padding + (node.x - minX) / Math.max(1, maxX - minX) * (width - padding * 2), y: offsetY + padding + (node.y - minY) / Math.max(1, maxY - minY) * (height - padding * 2) });
}

function parseHex(color: string): [number, number, number] {
    const match = /^#([\da-f]{6})$/i.exec(color); if (!match) return [34, 211, 238]; const value = Number.parseInt(match[1], 16); return [value >> 16, value >> 8 & 255, value & 255];
}

function cloneData(data: GraphData): GraphData { return { nodes: data.nodes.map((node) => ({ ...node, data: node.data ? { ...node.data } : undefined })), links: data.links.map((link) => ({ ...link, data: link.data ? { ...link.data } : undefined })) }; }
