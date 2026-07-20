import { createOrbitGraph, type OrbitGraph } from "@orbitgraph/three";
import type { GraphData, GraphLayout, GraphNode } from "@orbitgraph/core";

import "./style.css";

const container = document.querySelector<HTMLElement>("#graph");
const fpsElement = document.querySelector<HTMLElement>("#fps");
const nodeCountElement = document.querySelector<HTMLElement>("#node-count");
const linkCountElement = document.querySelector<HTMLElement>("#link-count");
const summaryElement = document.querySelector<HTMLElement>("#dataset-summary");
const regenerateButton = document.querySelector<HTMLButtonElement>("#regenerate");
const flowInput = document.querySelector<HTMLInputElement>("#link-flow");
const initialViewInput = document.querySelector<HTMLSelectElement>("#initial-view");
const layoutInput = document.querySelector<HTMLSelectElement>("#layout");
const customSizeInput = document.querySelector<HTMLInputElement>("#custom-size");
const loadCustomSizeButton = document.querySelector<HTMLButtonElement>("#load-custom-size");
const sizeButtons = document.querySelectorAll<HTMLButtonElement>("[data-size]");

if (!container) throw new Error("Graph container was not found.");

const colors = ["#22d3ee", "#a855f7", "#3b82f6", "#f472b6", "#facc15", "#34d399"];
let currentSize = 100;
let currentData: GraphData = { nodes: [], links: [] };
let frameCount = 0;
let lastFpsUpdate = performance.now();
let graph: OrbitGraph;

function createGraph(): OrbitGraph {
    const neighborhoodMode = initialViewInput?.value === "neighborhood";

    return createOrbitGraph(container, {
        backgroundColor: "#050816",
        linkColor: "#6366f1",
        linkOpacity: 0.35,
        initialView: neighborhoodMode
            ? { mode: "neighborhood", nodeId: "node-0", depth: 1, direction: "both" }
            : { mode: "all" },
        layout: (layoutInput?.value ?? "force") as GraphLayout,
        layoutOptions: { rootId: "node-0" },
        linkFlow: {
            enabled: flowInput?.checked ?? false,
            maxParticles: 140,
            particleSize: 0.09,
            particleSpeed: 0.12,
        },
        onVisibleDataChange: ({ nodes, links }) => {
            if (nodeCountElement) nodeCountElement.textContent = String(nodes.length);
            if (linkCountElement) linkCountElement.textContent = String(links.length);
        },
    });
}

function createData(nodeCount: number): GraphData {
    const nodes: GraphNode[] = Array.from({ length: nodeCount }, (_, index) => ({
        id: `node-${index}`,
        label: `Entity ${index + 1}`,
        type: `category-${index % 6}`,
        color: colors[index % colors.length],
        size: index % 20 === 0 ? 1.3 : 0.7,
        data: { index, category: `category-${index % 6}` },
    }));

    const links = nodes.flatMap((node, index) => {
        const connections = index < 20 ? 3 : 2;

        return Array.from({ length: connections }, (_, connectionIndex) => {
            let targetIndex = Math.floor(Math.random() * nodes.length);
            if (targetIndex === index) targetIndex = (targetIndex + 1) % nodes.length;

            return {
                id: `${node.id}-to-${targetIndex}-${connectionIndex}`,
                source: node.id,
                target: `node-${targetIndex}`,
                type: "related-to",
                weight: 0.3 + Math.random() * 0.7,
            };
        });
    });

    return { nodes, links };
}

function updateSizeButtons(): void {
    sizeButtons.forEach((button) => {
        button.classList.toggle("is-active", Number(button.dataset.size) === currentSize);
    });
}

function loadBenchmark(regenerate = true): void {
    if (regenerate) currentData = createData(currentSize);

    graph.setData(currentData);
    graph.resetCamera();
    updateSizeButtons();

    if (summaryElement) {
        summaryElement.textContent = `Dataset: ${currentData.nodes.length} nodes · ${currentData.links.length} relationships`;
    }
}

function recreateGraph(regenerate = false): void {
    graph.destroy();
    graph = createGraph();
    loadBenchmark(regenerate);
}

function measureFps(now: number): void {
    frameCount += 1;
    if (now - lastFpsUpdate >= 1000) {
        fpsElement?.replaceChildren(String(frameCount));
        frameCount = 0;
        lastFpsUpdate = now;
    }
    requestAnimationFrame(measureFps);
}

sizeButtons.forEach((button) => button.addEventListener("click", () => {
    const size = Number(button.dataset.size);
    if (!Number.isFinite(size)) return;
    currentSize = size;
    loadBenchmark(true);
}));

loadCustomSizeButton?.addEventListener("click", () => {
    const requestedSize = Number(customSizeInput?.value);

    if (!Number.isFinite(requestedSize)) return;

    currentSize = Math.max(1, Math.min(50_000, Math.floor(requestedSize)));

    if (customSizeInput) customSizeInput.value = String(currentSize);

    loadBenchmark(true);
});

regenerateButton?.addEventListener("click", () => loadBenchmark(true));
flowInput?.addEventListener("change", () => recreateGraph(false));
initialViewInput?.addEventListener("change", () => recreateGraph(false));
layoutInput?.addEventListener("change", () => {
    graph.setLayout(layoutInput.value as GraphLayout, { rootId: "node-0" });
});

graph = createGraph();
loadBenchmark(true);
requestAnimationFrame(measureFps);