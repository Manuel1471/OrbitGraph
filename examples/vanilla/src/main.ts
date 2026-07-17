import { createOrbitGraph } from "@orbitgraph/three";
import type { GraphData } from "@orbitgraph/core";

import "./style.css";

const data: GraphData = {
    nodes: [
        {
            id: "manuel",
            label: "Manuel",
            type: "person",
            color: "#22d3ee",
            size: 1.4,
            data: {
                location: "Monterrey",
            },
        },
        {
            id: "monetra",
            label: "Monetra",
            type: "project",
            color: "#a855f7",
            size: 1.2,
            data: {
                status: "in-development",
            },
        },
        {
            id: "api",
            label: "API",
            type: "service",
            color: "#3b82f6",
        },
    ],
    links: [
        {
            id: "manuel-owns-monetra",
            source: "manuel",
            target: "monetra",
            type: "owns",
            weight: 1,
        },
        {
            id: "monetra-uses-api",
            source: "monetra",
            target: "api",
            type: "uses",
            weight: 0.9,
        },
    ],
};

const container = document.querySelector<HTMLElement>("#graph");

if (!container) {
    throw new Error("Graph container was not found.");
}

const graph = createOrbitGraph(container, {
    onSelectionChange: (selection) => {
        console.log("Selection:", selection);
    },
});

graph.setData(data);
graph.resetCamera();