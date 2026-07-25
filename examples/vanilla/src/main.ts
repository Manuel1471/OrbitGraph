import { createOrbitGraph } from "@orbitgraph/three";
import type {
    GraphCommunity,
    GraphData,
    GraphDataSource,
    GraphDiagnostic,
    GraphLoadingState,
    GraphSelection,
    VisibleGraphData,
} from "@orbitgraph/core";

import "./style.css";

const rootNodeId = "city-lab";
const pageSize = 2;

const sourceData: GraphData = {
    nodes: [
        { id: rootNodeId, label: "City Innovation Lab", type: "organization", color: "#22d3ee", size: 1.3 },
        { id: "mobility-team", label: "Mobility Team", type: "team", color: "#a855f7" },
        { id: "open-data", label: "Open Data Portal", type: "service", color: "#3b82f6" },
        { id: "civic-design", label: "Civic Design Group", type: "team", color: "#f472b6" },
        { id: "research-network", label: "Research Network", type: "network", color: "#34d399" },
    ],
    links: [
        { id: "lab-leads-mobility", source: rootNodeId, target: "mobility-team", type: "leads", weight: 1 },
        { id: "lab-operates-data", source: rootNodeId, target: "open-data", type: "operates", weight: 0.9 },
        { id: "lab-coordinates-design", source: rootNodeId, target: "civic-design", type: "coordinates", weight: 0.82 },
        { id: "data-connects-research", source: "open-data", target: "research-network", type: "connects", weight: 0.72 },
    ],
};

const initialData: GraphData = { nodes: [sourceData.nodes[0]], links: [] };

const source: GraphDataSource = {
    async getNode(nodeId) {
        await delay(180);
        return sourceData.nodes.find((node) => node.id === nodeId);
    },
    async getNeighborhood({ nodeId, direction = "both", limit = pageSize, offset = 0 }) {
        await delay(280);

        const matchingLinks = sourceData.links.filter((link) => {
            if (direction === "outgoing") return link.source === nodeId;
            if (direction === "incoming") return link.target === nodeId;
            return link.source === nodeId || link.target === nodeId;
        });
        const links = matchingLinks.slice(offset, offset + limit);
        const nodeIds = new Set<string>([nodeId]);

        for (const link of links) {
            nodeIds.add(link.source);
            nodeIds.add(link.target);
        }

        return {
            nodes: sourceData.nodes.filter((node) => nodeIds.has(node.id)),
            links,
            hasMore: offset + links.length < matchingLinks.length,
            nextOffset: offset + links.length,
        };
    },
};

const container = requiredElement<HTMLElement>("#graph");
const loadNextButton = requiredElement<HTMLButtonElement>("#load-next");
const resetButton = requiredElement<HTMLButtonElement>("#reset-exploration");
const showAllButton = requiredElement<HTMLButtonElement>("#show-all");
const exportButton = requiredElement<HTMLButtonElement>("#export-png");
const loadingElement = requiredElement<HTMLElement>("#loading-state");
const visibleElement = requiredElement<HTMLElement>("#visible-summary");
const messageElement = requiredElement<HTMLElement>("#message");
const analyticsTitle = requiredElement<HTMLElement>("#analytics-title");
const analyticsDescription = requiredElement<HTMLElement>("#analytics-description");
const analyticsLegend = requiredElement<HTMLElement>("#analytics-legend");
const detailsTitle = requiredElement<HTMLElement>("#details-title");
const detailsDescription = requiredElement<HTMLElement>("#details-description");
const detailsData = requiredElement<HTMLPreElement>("#details-data");

let nextOffset = 0;
let visibleData: VisibleGraphData = initialData;

const graph = createOrbitGraph(container, {
    backgroundColor: "#050816",
    initialView: { mode: "node", nodeId: rootNodeId },
    dataSource: source,
    labels: {
        mode: "important",
        importantNodeIds: [rootNodeId],
        maxVisible: 18,
        showNodeType: true,
    },
    miniMap: {
        enabled: true,
        position: "bottom-right",
        interactive: true,
    },
    physics: { worker: true, tickRate: 60 },
    linkFlow: { enabled: true, maxParticles: 80, particleSize: 0.07, particleSpeed: 0.1 },
    onLoadingChange: updateLoadingState,
    onVisibleDataChange: updateVisibleData,
    onDiagnostic: handleDiagnostic,
    onSelectionChange: updateSelection,
});

