import { createOrbitGraph } from "@orbitgraph/three";
import type {
    GraphData,
    GraphDataSource,
    GraphLink,
    GraphNode,
} from "@orbitgraph/core";

import "./style.css";

const rootNodeId = "central-library";
const pageSize = 2;

const nodes: GraphNode[] = [
    {
        id: rootNodeId,
        label: "Central Library",
        type: "organization",
        color: "#22d3ee",
        size: 1.25,
        data: { city: "Riverton", role: "community hub" },
    },
    {
        id: "reading-club",
        label: "Reading Club",
        type: "group",
        color: "#a855f7",
        data: { members: 48 },
    },
    {
        id: "science-workshop",
        label: "Science Workshop",
        type: "group",
        color: "#3b82f6",
        data: { members: 31 },
    },
    {
        id: "public-archive",
        label: "Public Archive",
        type: "resource",
        color: "#f472b6",
    },
    {
        id: "local-history",
        label: "Local History Team",
        type: "group",
        color: "#facc15",
    },
    {
        id: "volunteer-network",
        label: "Volunteer Network",
        type: "network",
        color: "#34d399",
    },
];

const links: GraphLink[] = [
    {
        id: "library-hosts-reading",
        source: rootNodeId,
        target: "reading-club",
        type: "hosts",
        weight: 1,
    },
    {
        id: "library-hosts-science",
        source: rootNodeId,
        target: "science-workshop",
        type: "hosts",
        weight: 0.92,
    },
    {
        id: "library-manages-archive",
        source: rootNodeId,
        target: "public-archive",
        type: "manages",
        weight: 0.86,
    },
    {
        id: "archive-supports-history",
        source: "public-archive",
        target: "local-history",
        type: "supports",
        weight: 0.74,
    },
    {
        id: "reading-connects-volunteers",
        source: "reading-club",
        target: "volunteer-network",
        type: "connects",
        weight: 0.67,
    },
];

const dataSource: GraphDataSource = {
    async getNode(nodeId) {
        await delay(180);

        return nodes.find((node) => node.id === nodeId);
    },
    async getNeighborhood({ nodeId, direction = "both", limit = pageSize, offset = 0 }) {
        await delay(280);

        const matchingLinks = links.filter((link) => {
            if (direction === "outgoing") {
                return link.source === nodeId;
            }

            if (direction === "incoming") {
                return link.target === nodeId;
            }

            return link.source === nodeId || link.target === nodeId;
        });

        const page = matchingLinks.slice(offset, offset + limit);
        const nodeIds = new Set<string>([nodeId]);

        for (const link of page) {
            nodeIds.add(link.source);
            nodeIds.add(link.target);
        }

        return {
            nodes: nodes.filter((node) => nodeIds.has(node.id)),
            links: page,
            hasMore: offset + page.length < matchingLinks.length,
            nextOffset: offset + page.length,
        };
    },
};

const initialData: GraphData = {
    nodes: [nodes[0]],
    links: [],
};

const container = document.querySelector<HTMLElement>("#graph");
const loadButton = document.querySelector<HTMLButtonElement>("#load-neighborhood");
const resetButton = document.querySelector<HTMLButtonElement>("#reset-exploration");
const showAllButton = document.querySelector<HTMLButtonElement>("#show-all");
const degreeButton = document.querySelector<HTMLButtonElement>("#analyze-degree");
const pageRankButton = document.querySelector<HTMLButtonElement>("#analyze-pagerank");
const betweennessButton = document.querySelector<HTMLButtonElement>("#analyze-betweenness");
const communitiesButton = document.querySelector<HTMLButtonElement>("#detect-communities");
const clearVisualizationButton = document.querySelector<HTMLButtonElement>("#clear-visualization");
const exportButton = document.querySelector<HTMLButtonElement>("#export-json");
const loadingState = document.querySelector<HTMLElement>("#loading-state");
const visibleData = document.querySelector<HTMLElement>("#visible-data");
const analyticsState = document.querySelector<HTMLElement>("#analytics-state");
const analyticsLegend = document.querySelector<HTMLElement>("#analytics-legend");
const message = document.querySelector<HTMLElement>("#message");

