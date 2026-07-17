import { createOrbitGraph, type OrbitGraph } from "@orbitgraph/three";
import type { GraphData, GraphNode } from "@orbitgraph/core";

import "./style.css";

const container = document.querySelector<HTMLElement>("#graph");
const fpsElement = document.querySelector<HTMLElement>("#fps");
const nodeCountElement = document.querySelector<HTMLElement>("#node-count");
const linkCountElement = document.querySelector<HTMLElement>("#link-count");

const regenerateButton =
    document.querySelector<HTMLButtonElement>("#regenerate");

const flowInput =
    document.querySelector<HTMLInputElement>("#link-flow");

const sizeButtons =
    document.querySelectorAll<HTMLButtonElement>("[data-size]");

if (!container) {
    throw new Error("Graph container was not found.");
}

const colors = [
    "#22d3ee",
    "#a855f7",
    "#3b82f6",
    "#f472b6",
    "#facc15",
    "#34d399",
];

let currentSize = 100;
let frameCount = 0;
let lastFpsUpdate = performance.now();

let graph: OrbitGraph;

function createGraph(linkFlowEnabled: boolean): OrbitGraph {
    return createOrbitGraph(container, {
        backgroundColor: "#050816",
        linkColor: "#6366f1",
        linkOpacity: 0.35,
        linkFlow: {
            enabled: linkFlowEnabled,
            maxParticles: 140,
            particleSize: 0.09,
            particleSpeed: 0.12,
        },
    });
}

function createData(nodeCount: number): GraphData {
    const nodes: GraphNode[] = Array.from(
        { length: nodeCount },
        (_, index) => ({
            id: `node-${index}`,
            label: `Node ${index + 1}`,
            type: `type-${index % 6}`,
            color: colors[index % colors.length],
            size: index % 20 === 0 ? 1.3 : 0.7,
            data: {
                index,
                category: `type-${index % 6}`,
            },
        }),
    );

    const links = nodes.flatMap((node, index) => {
        const connections = index < 20 ? 3 : 2;

        return Array.from({ length: connections }, (_, connectionIndex) => {
            let targetIndex = Math.floor(Math.random() * nodes.length);

            if (targetIndex === index) {
                targetIndex = (targetIndex + 1) % nodes.length;
            }

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

function loadBenchmark(nodeCount: number): void {
    const data = createData(nodeCount);

    graph.setData(data);
    graph.resetCamera();

    if (nodeCountElement) {
        nodeCountElement.textContent = String(data.nodes.length);
    }

    if (linkCountElement) {
        linkCountElement.textContent = String(data.links.length);
    }

    sizeButtons.forEach((button) => {
        button.classList.toggle(
            "is-active",
            Number(button.dataset.size) === nodeCount,
        );
    });
}

function recreateGraph(): void {
    graph.destroy();

    graph = createGraph(flowInput?.checked ?? false);

    loadBenchmark(currentSize);
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

sizeButtons.forEach((button) => {
    button.addEventListener("click", () => {
        const size = Number(button.dataset.size);

        if (!Number.isFinite(size)) {
            return;
        }

        currentSize = size;
        loadBenchmark(currentSize);
    });
});

regenerateButton?.addEventListener("click", () => {
    loadBenchmark(currentSize);
});

flowInput?.addEventListener("change", () => {
    recreateGraph();
});

graph = createGraph(flowInput?.checked ?? false);

loadBenchmark(currentSize);
requestAnimationFrame(measureFps);