graph.setData(initialData);

loadNextButton.addEventListener("click", async () => {
    try {
        const result = await graph.loadNeighborhood(rootNodeId, {
            direction: "outgoing",
            limit: pageSize,
            offset: nextOffset,
        });

        if (!result) return;

        nextOffset = result.nextOffset ?? nextOffset;
        setMessage(result.hasMore
            ? "Loaded one relationship page. More data is available."
            : "All direct relationships are loaded.");
    } catch {
        // onDiagnostic and onLoadingChange provide visible feedback.
    }
});

resetButton.addEventListener("click", () => {
    nextOffset = 0;
    graph.resetExploration();
    graph.resetCamera();
    setMessage("Returned to the initial node.");
});

showAllButton.addEventListener("click", () => graph.showAll());
exportButton.addEventListener("click", () => void graph.downloadPNG("city-explorer.png"));

requiredElement<HTMLButtonElement>("#analyze-degree").addEventListener("click", analyzeDegree);
requiredElement<HTMLButtonElement>("#analyze-page-rank").addEventListener("click", analyzePageRank);
requiredElement<HTMLButtonElement>("#analyze-betweenness").addEventListener("click", analyzeBetweenness);
requiredElement<HTMLButtonElement>("#detect-communities").addEventListener("click", () => void detectCommunities());
requiredElement<HTMLButtonElement>("#clear-visualization").addEventListener("click", () => {
    graph.presentation.clearNodeStyles();
    setAnalytics("Visualization cleared", "Source colors and sizes have been restored.");
    renderLegend([]);
});

function analyzeDegree(): void {
    const result = graph.analytics.degree({ scope: "visible" });
    const scores = Object.fromEntries(Object.entries(result).map(([id, metric]) => [id, metric.degree]));
    const top = getTopEntry(scores);

    setAnalytics(
        "Degree centrality",
        top ? `${nodeLabel(top[0])} has the most direct visible relationships (${top[1]}).` : "There are no visible relationships to analyze yet.",
    );
    applyMetricPresentation(scores, "#22d3ee", "#8b5cf6");
    renderLegend([]);
}

function analyzePageRank(): void {
    const result = graph.analytics.pageRank({ scope: "visible" });
    const top = getTopEntry(result.scores);

    setAnalytics(
        "PageRank influence",
        top ? `${nodeLabel(top[0])} has the highest influence score (${top[1].toFixed(3)}).` : "There are no visible nodes to analyze yet.",
    );
    applyMetricPresentation(result.scores, "#38bdf8", "#f8fafc");
    renderLegend([]);
}

function analyzeBetweenness(): void {
    const scores = graph.analytics.betweenness({ scope: "visible", normalized: true });
    const top = getTopEntry(scores);

    setAnalytics(
        "Bridge node",
        top ? `${nodeLabel(top[0])} is the strongest connector between visible groups (${top[1].toFixed(3)}).` : "There are no visible nodes to analyze yet.",
    );
    applyMetricPresentation(scores, "#f59e0b", "#fef3c7");
    renderLegend([]);
}

async function detectCommunities(): Promise<void> {
    setAnalytics("Community detection", "Finding clusters in the visible graph…");

    const result = await graph.analytics.detectCommunitiesAsync({
        scope: "visible",
        weighted: true,
    });
    const largest = result.communities[0];

    setAnalytics(
        largest ? `${result.communities.length} communities detected` : "No communities detected",
        largest ? `The largest visible community contains ${largest.size} nodes.` : "There are no visible nodes to analyze yet.",
    );
    applyCommunityPresentation(result.communities);
}

function applyMetricPresentation(scores: Record<string, number>, lowColor: string, highColor: string): void {
    const highest = Math.max(...Object.values(scores), 0);

    graph.presentation.setNodeStyles(
        Object.fromEntries(Object.entries(scores).map(([nodeId, score]) => {
            const strength = highest > 0 ? score / highest : 0;

            return [nodeId, {
                color: interpolateColor(lowColor, highColor, strength),
                scale: 0.9 + strength * 0.8,
                glow: strength * 0.9,
            }];
        })),
    );
}