if (!container) {
    throw new Error("Graph container was not found.");
}

let nextOffset = 0;

const graph = createOrbitGraph(container, {
    backgroundColor: "#050816",
    initialView: { mode: "node", nodeId: rootNodeId },
    dataSource,
    physics: {
        worker: true,
        tickRate: 60,
    },
    linkFlow: {
        enabled: true,
        maxParticles: 80,
        particleSize: 0.07,
        particleSpeed: 0.1,
    },
    onLoadingChange: (state) => {
        if (loadingState) {
            loadingState.textContent = state.loading
                ? `Loading ${state.operation ?? "data"}…`
                : state.error
                    ? "Request failed"
                    : "Idle";
        }

        if (state.error && message) {
            message.textContent = state.error.message;
        }
    },
    onVisibleDataChange: ({ nodes: visibleNodes, links: visibleLinks }) => {
        if (visibleData) {
            visibleData.textContent = `${visibleNodes.length} nodes · ${visibleLinks.length} relationships`;
        }
    },
    onDiagnostic: (diagnostic) => {
        console.error(diagnostic);

        if (message) {
            message.textContent = `[${diagnostic.code}] ${diagnostic.message}`;
        }
    },
});

graph.setData(initialData);
graph.resetCamera();

loadButton?.addEventListener("click", async () => {
    try {
        const result = await graph.loadNeighborhood(rootNodeId, {
            direction: "outgoing",
            limit: pageSize,
            offset: nextOffset,
        });

        nextOffset = result?.nextOffset ?? nextOffset;

        if (message) {
            message.textContent = result?.hasMore
                ? "Loaded one relationship page. More data is available."
                : "All direct relationships are loaded.";
        }
    } catch {
        // Diagnostics and loading state already provide UI feedback.
    }
});

resetButton?.addEventListener("click", () => {
    nextOffset = 0;
    graph.resetExploration();
    graph.resetCamera();

    if (message) {
        message.textContent = "Returned to the initial node.";
    }
});

showAllButton?.addEventListener("click", () => {
    graph.showAll();
    graph.resetCamera();
});

