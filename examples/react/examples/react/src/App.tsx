import { useState } from "react";

import { OrbitGraph } from "@orbitgraph/react";
import type {
    GraphData,
    GraphSelection,
} from "@orbitgraph/core";

const data: GraphData = {
    nodes: [
        {
            id: "team",
            label: "Product Team",
            type: "group",
            color: "#22d3ee",
            size: 1.3,
            data: {
                department: "Product",
                members: 8,
            },
        },
        {
            id: "workspace",
            label: "Main Workspace",
            type: "resource",
            color: "#a855f7",
            data: {
                status: "active",
            },
        },
        {
            id: "service",
            label: "Notification Service",
            type: "service",
            color: "#3b82f6",
            data: {
                provider: "Internal",
            },
        },
    ],
    links: [
        {
            id: "team-manages-workspace",
            source: "team",
            target: "workspace",
            type: "manages",
            weight: 1,
        },
        {
            id: "workspace-uses-service",
            source: "workspace",
            target: "service",
            type: "uses",
            weight: 0.85,
        },
    ],
};

export function App() {
    const [selection, setSelection] = useState<GraphSelection>(null);

    return (
        <main className="app">
            <header className="panel">
                <span className="eyebrow">REACT EXAMPLE</span>
                <h1>OrbitGraph</h1>
                <p>
                    This graph is rendered through the React component package.
                </p>
            </header>

            <aside className="panel details">
                <span className="eyebrow">SELECTION</span>

                <pre>
          {JSON.stringify(selection, null, 2)}
        </pre>
            </aside>

            <OrbitGraph
                data={data}
                className="graph"
                onSelectionChange={setSelection}
            />
        </main>
    );
}