function applyCommunityPresentation(communities: GraphCommunity[]): void {
    const palette = ["#22d3ee", "#a855f7", "#f472b6", "#facc15", "#34d399", "#60a5fa"];
    const styles: Record<string, { color: string; scale: number; glow: number }> = {};

    communities.forEach((community, index) => {
        const color = palette[index % palette.length];

        community.nodeIds.forEach((nodeId) => {
            styles[nodeId] = {
                color,
                scale: 1 + Math.min(community.size, 8) * 0.025,
                glow: 0.35,
            };
        });
    });

    graph.presentation.setNodeStyles(styles);
    renderLegend(communities.map((community, index) => ({
        color: palette[index % palette.length],
        label: `Community ${index + 1} · ${community.size} nodes`,
    })));
}

function updateLoadingState(state: GraphLoadingState): void {
    loadingElement.textContent = state.loading
        ? `Loading ${state.operation}…`
        : state.error
            ? "Request failed"
            : "Idle";
}

function updateVisibleData(data: VisibleGraphData): void {
    visibleData = data;
    visibleElement.textContent = `${data.nodes.length} ${pluralize(data.nodes.length, "node")} · ${data.links.length} ${pluralize(data.links.length, "link")}`;
}

function updateSelection(selection: GraphSelection): void {
    if (!selection) {
        detailsTitle.textContent = "Nothing selected";
        detailsDescription.textContent = "Click a node or relationship to inspect it.";
        detailsData.hidden = true;
        return;
    }

    const item = selection.kind === "node" ? selection.node : selection.link;
    const label = selection.kind === "node"
        ? item.label ?? item.id
        : `${item.source} → ${item.target}`;

    detailsTitle.textContent = label;
    detailsDescription.textContent = selection.kind === "node"
        ? `${item.type ?? "Node"} · ${item.id}`
        : `${item.type ?? "Relationship"}${item.weight !== undefined ? ` · weight ${item.weight}` : ""}`;
    detailsData.textContent = JSON.stringify(item.data ?? item, null, 2);
    detailsData.hidden = false;
}

function handleDiagnostic(diagnostic: GraphDiagnostic): void {
    console.error(diagnostic);
    setMessage(`[${diagnostic.code}] ${diagnostic.message}`);
}

function setAnalytics(title: string, description: string): void {
    analyticsTitle.textContent = title;
    analyticsDescription.textContent = description;
}

function renderLegend(items: Array<{ color: string; label: string }>): void {
    analyticsLegend.replaceChildren();
    analyticsLegend.hidden = items.length === 0;

    items.forEach((item) => {
        const row = document.createElement("span");
        row.className = "legend-item";
        const swatch = document.createElement("i");
        swatch.className = "legend-swatch";
        swatch.style.backgroundColor = item.color;
        row.append(swatch, document.createTextNode(item.label));
        analyticsLegend.append(row);
    });
}

function setMessage(message: string): void {
    messageElement.textContent = message;
}

function getTopEntry(scores: Record<string, number>): [string, number] | undefined {
    return Object.entries(scores).sort(([, left], [, right]) => right - left)[0];
}

function nodeLabel(nodeId: string): string {
    return sourceData.nodes.find((node) => node.id === nodeId)?.label ?? nodeId;
}

function pluralize(value: number, singular: string): string {
    return `${singular}${value === 1 ? "" : "s"}`;
}

function interpolateColor(start: string, end: string, amount: number): string {
    const from = Number.parseInt(start.slice(1), 16);
    const to = Number.parseInt(end.slice(1), 16);
    const mix = (shift: number): number => Math.round(
        ((from >> shift) & 0xff) + (((to >> shift) & 0xff) - ((from >> shift) & 0xff)) * amount,
    );

    return `#${[mix(16), mix(8), mix(0)].map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

function delay(milliseconds: number): Promise<void> {
    return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function requiredElement<T extends HTMLElement>(selector: string): T {
    const element = document.querySelector<T>(selector);

    if (!element) {
        throw new Error(`Missing required element: ${selector}`);
    }

    return element;
}