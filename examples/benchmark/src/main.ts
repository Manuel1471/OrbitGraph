import { graphThemes, type GraphData, type GraphLayout } from "@orbitgraph/core";
import { createOrbitGraph, type OrbitGraph } from "@orbitgraph/three";
import "./style.css";

type WorkerMessage =
    | { type: "progress"; id: number; progress: number }
    | { type: "complete"; id: number; data: GraphData }
    | { type: "cancelled"; id: number }
    | { type: "error"; id: number; message: string };

const worker = new Worker(new URL("./data.worker.ts", import.meta.url), { type: "module" });
const host = document.querySelector<HTMLElement>("#graph")!;
const byId = <T extends HTMLElement>(id: string) => document.querySelector<T>(`#${id}`)!;
const fps = byId("fps"), nodeCount = byId("node-count"), linkCount = byId("link-count"), loadMs = byId("load-ms"), summary = byId("summary");
const custom = byId<HTMLInputElement>("custom-size"), renderer = byId<HTMLSelectElement>("render-mode"), initial = byId<HTMLSelectElement>("initial-view"), layout = byId<HTMLSelectElement>("layout"), flow = byId<HTMLInputElement>("link-flow");
const cancel = byId<HTMLButtonElement>("cancel-scenario"), progress = byId<HTMLElement>("progress"), progressLabel = byId("progress-label"), progressValue = byId("progress-value"), progressBar = byId<HTMLElement>("progress-bar");

let graph: OrbitGraph | undefined;
let data: GraphData = { nodes: [], links: [] };
let currentSize = 1_000, requestId = 0, startedAt = 0, buildFrame = 0;

function setProgress(label: string, value: number): void {
    progress.hidden = false; progressLabel.textContent = label;
    progressValue.textContent = `${Math.round(value)}%`; progressBar.style.width = `${value}%`;
}
function finishProgress(): void { progress.hidden = true; cancel.disabled = true; }

function createGraph(): OrbitGraph {
    return createOrbitGraph(host, {
        renderMode: renderer.value as "webgl" | "canvas", theme: graphThemes.midnight,
        initialView: initial.value === "neighborhood" ? { mode: "neighborhood", nodeId: "node-0", depth: 1 } : { mode: "all" },
        layout: layout.value as GraphLayout, layoutOptions: { rootId: "node-0", timeField: "time" },
        camera: { movementSpeed: Math.max(40, Math.sqrt(currentSize) * 3) },
        linkFlow: { enabled: flow.checked, maxParticles: 120 },
        performance: { telemetry: true, onPerformanceSample: (sample) => { fps.textContent = String(sample.fps); } },
        onVisibleDataChange: (visible) => { nodeCount.textContent = String(visible.nodes.length); linkCount.textContent = String(visible.links.length); },
    });
}

function mountData(nextData: GraphData): void {
    setProgress("Building renderer", 97); cancel.disabled = true; cancelAnimationFrame(buildFrame);
    buildFrame = requestAnimationFrame(() => {
        graph?.destroy(); graph = createGraph(); graph.setData(nextData);
        buildFrame = requestAnimationFrame(() => {
            setProgress("Framing graph", 99); graph?.resetCamera();
            buildFrame = requestAnimationFrame(() => {
                finishProgress(); loadMs.textContent = `${Math.round(performance.now() - startedAt)}ms`;
                summary.textContent = `${renderer.value.toUpperCase()} · ${layout.value} · ${nextData.nodes.length.toLocaleString()} nodes · ${nextData.links.length.toLocaleString()} links`;
            });
        });
    });
}
function rebuildGraph(): void { if (data.nodes.length) { startedAt = performance.now(); mountData(data); } }
function startWorker(): void {
    if (requestId) worker.postMessage({ type: "cancel", id: requestId });
    const id = ++requestId; startedAt = performance.now(); cancel.disabled = false; setProgress("Generating dataset", 0);
    worker.postMessage({ type: "generate", id, count: currentSize });
}

worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
    const message = event.data; if (message.id !== requestId) return;
    if (message.type === "progress") setProgress("Generating dataset", Math.min(94, message.progress * 0.94));
    else if (message.type === "complete") { data = message.data; mountData(data); }
    else if (message.type === "cancelled") { finishProgress(); summary.textContent = "Scenario generation cancelled."; }
    else { finishProgress(); summary.textContent = `Worker error: ${message.message}`; }
};
worker.onerror = (event) => { finishProgress(); summary.textContent = `Worker error: ${event.message}`; };
cancel.onclick = () => { worker.postMessage({ type: "cancel", id: requestId }); cancelAnimationFrame(buildFrame); cancel.disabled = true; progressLabel.textContent = "Cancelling"; };

document.querySelectorAll<HTMLButtonElement>("[data-size]").forEach((button) => { button.onclick = () => {
    currentSize = Number(button.dataset.size); custom.value = String(currentSize);
    document.querySelectorAll<HTMLButtonElement>("[data-size]").forEach((item) => item.classList.toggle("active", item === button)); startWorker();
}; });
byId<HTMLButtonElement>("load-custom").onclick = () => { currentSize = Math.max(10, Math.min(50_000, Number(custom.value) || 1_000)); custom.value = String(currentSize); startWorker(); };
byId<HTMLButtonElement>("regenerate").onclick = startWorker;
byId<HTMLButtonElement>("cluster").onclick = () => { if (graph?.enableClusterLevelOfDetail()) summary.textContent = "Semantic zoom enabled. Zoom out to aggregate and in to inspect detail."; };
byId<HTMLButtonElement>("style-hubs").onclick = () => graph?.setStyleRules([{ id: "hubs", when: { minDegree: 5 }, style: { scale: 1.6, glow: 1, color: "#facc15" } }]);
byId<HTMLButtonElement>("export-json").onclick = () => graph?.downloadJSON({ scope: "visible", fileName: "orbitgraph-visible.json" });
layout.onchange = () => { if (graph) { graph.setLayout(layout.value as GraphLayout, { rootId: "node-0", timeField: "time" }); summary.textContent = `Applying ${layout.value} layout to the current dataset…`; } };
[renderer, initial, flow].forEach((input) => { input.onchange = rebuildGraph; });
window.addEventListener("beforeunload", () => { worker.terminate(); graph?.destroy(); });
startWorker();
