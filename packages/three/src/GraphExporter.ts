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