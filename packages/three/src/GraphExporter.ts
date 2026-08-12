import type {
    GraphData,
    GraphJSONExportOptions,
    VisibleGraphData,
} from "@orbitgraph/core";
import { jsPDF } from "jspdf";

type GraphExporterOptions = {
    canvas: HTMLCanvasElement;
    render: () => void;
    getData: () => GraphData;
    getVisibleData: () => VisibleGraphData;
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

    /** Wraps the current canvas image in a portable SVG document. */
    exportSVG(): string {
        this.options.render();
        const image = this.options.canvas.toDataURL("image/png");
        return `<svg xmlns="http://www.w3.org/2000/svg" width="${this.options.canvas.width}" height="${this.options.canvas.height}" viewBox="0 0 ${this.options.canvas.width} ${this.options.canvas.height}"><image href="${image}" width="100%" height="100%"/></svg>`;
    }
    downloadSVG(fileName = "orbitgraph.svg"): void { this.downloadBlob(new Blob([this.exportSVG()], { type: "image/svg+xml" }), fileName); }
    exportPDF(): Blob {
        this.options.render(); const canvas = this.options.canvas; const pdf = new jsPDF({ orientation: canvas.width >= canvas.height ? "landscape" : "portrait", unit: "px", format: [canvas.width, canvas.height] }); pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, canvas.width, canvas.height); return pdf.output("blob");
    }
    downloadPDF(fileName = "orbitgraph.pdf"): void { this.downloadBlob(this.exportPDF(), fileName); }

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

        URL.revokeObjectURL(url);
    }
}
