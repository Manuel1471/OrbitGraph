import { createOrbitGraph } from "@orbitgraph/three";
import type { GraphData, GraphLayout } from "@orbitgraph/core";

import "./style.css";

const data: GraphData = {
    nodes: [
        { id: "product", label: "Product Team", type: "team", color: "#22d3ee", size: 1.25, data: { department: "Product" } },
        { id: "design", label: "Design Studio", type: "team", color: "#a855f7", data: { department: "Design" } },
        { id: "platform", label: "Platform Team", type: "team", color: "#3b82f6", data: { department: "Engineering" } },
        { id: "workspace", label: "Workspace", type: "resource", color: "#facc15", data: { status: "active" } },
        { id: "catalog", label: "Service Catalog", type: "service", color: "#34d399", data: { tier: "core" } },
        { id: "delivery", label: "Delivery API", type: "service", color: "#fb7185", data: { protocol: "HTTPS" } },
        { id: "events", label: "Event Stream", type: "service", color: "#818cf8", data: { retentionDays: 14 } },
        { id: "warehouse", label: "Analytics Warehouse", type: "database", color: "#f472b6", data: { environment: "production" } },
    ],
    links: [
        { id: "product-manages-workspace", source: "product", target: "workspace", type: "manages", weight: 1 },
        { id: "product-works-design", source: "product", target: "design", type: "collaborates-with", weight: 0.9 },
        { id: "product-uses-catalog", source: "product", target: "catalog", type: "uses", weight: 0.85 },
        { id: "platform-owns-catalog", source: "platform", target: "catalog", type: "owns", weight: 1 },
        { id: "workspace-uses-delivery", source: "workspace", target: "delivery", type: "uses", weight: 0.9 },
        { id: "delivery-emits-events", source: "delivery", target: "events", type: "emits", weight: 0.7 },
        { id: "events-stores-warehouse", source: "events", target: "warehouse", type: "stores-data-in", weight: 0.8 },
        { id: "catalog-reads-warehouse", source: "catalog", target: "warehouse", type: "reads-from", weight: 0.55 },
    ],
};

const container = document.querySelector<HTMLElement>("#graph");
const nodeCount = document.querySelector<HTMLElement>("#node-count");
const linkCount = document.querySelector<HTMLElement>("#link-count");
const search = document.querySelector<HTMLInputElement>("#search");
const layout = document.querySelector<HTMLSelectElement>("#layout");
const flow = document.querySelector<HTMLInputElement>("#link-flow");
const details = document.querySelector<HTMLElement>("#details");
const detailTitle = document.querySelector<HTMLElement>("#detail-title");
const detailSubtitle = document.querySelector<HTMLElement>("#detail-subtitle");
const detailData = document.querySelector<HTMLElement>("#detail-data");

if (!container) {
    throw new Error("Graph container was not found.");
}

const graph = createOrbitGraph(container, {
    backgroundColor: "#050816",
    linkColor: "#6366f1",
    linkOpacity: 0.5,
    initialView: {
        mode: "node",
        nodeId: "product",
    },
    onVisibleDataChange: ({ nodes, links }) => {
        if (nodeCount) nodeCount.textContent = String(nodes.length);
        if (linkCount) linkCount.textContent = String(links.length);
    },
    onSelectionChange: (selection) => {
        if (!details || !detailTitle || !detailSubtitle || !detailData) return;

        if (!selection) {
            details.classList.add("is-empty");
            detailTitle.textContent = "Select a node or relationship";
            detailSubtitle.textContent = "Metadata will appear here.";
            detailData.textContent = "";
            return;
        }

        details.classList.remove("is-empty");

        if (selection.kind === "node") {
            detailTitle.textContent = selection.node.label ?? selection.node.id;
            detailSubtitle.textContent = `Node · ${selection.node.type ?? "untyped"}`;
            detailData.textContent = JSON.stringify(selection.node.data ?? {}, null, 2);
            return;
        }

        detailTitle.textContent = selection.link.type ?? "Relationship";
        detailSubtitle.textContent = `${selection.link.source} → ${selection.link.target}`;
        detailData.textContent = JSON.stringify(selection.link.data ?? {}, null, 2);
    },
});

graph.setData(data);
graph.resetCamera();

document.querySelector("#expand")?.addEventListener("click", () => {
    graph.expandNode("product", { depth: 2, direction: "both" });
});

document.querySelector("#collapse")?.addEventListener("click", () => {
    graph.collapseNode("product");
});

document.querySelector("#reset")?.addEventListener("click", () => {
    graph.resetExploration();
    graph.resetCamera();
});

document.querySelector("#show-all")?.addEventListener("click", () => {
    graph.showAll();
    graph.resetCamera();
});

document.querySelector("#focus-path")?.addEventListener("click", () => {
    graph.focusPath("product", "warehouse", { direction: "outgoing" });
});

document.querySelector("#back")?.addEventListener("click", () => graph.goBack());
document.querySelector("#forward")?.addEventListener("click", () => graph.goForward());

search?.addEventListener("input", () => graph.search(search.value));

layout?.addEventListener("change", () => {
    graph.setLayout(layout.value as GraphLayout, { rootId: "product" });
});

flow?.addEventListener("change", () => {
    graph.setLinkFlow({
        enabled: flow.checked,
        maxParticles: 100,
        particleSize: 0.07,
        particleSpeed: 0.1,
    });
});