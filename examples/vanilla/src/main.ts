import { createOrbitGraph } from "@orbitgraph/three";
import type { GraphData, GraphSelection } from "@orbitgraph/core";

import "./style.css";

const data: GraphData = {
    nodes: [
        {
            id: "northstar",
            label: "Northstar Organization",
            type: "organization",
            color: "#22d3ee",
            size: 1.35,
            data: { region: "North", status: "active" },
        },
        {
            id: "product",
            label: "Product Group",
            type: "team",
            color: "#a855f7",
            data: { members: 12 },
        },
        {
            id: "platform",
            label: "Platform Group",
            type: "team",
            color: "#3b82f6",
            data: { members: 8 },
        },
        {
            id: "workspace",
            label: "Shared Workspace",
            type: "resource",
            color: "#facc15",
        },
        {
            id: "catalog",
            label: "Service Catalog",
            type: "service",
            color: "#34d399",
        },
        {
            id: "analytics",
            label: "Analytics Service",
            type: "service",
            color: "#fb7185",
        },
    ],
    links: [
        { source: "northstar", target: "product", type: "contains", weight: 1 },
        { source: "northstar", target: "platform", type: "contains", weight: 1 },
        { source: "product", target: "workspace", type: "uses", weight: 0.8 },
        { source: "platform", target: "catalog", type: "operates", weight: 0.9 },
        { source: "workspace", target: "analytics", type: "reports-to", weight: 0.6 },
    ],
};

const container = document.querySelector<HTMLElement>("#graph");
const nodeCount = document.querySelector<HTMLElement>("#node-count");
const linkCount = document.querySelector<HTMLElement>("#link-count");
const detailTitle = document.querySelector<HTMLElement>("#detail-title");
const detailSubtitle = document.querySelector<HTMLElement>("#detail-subtitle");
const detailData = document.querySelector<HTMLElement>("#detail-data");

if (!container) {
    throw new Error("Graph container was not found.");
}

function showSelection(selection: GraphSelection): void {
    if (!detailTitle || !detailSubtitle || !detailData) {
        return;
    }

    if (!selection) {
        detailTitle.textContent = "Explore the network";
        detailSubtitle.textContent = "Select a node, use the keyboard, or reveal its relationships.";
        detailData.textContent = "";
        return;
    }

    if (selection.kind === "node") {
        detailTitle.textContent = selection.node.label ?? selection.node.id;
        detailSubtitle.textContent = `Node · ${selection.node.type ?? "untyped"}`;
        detailData.textContent = JSON.stringify(selection.node.data ?? selection.node, null, 2);
        return;
    }

    detailTitle.textContent = selection.link.type ?? "Relationship";
    detailSubtitle.textContent = `${selection.link.source} → ${selection.link.target}`;
    detailData.textContent = JSON.stringify(selection.link.data ?? selection.link, null, 2);
}

const graph = createOrbitGraph(container, {
    backgroundColor: "#050816",
    initialView: { mode: "node", nodeId: "northstar" },
    linkFlow: {
        enabled: true,
        maxParticles: 80,
        particleSize: 0.07,
        particleSpeed: 0.1,
    },
    mobileControls: {
        enabled: "auto",
        position: "bottom-right",
    },
    accessibility: {
        ariaLabel: "Northstar relationship explorer",
    },
    onSelectionChange: showSelection,
    onKeyboardFocusChange: (node) => {
        if (node) {
            detailSubtitle!.textContent = `Keyboard focus · ${node.label ?? node.id}`;
        }
    },
    onVisibleDataChange: ({ nodes, links }) => {
        if (nodeCount) nodeCount.textContent = String(nodes.length);
        if (linkCount) linkCount.textContent = String(links.length);
    },
});

document.querySelector("#expand-root")?.addEventListener("click", () => {
    graph.expandNode("northstar", { depth: 2, direction: "outgoing" });
});

document.querySelector("#show-all")?.addEventListener("click", () => graph.showAll());
document.querySelector("#reset-exploration")?.addEventListener("click", () => graph.resetExploration());
document.querySelector("#focus-root")?.addEventListener("click", () => graph.focusNode("northstar"));
document.querySelector("#reset-camera")?.addEventListener("click", () => graph.resetCamera());

document.querySelector("#export-png")?.addEventListener("click", async () => {
    await graph.downloadPNG("northstar-network.png");
});

document.querySelector("#export-json")?.addEventListener("click", () => {
    graph.downloadJSON({
        scope: "visible",
        fileName: "northstar-visible-network.json",
    });
});

graph.setData(data);