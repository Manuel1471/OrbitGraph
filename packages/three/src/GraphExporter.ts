import type {
    GraphData,
    GraphJSONExportOptions,
    VisibleGraphData,
} from "@orbitgraph/core";

type GraphExporterOptions = {
    canvas: HTMLCanvasElement;
    render: () => void;
    getData: () => GraphData;
    getVisibleData: () => VisibleGraphData;
    getNodePositions?: () => Array<{ id: string; x: number; y: number; z: number; label?: string; color?: string; size?: number }>;
};

/**
 * Exports the current canvas image and serializable graph data without adding
 * persistent work to the normal animation loop.
 */
export class GraphExporter {
    constructor(private readonly options: GraphExporterOptions) {}

    exportPNG(): Promise<Blob> {
        this.options.render();

        return new Promise((resolve, reject) => {
            this.options.canvas.toBlob((blob) => {
                if (blob) {
                    resolve(blob);
                    return;
                }

                reject(new Error("OrbitGraph could not create a PNG export."));
            }, "image/png");
        });
    }

    async downloadPNG(fileName = "orbitgraph.png"): Promise<void> {
        const blob = await this.exportPNG();

        this.downloadBlob(blob, fileName);
    }

    exportJSON(options: GraphJSONExportOptions = {}): string {
        const scope = options.scope ?? "all";
        const pretty = options.pretty ?? true;
        const data =
            scope === "visible"
                ? this.options.getVisibleData()
                : this.options.getData();

        return JSON.stringify(this.cloneData(data), null, pretty ? 2 : undefined);
    }

    downloadJSON(
        options: GraphJSONExportOptions & { fileName?: string } = {},
    ): void {
        const blob = new Blob(
            [this.exportJSON(options)],
            { type: "application/json" },
        );

        this.downloadBlob(blob, options.fileName ?? "orbitgraph.json");
    }

    /** Creates a true vector SVG from active node positions and relationships. */
    exportSVG(): string {
        const data = this.options.getVisibleData(); const positions = this.options.getNodePositions?.() ?? []; const width = this.options.canvas.width; const height = this.options.canvas.height; const extent = Math.max(...positions.map((node) => Math.max(Math.abs(node.x), Math.abs(node.y))), 1); const point = (node: { x: number; y: number }) => ({ x: width / 2 + node.x / extent * width * .42, y: height / 2 - node.y / extent * height * .42 }); const byId = new Map(positions.map((node) => [node.id, node]));
        const links = data.links.flatMap((link) => { const source = byId.get(link.source); const target = byId.get(link.target); return source && target ? [`<line x1="${point(source).x}" y1="${point(source).y}" x2="${point(target).x}" y2="${point(target).y}" stroke="#6366f1" stroke-opacity=".55"/>`] : []; }).join("");
        const nodes = positions.map((node) => { const p = point(node); const radius = Math.max(3, (node.size ?? .65) * 5); return `<g><circle cx="${p.x}" cy="${p.y}" r="${radius}" fill="${node.color ?? "#22d3ee"}"/><text x="${p.x + radius + 3}" y="${p.y + 4}" fill="#e2e8f0" font-family="Arial" font-size="12">${escapeXML(node.label ?? node.id)}</text></g>`; }).join("");
        return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#050816"/>${links}${nodes}</svg>`;
    }
    downloadSVG(fileName = "orbitgraph.svg"): void { this.downloadBlob(new Blob([this.exportSVG()], { type: "image/svg+xml" }), fileName); }
    async exportPDF(options: { title?: string; summary?: string } = {}): Promise<Blob> {
        const { jsPDF } = await import("jspdf");
        this.options.render(); const canvas = this.options.canvas; const pdf = new jsPDF({ orientation: canvas.width >= canvas.height ? "landscape" : "portrait", unit: "px", format: [canvas.width, canvas.height + 90] }); const visible = this.options.getVisibleData(); pdf.setFillColor("#050816"); pdf.rect(0, 0, canvas.width, canvas.height + 90, "F"); pdf.setTextColor("#f8fafc"); pdf.setFontSize(20); pdf.text(options.title ?? "OrbitGraph report", 24, 30); pdf.setFontSize(11); pdf.setTextColor("#cbd5e1"); pdf.text(options.summary ?? `${visible.nodes.length} nodes - ${visible.links.length} relationships - ${new Date().toLocaleString()}`, 24, 52); pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 90, canvas.width, canvas.height); return pdf.output("blob");
    }
    async downloadPDF(fileName = "orbitgraph.pdf", options: { title?: string; summary?: string } = {}): Promise<void> { this.downloadBlob(await this.exportPDF(options), fileName); }

    private cloneData<T extends GraphData | VisibleGraphData>(data: T): T {
        // Node and link metadata are defined as JSON-compatible values.
        return JSON.parse(JSON.stringify(data)) as T;
    }

    private downloadBlob(blob: Blob, fileName: string): void {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = fileName;
        link.click();

        window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
    }
}

function escapeXML(value: string): string { return value.replace(/[<>&"']/g, (character) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[character]!); }
