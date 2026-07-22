import { useRef, useState } from "react";

import { OrbitGraph, type OrbitGraphHandle } from "@orbitgraph/react";
import type {
    GraphData,
    GraphLoadingState,
    GraphNode,
    GraphSelection,
    VisibleGraphData,
} from "@orbitgraph/core";

const data: GraphData = {
    nodes: [
        { id: "network", label: "Community Network", type: "organization", color: "#22d3ee", size: 1.35 },
        { id: "research", label: "Research Group", type: "team", color: "#a855f7" },
        { id: "operations", label: "Operations Group", type: "team", color: "#3b82f6" },
        { id: "portal", label: "Public Portal", type: "service", color: "#facc15" },
        { id: "insights", label: "Insights Platform", type: "service", color: "#34d399" },
        { id: "archive", label: "Archive", type: "resource", color: "#fb7185" },
    ],
    links: [
        { source: "network", target: "research", type: "contains", weight: 1 },
        { source: "network", target: "operations", type: "contains", weight: 1 },
        { source: "research", target: "insights", type: "uses", weight: 0.9 },
        { source: "operations", target: "portal", type: "operates", weight: 0.9 },
        { source: "portal", target: "archive", type: "stores", weight: 0.6 },
    ],
};

export function App() {
    const graphRef = useRef<OrbitGraphHandle>(null);
    const [selection, setSelection] = useState<GraphSelection>(null);
    const [keyboardFocus, setKeyboardFocus] = useState<GraphNode | null>(null);
    const [visible, setVisible] = useState<VisibleGraphData>({ nodes: [], links: [] });
    const [loading, setLoading] = useState<GraphLoadingState>({
        loading: false,
        operation: null,
        nodeId: null,
    });

    const downloadPNG = async (): Promise<void> => {
        await graphRef.current?.downloadPNG("community-network.png");
    };

    return (
        <main className="app">
            <aside className="panel controls">
                <span className="eyebrow">REACT EXAMPLE</span>
                <h1>Community Explorer</h1>
                <p>Use the React ref API to drive exploration, camera actions, and exports.</p>

                <div className="actions">
                    <button onClick={() => graphRef.current?.expandNode("network", { depth: 2, direction: "outgoing" })}>
                        Expand network
                    </button>
                    <button onClick={() => graphRef.current?.showAll()}>Show all</button>
                    <button onClick={() => graphRef.current?.resetExploration()}>Reset exploration</button>
                    <button onClick={() => graphRef.current?.focusNode("network")}>Focus network</button>
                    <button onClick={() => graphRef.current?.resetCamera()}>Reset camera</button>
                </div>

                <div className="actions two-columns">
                    <button onClick={downloadPNG}>Download PNG</button>
                    <button onClick={() => graphRef.current?.downloadJSON({ scope: "visible", fileName: "community-visible-network.json" })}>
                        Visible JSON
                    </button>
                </div>

                <p className="hint">Touch: one finger rotates; two fingers pan and pinch-zoom. Keyboard: arrows, Enter, +, −, F, Escape.</p>
            </aside>

            <aside className="panel details">
                <span className="eyebrow">GRAPH STATE</span>
                <p><strong>{visible.nodes.length}</strong> visible nodes · <strong>{visible.links.length}</strong> visible links</p>
                <p className="focus">Keyboard focus: {keyboardFocus?.label ?? "none"}</p>
                {loading.loading && <p className="focus">Loading {loading.operation}…</p>}
                <pre>{JSON.stringify(selection, null, 2)}</pre>
            </aside>

            <OrbitGraph
                ref={graphRef}
                data={data}
                className="graph"
                options={{
                    initialView: { mode: "node", nodeId: "network" },
                    mobileControls: { enabled: "auto", position: "bottom-right" },
                    accessibility: { ariaLabel: "Community relationship explorer" },
                    linkFlow: { enabled: true, maxParticles: 80, particleSize: 0.07, particleSpeed: 0.1 },
                }}
                onSelectionChange={setSelection}
                onKeyboardFocusChange={setKeyboardFocus}
                onVisibleDataChange={setVisible}
                onLoadingChange={setLoading}
            />
        </main>
    );
}