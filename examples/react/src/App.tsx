import { useRef, useState } from "react";

import {
    OrbitGraph,
    type OrbitGraphHandle,
} from "@orbitgraph/react";
import type {
    GraphData,
    GraphDataSource,
    GraphDiagnostic,
    GraphLoadingState,
    GraphCommunity,
    GraphSelection,
    VisibleGraphData,
} from "@orbitgraph/core";
import { graphThemes } from "@orbitgraph/core";

const rootNodeId = "city-lab";
const pageSize = 2;

const sourceData: GraphData = {
    nodes: [
        {
            id: rootNodeId,
            label: "City Innovation Lab",
            type: "organization",
            color: "#22d3ee",
            size: 1.3,
        },
        {
            id: "mobility-team",
            label: "Mobility Team",
            type: "team",
            color: "#a855f7",
        },
        {
            id: "open-data",
            label: "Open Data Portal",
            type: "service",
            color: "#3b82f6",
        },
        {
            id: "civic-design",
            label: "Civic Design Group",
            type: "team",
            color: "#f472b6",
        },
        {
            id: "research-network",
            label: "Research Network",
            type: "network",
            color: "#34d399",
        },
    ],
    links: [
        {
            id: "lab-leads-mobility",
            source: rootNodeId,
            target: "mobility-team",
            type: "leads",
            weight: 1,
        },
        {
            id: "lab-operates-data",
            source: rootNodeId,
            target: "open-data",
            type: "operates",
            weight: 0.9,
        },
        {
            id: "lab-coordinates-design",
            source: rootNodeId,
            target: "civic-design",
            type: "coordinates",
            weight: 0.82,
        },
        {
            id: "data-connects-research",
            source: "open-data",
            target: "research-network",
            type: "connects",
            weight: 0.72,
        },
    ],
};

/* Seed a meaningful first frame. Remaining relationships are still loaded remotely. */
const initialData: GraphData = {
    nodes: sourceData.nodes.slice(0, 3),
    links: sourceData.links.slice(0, 2),
};