degreeButton?.addEventListener("click", () => {
    const degree = graph.analytics.degree({ scope: "visible" });
    const rankedNodes = Object.entries(degree)
        .sort(([, left], [, right]) => right.degree - left.degree);
    const topNode = rankedNodes[0];

    setAnalyticsMessage(
        topNode
            ? `Degree: ${getNodeLabel(topNode[0])} has ${topNode[1].degree} visible relationships.`
            : "Degree: no visible relationships.",
    );

    applyMetricPresentation(
        Object.fromEntries(
            Object.entries(degree).map(([nodeId, metric]) => [
                nodeId,
                metric.degree,
            ]),
            "#22d3ee",
            "#8b5cf6",
        );
    setLegend([]);
});

pageRankButton?.addEventListener("click", () => {
    const result = graph.analytics.pageRank({ scope: "visible" });
    const topNode = getTopScore(result.scores);

    setAnalyticsMessage(
        topNode
            ? `PageRank: ${getNodeLabel(topNode[0])} ranks highest at ${topNode[1].toFixed(3)} (${result.iterations} iterations).`
            : "PageRank: no visible nodes.",
    );

    applyMetricPresentation(result.scores, "#38bdf8", "#f8fafc");
    setLegend([]);
});

betweennessButton?.addEventListener("click", () => {
    const scores = graph.analytics.betweenness({
        scope: "visible",
        normalized: true,
    });
    const topNode = getTopScore(scores);

    setAnalyticsMessage(
        topNode
            ? `Betweenness: ${getNodeLabel(topNode[0])} is the strongest visible bridge at ${topNode[1].toFixed(3)}.`
            : "Betweenness: no visible nodes.",
    );

    applyMetricPresentation(scores, "#f59e0b", "#fef3c7");
    setLegend([]);
});

communitiesButton?.addEventListener("click", async () => {
    communitiesButton.disabled = true;
    setAnalyticsMessage("Communities: analyzing the visible graph…");

    try {
        const result = await graph.analytics.detectCommunitiesAsync({
            scope: "visible",
            weighted: true,
        });
        const largest = result.communities[0];

        setAnalyticsMessage(
            largest
                ? `Communities: found ${result.communities.length}. Largest group has ${largest.size} nodes (${result.iterations} passes).`
                : "Communities: no visible nodes.",
        );
        applyCommunityPresentation(result.communities);
    } finally {
        communitiesButton.disabled = false;
    }
});

clearVisualizationButton?.addEventListener("click", () => {
    graph.presentation.clearNodeStyles();
    setAnalyticsMessage("Visualization cleared. Source colors and sizes restored.");
    setLegend([]);
});

exportButton?.addEventListener("click", () => {
    graph.downloadJSON({
        scope: "visible",
        fileName: "community-explorer.json",
    });
});

function delay(milliseconds: number): Promise<void> {
    return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function getTopScore(scores: Record<string, number>): [string, number] | undefined {
    return Object.entries(scores).sort(([, left], [, right]) => right - left)[0];
}

function getNodeLabel(nodeId: string): string {
    return nodes.find((node) => node.id === nodeId)?.label ?? nodeId;
}

function setAnalyticsMessage(value: string): void {
    if (analyticsState) {
        analyticsState.textContent = value;
    }
}

function applyMetricPresentation(
    scores: Record<string, number>,
    lowColor: string,
    highColor: string,
): void {
    const highestScore = Math.max(...Object.values(scores), 0);

    graph.presentation.setNodeStyles(
        Object.fromEntries(
            Object.entries(scores).map(([nodeId, score]) => {
                const strength = highestScore > 0 ? score / highestScore : 0;

                return [
                    nodeId,
                    {
                        color: interpolateColor(lowColor, highColor, strength),
                        scale: 0.9 + strength * 0.8,
                        glow: strength * 0.9,
                    },
                ];
            }),
        ),
    );
}

function applyCommunityPresentation(
    communities: Array<{ id: string; size: number; nodeIds: string[] }>,
): void {
    const palette = ["#22d3ee", "#a855f7", "#f472b6", "#facc15", "#34d399", "#60a5fa"];
    const styles: Record<string, { color: string; scale: number; glow: number }> = {};

    communities.forEach((community, index) => {
        const color = palette[index % palette.length];

        for (const nodeId of community.nodeIds) {
            styles[nodeId] = {
                color,
                scale: 1 + Math.min(community.size, 8) * 0.025,
                glow: 0.35,
            };
        }
    });

    graph.presentation.setNodeStyles(styles);
    setLegend(
        communities.map((community, index) => ({
            color: palette[index % palette.length],
            label: `Community ${index + 1} · ${community.size} nodes`,
        })),
    );
}

function setLegend(items: Array<{ color: string; label: string }>): void {
    if (!analyticsLegend) {
        return;
    }

    analyticsLegend.replaceChildren(
        ...items.map((item) => {
            const row = document.createElement("span");
            const swatch = document.createElement("i");

            row.className = "legend-item";
            swatch.className = "legend-swatch";
            swatch.style.background = item.color;
            row.append(swatch, item.label);

            return row;
        }),
    );
    analyticsLegend.hidden = items.length === 0;
}

function interpolateColor(start: string, end: string, amount: number): string {
    const startColor = parseInt(start.slice(1), 16);
    const endColor = parseInt(end.slice(1), 16);
    const mix = (shift: number): number => {
        const startChannel = (startColor >> shift) & 0xff;
        const endChannel = (endColor >> shift) & 0xff;

        return Math.round(startChannel + (endChannel - startChannel) * amount);
    };

    return `#${[mix(16), mix(8), mix(0)]
        .map((channel) => channel.toString(16).padStart(2, "0"))
        .join("")}`;
}