import { useRef, useState } from "react";

import {
    OrbitGraph,
    type OrbitGraphHandle,
} from "@orbitgraph/react";
import type {
    GraphData,
    GraphLayout,
    GraphLoadingState,
    GraphSelection,
    VisibleGraphData,
} from "@orbitgraph/core";

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

export function App() {
    const graphRef = useRef<OrbitGraphHandle>(null);
    const [selection, setSelection] = useState<GraphSelection>(null);
    const [visibleData, setVisibleData] = useState<VisibleGraphData>({ nodes: [], links: [] });
    const [loading, setLoading] = useState<GraphLoadingState>({ loading: false, operation: null, nodeId: null });
    const [search, setSearch] = useState("");
    const [flowEnabled, setFlowEnabled] = useState(false);

    const instance = () => graphRef.current?.getInstance() ?? null;

    function setLayout(layout: GraphLayout): void {
        instance()?.setLayout(layout, { rootId: "product" });
    }

    function changeFlow(enabled: boolean): void {
        setFlowEnabled(enabled);
        instance()?.setLinkFlow({
            enabled,
            maxParticles: 100,
            particleSize: 0.07,
            particleSpeed: 0.1,
        });
    }

    function changeSearch(value: string): void {
        setSearch(value);
        instance()?.search(value);
    }

    return (
        <main className="app">
            <aside className="panel controls">
                <span className="eyebrow">REACT EXAMPLE</span>
                <h1>Organization Map</h1>
                <p>Use a React ref to control progressive graph exploration.</p>

                <div className="stats">
                    <span><strong>{visibleData.nodes.length}</strong> visible nodes</span>
                    <span><strong>{visibleData.links.length}</strong> relationships</span>
                </div>

                <label className="control-label" htmlFor="layout">Layout</label>
                <select id="layout" defaultValue="force" onChange={(event) => setLayout(event.target.value as GraphLayout)}>
                    <option value="force">Force</option>
                    <option value="radial">Radial</option>
                    <option value="grid">Grid</option>
                    <option value="hierarchical">Hierarchical</option>
                </select>

                <label className="control-label" htmlFor="search">Search visible nodes</label>
                <input id="search" value={search} onChange={(event) => changeSearch(event.target.value)} placeholder="Search by name or type" />

                <div className="actions">
                    <button onClick={() => instance()?.expandNode("product", { depth: 2, direction: "both" })}>Reveal team connections</button>
                    <button onClick={() => instance()?.collapseNode("product")}>Collapse connections</button>
                    <button onClick={() => { instance()?.resetExploration(); instance()?.resetCamera(); }}>Reset exploration</button>
                    <button onClick={() => { instance()?.showAll(); instance()?.resetCamera(); }}>Show all loaded data</button>
                    <button onClick={() => instance()?.focusPath("product", "warehouse", { direction: "outgoing" })}>Focus delivery path</button>
                </div>

                <div className="history-actions">
                    <button onClick={() => instance()?.goBack()}>← Back</button>
                    <button onClick={() => instance()?.goForward()}>Forward →</button>
                </div>

                <label className="toggle">
                    <input type="checkbox" checked={flowEnabled} onChange={(event) => changeFlow(event.target.checked)} />
                    <span>Enable relationship flow</span>
                </label>

                {loading.loading && <p className="loading">Loading {loading.operation} for {loading.nodeId}…</p>}
            </aside>

            <aside className={`panel details ${selection ? "" : "is-empty"}`}>
                <span className="eyebrow">SELECTION</span>
                <h2>{selection?.kind === "node" ? selection.node.label : selection?.kind === "link" ? selection.link.type ?? "Relationship" : "Select a node or relationship"}</h2>
                <p>{selection?.kind === "node" ? `Node · ${selection.node.type ?? "untyped"}` : selection?.kind === "link" ? `${selection.link.source} → ${selection.link.target}` : "Metadata will appear here."}</p>
                <pre>{selection ? JSON.stringify(selection.kind === "node" ? selection.node.data ?? {} : selection.link.data ?? {}, null, 2) : ""}</pre>
            </aside>

            <OrbitGraph
                ref={graphRef}
                data={data}
                className="graph"
                options={{
                    backgroundColor: "#050816",
                    linkColor: "#6366f1",
                    linkOpacity: 0.5,
                    initialView: { mode: "node", nodeId: "product" },
                }}
                onReady={(graph) => graph.resetCamera()}
                onSelectionChange={setSelection}
                onVisibleDataChange={setVisibleData}
                onLoadingChange={setLoading}
            />
        </main>
    );
}