const dataSource: GraphDataSource = {
    async getNode(nodeId) {
        await delay(180);

        return sourceData.nodes.find((node) => node.id === nodeId);
    },
    async getNeighborhood({ nodeId, direction = "both", limit = pageSize, offset = 0 }) {
        await delay(280);

        const matchingLinks = sourceData.links.filter((link) => {
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
            nodes: sourceData.nodes.filter((node) => nodeIds.has(node.id)),
            links: page,
            hasMore: offset + page.length < matchingLinks.length,
            nextOffset: offset + page.length,
        };
    },
};

const initialLoadingState: GraphLoadingState = {
    loading: false,
    operation: null,
    nodeId: null,
    error: null,
};

type AnalyticsInsight = {
    title: string;
    description: string;
};

type AnalyticsLegendItem = {
    color: string;
    label: string;
};

export function App() {
    const graphRef = useRef<OrbitGraphHandle>(null);
    const [loadingState, setLoadingState] = useState(initialLoadingState);
    const [visibleData, setVisibleData] = useState<VisibleGraphData>(initialData);
    const [message, setMessage] = useState("Ready to load relationship pages.");
    const [nextOffset, setNextOffset] = useState(2);
    const [analytics, setAnalytics] = useState<AnalyticsInsight>({
        title: "Ready to analyze",
        description: "Load relationships, then choose a metric to inspect the visible graph.",
    });
    const [analyticsLegend, setAnalyticsLegend] = useState<AnalyticsLegendItem[]>([]);
    const [selection, setSelection] = useState<GraphSelection>(null);
    const [renderMode, setRenderMode] = useState<"webgl" | "canvas">("webgl");
    const [themeName, setThemeName] = useState<keyof typeof graphThemes>("midnight");

    async function loadNextRelationships(): Promise<void> {
        try {
            const result = await graphRef.current?.loadNeighborhood(rootNodeId, {
                direction: "outgoing",
                limit: pageSize,
                offset: nextOffset,
            });

            if (!result) {
                return;
            }

            setNextOffset(result.nextOffset ?? nextOffset);
            setMessage(
                result.hasMore
                    ? "Loaded one relationship page. More data is available."
                    : "All direct relationships are loaded.",
            );
        } catch {
            // onDiagnostic and onLoadingChange update the visible feedback.
        }
    }

    function resetExploration(): void {
        setNextOffset(2);
        graphRef.current?.resetExploration();
        graphRef.current?.resetCamera();
        setMessage("Returned to the initial node.");
    }

    function handleDiagnostic(diagnostic: GraphDiagnostic): void {
        console.error(diagnostic);
        setMessage(`[${diagnostic.code}] ${diagnostic.message}`);
    }

    function analyzeDegree(): void {
        const result = graphRef.current?.getAnalytics().degree({ scope: "visible" });
        const topNode = result && getTopEntry(
            Object.fromEntries(Object.entries(result).map(([id, metric]) => [id, metric.degree])),
        );

        setAnalytics({
            title: "Degree centrality",
            description: topNode
                ? `${getNodeLabel(topNode[0])} has the most direct visible relationships (${topNode[1]}).`
                : "There are no visible relationships to analyze yet.",
        });
        applyMetricPresentation(
            result
                ? Object.fromEntries(
                    Object.entries(result).map(([nodeId, metric]) => [
                        nodeId,
                        metric.degree,
                    ]),
                )
                : {},
            "#22d3ee",
            "#8b5cf6",
        );
        setAnalyticsLegend([]);
    }

    function analyzePageRank(): void {
        const result = graphRef.current?.getAnalytics().pageRank({ scope: "visible" });
        const topNode = result && getTopEntry(result.scores);

        setAnalytics({
            title: "PageRank influence",
            description: topNode
                ? `${getNodeLabel(topNode[0])} has the highest influence score (${topNode[1].toFixed(3)}).`
                : "There are no visible nodes to analyze yet.",
        });
        applyMetricPresentation(result?.scores ?? {}, "#38bdf8", "#f8fafc");
        setAnalyticsLegend([]);
    }

    function analyzeBetweenness(): void {
        const result = graphRef.current?.getAnalytics().betweenness({
            scope: "visible",
            normalized: true,
        });
        const topNode = result && getTopEntry(result);

        setAnalytics({
            title: "Bridge node",
            description: topNode
                ? `${getNodeLabel(topNode[0])} is the strongest connector between visible groups (${topNode[1].toFixed(3)}).`
                : "There are no visible nodes to analyze yet.",
        });
        applyMetricPresentation(result ?? {}, "#f59e0b", "#fef3c7");
        setAnalyticsLegend([]);
    }

    async function detectCommunities(): Promise<void> {
        const graph = graphRef.current;

        if (!graph) {
            return;
        }

        setAnalytics({
            title: "Community detection",
            description: "Finding clusters in the visible graph…",
        });

        const result = await graph.getAnalytics().detectCommunitiesAsync({
            scope: "visible",
            weighted: true,
        });
        const largest = result.communities[0];

        setAnalytics(formatCommunityResult(result.communities.length, largest));
        applyCommunityPresentation(result.communities);
    }

    function clearVisualization(): void {
        graphRef.current?.getPresentation().clearNodeStyles();
        setAnalytics({
            title: "Visualization cleared",
            description: "Source colors and sizes have been restored.",
        });
        setAnalyticsLegend([]);
    }

    function applyMetricPresentation(
        scores: Record<string, number>,
        lowColor: string,
        highColor: string,
    ): void {
        const highestScore = Math.max(...Object.values(scores), 0);

        graphRef.current?.getPresentation().setNodeStyles(
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
        communities: GraphCommunity[],
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

        graphRef.current?.getPresentation().setNodeStyles(styles);
        setAnalyticsLegend(
            communities.map((community, index) => ({
                color: palette[index % palette.length],
                label: `Community ${index + 1} · ${community.size} nodes`,
            })),
        );
    }

    return (
        <main className="app">
            <aside className="panel">
                <span className="eyebrow">REACT + REMOTE DATA</span>
                <h1>City Explorer</h1>
                <p>
                    The graph starts with a useful neighborhood. Controls load the
                    remaining relationship pages through an application-defined data source.
                </p>

                <div className="settings-grid primary-controls">
                    <label className="example-select">Renderer
                        <select value={renderMode} onChange={(event) => setRenderMode(event.target.value as "webgl" | "canvas")}><option value="webgl">WebGL 3D</option><option value="canvas">Canvas 2D</option></select>
                    </label>
                    <label className="example-select">Theme
                        <select value={themeName} onChange={(event) => setThemeName(event.target.value as keyof typeof graphThemes)}><option value="midnight">Midnight</option><option value="dark">Dark</option><option value="light">Light</option></select>
                    </label>
                </div>

                <details className="analytics-panel" open>
                    <summary><span>Explore</span><span className="analytics-hint">Loading, camera, paths</span></summary>
                    <div className="controls analytics-controls">
                        <button type="button" onClick={loadNextRelationships}>Load next relationship page</button>
                        <button type="button" onClick={() => graphRef.current?.showAll()}>Show all loaded data</button>
                        <button type="button" onClick={resetExploration}>Reset exploration and camera</button>
                        <button type="button" onClick={() => { const route = graphRef.current?.findWeightedPath(rootNodeId, "research-network"); setMessage(route ? `Best route: ${route.nodeIds.join(" → ")}` : "Load the next page to complete the route."); }}>Find weighted route</button>
                        <button type="button" onClick={() => { graphRef.current?.setCameraMovementSpeed(120); setMessage("WASD/QE movement speed set to 120."); }}>Accelerate WASD camera</button>
                    </div>
                </details>

                <details className="analytics-panel">
                    <summary><span>Studio</span><span className="analytics-hint">Clusters, edit, selection</span></summary>
                    <div className="controls analytics-controls">
                        <button type="button" onClick={() => { const clusters = graphRef.current?.clusterCommunities() ?? []; if (clusters[0]) graphRef.current?.collapseCluster(clusters[0].id); setMessage(clusters[0] ? "Collapsed a community into an aggregate node." : "Load graph data first."); }}>Collapse a community</button>
                        <button type="button" onClick={() => { graphRef.current?.applyOperations([{ type: "add-node", node: { id: `draft-${Date.now()}`, label: "React draft", type: "draft", color: "#facc15" } }]); setMessage("Added a validated draft node. Undo it to inspect history."); }}>Add draft node</button>
                        <button type="button" onClick={() => setMessage(graphRef.current?.undo() ? "Undid the latest graph operation." : "Nothing to undo.")}>Undo edit</button>
                        <button type="button" onClick={() => setMessage(graphRef.current?.redo() ? "Redid the graph operation." : "Nothing to redo.")}>Redo edit</button>
                        <button type="button" onClick={() => setMessage(`Selected ${graphRef.current?.selectNodes(visibleData.nodes.map((node) => node.id)).length ?? 0} visible nodes.`)}>Select all visible nodes</button>
                        <button type="button" onClick={() => { graphRef.current?.setStyleRules([{ id: "important", when: { minDegree: 2 }, style: { color: "#facc15", scale: 1.4, glow: .8 } }]); setMessage("Applied a declarative degree-based style rule."); }}>Highlight hubs</button>
                    </div>
                </details>

                <details className="analytics-panel">
                    <summary><span>Share & export</span><span className="analytics-hint">Reports and state</span></summary>
                    <div className="controls analytics-controls">
                        <button type="button" onClick={() => graphRef.current?.downloadPNG("city-explorer.png")}>Export PNG</button>
                        <button type="button" onClick={() => graphRef.current?.downloadSVG("city-explorer.svg")}>Export vector SVG</button>
                        <button type="button" onClick={() => graphRef.current?.downloadPDF("city-explorer-report.pdf", { title: "React City Explorer" })}>Export PDF report</button>
                        <button type="button" onClick={() => { const shared = graphRef.current?.shareView(); if (shared) void navigator.clipboard?.writeText(shared); setMessage("Copied a shareable view state to the clipboard."); }}>Copy shareable view</button>
                        <button type="button" onClick={() => { graphRef.current?.saveBookmark("react-demo", "React dashboard"); graphRef.current?.addAnnotation({ id: `note-${Date.now()}`, target: { kind: "view" }, body: "Saved from the React demo.", createdAt: new Date().toISOString() }); setMessage("Saved bookmark and collaboration annotation."); }}>Save bookmark & note</button>
                    </div>
                </details>

                <details className="analytics-panel">
                    <summary>
                        <span>Analytics</span>
                        <span className="analytics-hint">
                            Centrality and communities
                        </span>
                    </summary>

                    <div className="controls analytics-controls">
                        <button type="button" onClick={analyzeDegree}>
                            Analyze degree centrality
                        </button>
                        <button type="button" onClick={analyzePageRank}>
                            Analyze PageRank
                        </button>
                        <button type="button" onClick={analyzeBetweenness}>
                            Analyze betweenness
                        </button>
                        <button type="button" onClick={detectCommunities}>
                            Detect communities
                        </button>
                        <button type="button" onClick={clearVisualization}>
                            Clear visualization
                        </button>
                    </div>
                </details>

                <section className="summary-grid" aria-label="Graph status">
                    <div className="summary-item">
                        <span>Loading</span>
                        <strong>
                            {loadingState.loading
                                ? `Loading ${loadingState.operation}…`
                                : loadingState.error
                                    ? "Request failed"
                                    : "Idle"}
                        </strong>
                    </div>

                    <div className="summary-item">
                        <span>Visible graph</span>
                        <strong>
                            {visibleData.nodes.length} nodes · {visibleData.links.length} links
                        </strong>
                    </div>
                </section>

                <section className="analytics-card" aria-live="polite">
                    <span className="analytics-label">Analytics insight</span>
                    <strong>{analytics.title}</strong>
                    <p>{analytics.description}</p>
                    {analyticsLegend.length > 0 && (
                        <div className="analytics-legend">
                            {analyticsLegend.map((item) => (
                                <span className="legend-item" key={item.label}>
                                    <i
                                        className="legend-swatch"
                                        style={{ backgroundColor: item.color }}
                                    />
                                    {item.label}
                                </span>
                            ))}
                        </div>
                    )}
                </section>

                <p className="message" role="status">
                    {message}
                </p>
            </aside>

            {selection && (
                <aside className="details-panel" aria-label="Selected graph item">
                    <div className="details-header">
                        <div>
                            <span className="eyebrow">
                                {selection.kind === "node" ? "NODE DETAILS" : "RELATIONSHIP DETAILS"}
                            </span>
                            <h2>
                                {selection.kind === "node"
                                    ? selection.node.label ?? selection.node.id
                                    : selection.link.type ?? "Relationship"}
                            </h2>
                        </div>

                        <button
                            className="close-details"
                            type="button"
                            aria-label="Close details"
                            onClick={() => setSelection(null)}
                        >
                            ×
                        </button>
                    </div>

                    {selection.kind === "node" ? (
                        <dl className="details-list">
                            <div><dt>Identifier</dt><dd>{selection.node.id}</dd></div>
                            <div><dt>Type</dt><dd>{selection.node.type ?? "Not specified"}</dd></div>
                            <div><dt>Visual size</dt><dd>{selection.node.size ?? "Default"}</dd></div>
                        </dl>
                    ) : (
                        <dl className="details-list">
                            <div><dt>Source</dt><dd>{getNodeLabel(selection.link.source)}</dd></div>
                            <div><dt>Target</dt><dd>{getNodeLabel(selection.link.target)}</dd></div>
                            <div><dt>Type</dt><dd>{selection.link.type ?? "Not specified"}</dd></div>
                            <div><dt>Weight</dt><dd>{selection.link.weight ?? "Default"}</dd></div>
                        </dl>
                    )}

                    <div className="details-metadata">
                        <span>Metadata</span>
                        <pre>
                            {JSON.stringify(
                                selection.kind === "node"
                                    ? selection.node.data ?? {}
                                    : selection.link.data ?? {},
                                null,
                                2,
                            )}
                        </pre>
                    </div>
                </aside>
            )}

            <OrbitGraph
                key={`${renderMode}-${themeName}`}
                ref={graphRef}
                data={initialData}
                className="graph"
                options={{
                    theme: graphThemes[themeName],
                    renderMode,
                    camera: { movementSpeed: 72, boostMultiplier: 3 },
                    initialView: { mode: "neighborhood", nodeId: rootNodeId, depth: 1, direction: "outgoing" },
                    dataSource,
                    labels: {
                        mode: "important",
                        maxVisible: 24,
                        importantNodeIds: [rootNodeId],
                        showNodeType: true,
                    },
                    miniMap: {
                        enabled: true,
                        position: "bottom-right",
                        interactive: true,
                    },
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
                }}
                onLoadingChange={setLoadingState}
                onVisibleDataChange={setVisibleData}
                onDiagnostic={handleDiagnostic}
                onSelectionChange={setSelection}
            />
        </main>
    );
}

function delay(milliseconds: number): Promise<void> {
    return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function getTopEntry(scores: Record<string, number>): [string, number] | undefined {
    return Object.entries(scores).sort(([, left], [, right]) => right - left)[0];
}

function getNodeLabel(nodeId: string): string {
    return sourceData.nodes.find((node) => node.id === nodeId)?.label ?? nodeId;
}

function formatCommunityResult(
    communityCount: number,
    largest: GraphCommunity | undefined,
): AnalyticsInsight {
    return largest
        ? {
            title: `${communityCount} communities detected`,
            description: `The largest visible community contains ${largest.size} nodes.`,
        }
        : {
            title: "No communities detected",
            description: "There are no visible nodes to analyze yet.",
        };
}

function interpolateColor(start: string, end: string, amount: number): string {
    const startColor = Number.parseInt(start.slice(1), 16);
    const endColor = Number.parseInt(end.slice(1), 16);
    const mix = (shift: number): number => {
        const startChannel = (startColor >> shift) & 0xff;
        const endChannel = (endColor >> shift) & 0xff;

        return Math.round(startChannel + (endChannel - startChannel) * amount);
    };

    return `#${[mix(16), mix(8), mix(0)]
        .map((channel) => channel.toString(16).padStart(2, "0"))
        .join("")}`;
}
