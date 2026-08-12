# OrbitGraph API Reference

OrbitGraph is a TypeScript library for exploring connected data in interactive 3D. It is designed for relationship graphs that can start small, load data on demand, and reveal only the connections a user needs.

This reference covers the public APIs provided by the `@orbitgraph/core`, `@orbitgraph/three`, and `@orbitgraph/react` packages.

## Contents

- [Installation](#installation)
- [Packages](#packages)
- [Quick start](#quick-start)
- [Data model](#data-model)
- [Creating a graph](#creating-a-graph)
- [Options](#options)
- [Instance API](#instance-api)
- [Exploration](#exploration)
- [Search and filters](#search-and-filters)
- [Clustering, collaboration, and UI hooks](#clustering-collaboration-and-ui-hooks)
- [Importing data](#importing-data)
- [Remote and GraphQL data](#remote-and-graphql-data)
- [Layouts and physics](#layouts-and-physics)
- [Camera, touch, and keyboard controls](#camera-touch-and-keyboard-controls)
- [Labels and mini-map](#labels-and-mini-map)
- [Analytics and visual presentation](#analytics-and-visual-presentation)
- [Events, loading, and diagnostics](#events-loading-and-diagnostics)
- [Export and view state](#export-and-view-state)
- [React](#react)
- [Performance guidance](#performance-guidance)

## Installation

### Three.js / Vanilla JavaScript

```bash
npm install @orbitgraph/core @orbitgraph/three three
```

### React

```bash
npm install @orbitgraph/core @orbitgraph/three @orbitgraph/react three
```

## Packages

| Package | Use it for |
| --- | --- |
| `@orbitgraph/core` | Types, graph utilities, analytics, community detection, and data-source contracts. |
| `@orbitgraph/three` | The Three.js/WebGL renderer and imperative graph instance. |
| `@orbitgraph/react` | The declarative React component and its imperative ref API. |

## Quick start

```ts
import { createOrbitGraph } from "@orbitgraph/three";
import type { GraphData } from "@orbitgraph/core";

const data: GraphData = {
    nodes: [
        { id: "team", label: "Product Team", type: "team", color: "#22d3ee" },
        { id: "api", label: "Public API", type: "service", color: "#3b82f6" },
    ],
    links: [
        { id: "team-owns-api", source: "team", target: "api", type: "owns", weight: 0.95 },
    ],
};

const container = document.querySelector<HTMLElement>("#graph");

if (!container) {
    throw new Error("Graph container was not found.");
}

const graph = createOrbitGraph(container, {
    backgroundColor: "#050816",
    labels: { mode: "important", importantNodeIds: ["team"] },
    miniMap: { enabled: true, interactive: true },
});

graph.setData(data);
```

Call `graph.destroy()` when the container is permanently removed.

## Data model

### `GraphNode`

```ts
type GraphNode = {
    id: string;
    label?: string;
    type?: string;
    size?: number;
    color?: string;
    data?: Record<string, JSONValue>;
};
```

`id` must be unique. `type` is useful for filtering, labels, styling, and grouping. `data` preserves arbitrary JSON-compatible metadata and is returned in interaction callbacks.

### `GraphLink`

```ts
type GraphLink = {
    id?: string;
    source: string;
    target: string;
    weight?: number;
    type?: string;
    color?: string;
    data?: Record<string, JSONValue>;
};
```

Links are directed from `source` to `target`. A `weight` normally ranges from `0` to `1`; it affects link appearance and force-layout behavior.

### `GraphData`

```ts
type GraphData = {
    nodes: GraphNode[];
    links: GraphLink[];
};
```

Every link should reference nodes present in the same data set. OrbitGraph can generate a relationship ID when one is omitted, but explicit IDs are recommended for updates and remote data.

## Creating a graph

```ts
import { createOrbitGraph } from "@orbitgraph/three";

const graph = createOrbitGraph(container, options);
```

`createOrbitGraph()` returns an `OrbitGraph` instance. The full data set stays in memory, while exploration and filters determine the subset mounted in WebGL and the force simulation.

## Options

```ts
type OrbitGraphOptions = {
    backgroundColor?: string;
    nodeColor?: string;
    nodeSize?: number;
    linkColor?: string;
    linkOpacity?: number;

    initialView?: GraphInitialView;
    layout?: GraphLayout;
    layoutOptions?: GraphLayoutOptions;
    dataSource?: GraphDataSource;

    linkFlow?: LinkFlowOptions;
    camera?: OrbitGraphCameraOptions;
    physics?: OrbitGraphPhysicsOptions;
    accessibility?: GraphAccessibilityOptions;
    mobileControls?: GraphMobileControlsOptions;
    labels?: GraphLabelsOptions;
    miniMap?: GraphMiniMapOptions;

    onNodeClick?: (event: NodeClickEvent) => void;
    onLinkClick?: (event: LinkClickEvent) => void;
    onNodeHover?: (event: NodeHoverEvent) => void;
    onLinkHover?: (event: LinkHoverEvent) => void;
    onSelectionChange?: (selection: GraphSelection) => void;
    onVisibleDataChange?: (data: VisibleGraphData) => void;
    onLoadingChange?: (state: GraphLoadingState) => void;
    onDiagnostic?: (diagnostic: GraphDiagnostic) => void;
    onKeyboardFocusChange?: (node: GraphNode | null) => void;
    ui?: GraphUIRenderers;
    performance?: GraphPerformanceOptions;
};
```

### Initial views

`initialView` decides what is visible immediately after `setData()`.

```ts
// Render every node and link.
{ mode: "all" }

// Render exactly one known node.
{ mode: "node", nodeId: "team" }

// Render a node and its relationship neighborhood.
{
    mode: "neighborhood",
    nodeId: "team",
    depth: 2,
    direction: "outgoing",
    relationshipTypes: ["owns", "uses"],
}

// Render a limited category of nodes.
{ mode: "type", nodeType: "service", maxNodes: 100 }
```

`direction` is one of `"incoming"`, `"outgoing"`, or `"both"`.

### Link flow

```ts
linkFlow: {
    enabled: true,
    maxParticles: 100,
    particleSize: 0.08,
    particleSpeed: 0.12,
}
```

Animated flow is optional. Disable it for the lowest rendering cost on large graphs.

## Clustering, collaboration, and UI hooks

`graph.clusterCommunities()` detects communities in the visible graph, applies a stable color overlay, and returns `GraphCluster[]`. Call `collapseCluster(id)` to temporarily hide its members and `expandCluster(id)` to restore them. `getClusters()` returns the current state.

```ts
graph.setAdvancedFilters({
  minimumLinkWeight: 0.4,
  maximumLinkWeight: 0.9,
  attributes: [{ field: "region", operator: "contains", value: "north" }],
});

const shared = graph.shareView();
graph.loadSharedView(shared);
graph.saveBookmark("review", "Review graph");
```

`addAnnotation`, `getAnnotations`, `removeAnnotation`, `saveBookmark`, `getBookmarks`, and `restoreBookmark` operate through the serializable in-memory collaboration store. Persist `graph.collaboration.export()` in the host application to synchronize it with a server or collaboration provider.

`ui.renderTooltip` and `ui.renderDetails` receive the current `GraphSelection` and return an `HTMLElement` (or `null`). OrbitGraph mounts that element but leaves framework integration and styling to the application. Set `accessibility.semanticView` to render an updated semantic list of visible nodes.

`performance.telemetry` enables approximately one-second samples through `onPerformanceSample({ fps, visibleNodes, visibleLinks })`. `levelOfDetail` is enabled by default and limits persistent labels for views over 1,000 nodes.

## Importing data

`@orbitgraph/core` exports `importCSVNodes`, `importCSVLinks`, `importJSON`, `importCytoscape`, `importJSONLD`, and `importNeo4j`. The CSV helpers recognize standard graph fields and place other columns in `data`; the Neo4j helper accepts a plain-object projection of driver records.

## Instance API

### Data

```ts
graph.setData(data);

graph.addNode(node);
graph.removeNode(nodeId);

graph.addLink(link);
graph.removeLink(linkId);
```

`setData()` replaces the complete loaded graph, clears temporary analytics styles, clears exploration history, and returns to the configured initial view.

### Exploration

```ts
graph.setInitialView({ mode: "node", nodeId: "team" });

graph.expandNode("team", {
    depth: 1,
    direction: "outgoing",
    relationshipTypes: ["owns", "uses"],
    limit: 25,
    offset: 0,
});

graph.collapseNode("team");
graph.resetExploration();
graph.showAll();
```

`expandNode()` accepts `GraphExpansionOptions`:

| Option | Meaning |
| --- | --- |
| `depth` | Number of relationship levels to reveal. Defaults to `1`. |
| `direction` | `incoming`, `outgoing`, or `both`. Defaults to `both`. |
| `relationshipTypes` | Optional relationship types to include. |
| `limit` | Optional page size for immediate local expansion. |
| `offset` | Optional relationship offset for immediate local expansion. |

Additional exploration helpers:

```ts
graph.focusPath("team", "database", { direction: "outgoing" });
graph.goBack();
graph.goForward();

const state = graph.getNodeExplorationState("team");
const history = graph.getExplorationHistory();
```

`getNodeExplorationState()` is useful for custom Expand buttons. It reports whether the node is expanded, visible neighbors, hidden neighbors, and whether expansion is available.

## Search and filters

Filters refine the explored subset; they never expose hidden nodes.

```ts
graph.search("payments");
graph.toggleTypeFilter("service");
graph.setTypeFilters(["team", "service"]);
graph.setMinimumLinkWeight(0.7);
graph.clearFilters();
```

## Remote and GraphQL data

### Generic data source

Use `GraphDataSource` for on-demand loading. It keeps your API client independent from OrbitGraph.

```ts
import type { GraphDataSource } from "@orbitgraph/core";

const dataSource: GraphDataSource = {
    async getNode(nodeId) {
        const response = await fetch(`/api/graph/nodes/${nodeId}`);
        return response.json();
    },

    async getNeighborhood({ nodeId, direction, limit, offset }) {
        const params = new URLSearchParams({
            direction: direction ?? "both",
            limit: String(limit ?? 25),
            offset: String(offset ?? 0),
        });
        const response = await fetch(`/api/graph/nodes/${nodeId}/neighbors?${params}`);
        return response.json();
    },
};

const graph = createOrbitGraph(container, { dataSource });
```

```ts
await graph.loadNode("team");

const result = await graph.loadNeighborhood("team", {
    direction: "outgoing",
    limit: 25,
    offset: 0,
});
```

`loadNeighborhood()` merges the received nodes and links, refreshes the visual view, and caches the request. Pass `force: true` in load options when the same page must be requested again.

### GraphQL

`@orbitgraph/three` also exports `createGraphQLDataSource()`. It is an optional adapter: OrbitGraph itself does not require GraphQL.

Use it to map your query response into `GraphNode`, `GraphLink`, and `GraphNeighborhoodResult`, then pass the resulting data source through `dataSource`.

```ts
import { createGraphQLDataSource } from "@orbitgraph/three";

const dataSource = createGraphQLDataSource({
    endpoint: "/graphql",
    // Configure your documents and map each response to OrbitGraph data.
});
```

See the GraphQL data-source type definitions in your editor for the response mapping configuration required by your schema.

## Layouts and physics

```ts
graph.setLayout("force");

graph.setLayout("radial", { spacing: 14 });
graph.setLayout("grid", { spacing: 12 });
graph.setLayout("hierarchical", {
    rootId: "team",
    direction: "outgoing",
    spacing: 16,
});
```

Supported layouts are `"force"`, `"radial"`, `"grid"`, `"hierarchical"`, `"dag"`, `"sankey"`, `"timeline"`, `"bipartite"`, and `"geographic"`. DAG and Sankey reuse the directed hierarchical layering; timeline reads `layoutOptions.timeField` (default `"time"`), bipartite uses `bipartiteTypes`, and geographic reads longitude/latitude metadata fields (default `"longitude"` / `"latitude"`).

### Worker physics

```ts
const graph = createOrbitGraph(container, {
    physics: {
        worker: true,
        tickRate: 60,
    },
});
```

Physics uses a module Web Worker when the browser supports it, preserving UI responsiveness while D3 calculates force-layout positions. It automatically falls back to the main thread for SSR, test environments, unsupported browsers, or worker initialization failures.

### Pinning

Users can drag a node to pin it. Release it programmatically with:

```ts
graph.unpinNode("team");
```

## Camera, touch, and keyboard controls

```ts
const graph = createOrbitGraph(container, {
    camera: {
        minDistance: 2,
        maxDistance: 1_000,
        movementSpeed: 18,
        boostMultiplier: 2.5,
        keyboardNavigation: true,
    },
});

graph.focusNode("team");
graph.resetCamera();
```

Desktop controls:

- Left drag: orbit.
- Right drag: pan.
- Mouse wheel: zoom.
- `W`, `A`, `S`, `D`: move horizontally when keyboard camera navigation is enabled.
- `Q` and `E`: move vertically.
- `Shift`: movement boost.

Touch controls:

- One finger: orbit.
- Two fingers: pan and pinch-to-zoom.

Keyboard graph navigation is configured through `accessibility`. It supports focus movement across visible nodes, activation, expansion, collapse, camera focus, and clearing selection. Use `onKeyboardFocusChange` to mirror keyboard focus in external UI.

## Labels and mini-map

### Intelligent labels

```ts
labels: {
    mode: "important",
    importantNodeIds: ["team", "payments-api"],
    maxVisible: 20,
    showNodeType: true,
    fontScale: 1,
}
```

| Option | Description |
| --- | --- |
| `mode` | `hover`, `selected`, `important`, or `all`. |
| `importantNodeIds` | Nodes that should retain a label in `important` mode. |
| `maxVisible` | Limit for persistent labels, preventing visual overload. |
| `showNodeType` | Draw the node type as a smaller second line. |
| `fontScale` | Adjust label text and padding scale. |

The hover label remains available independently, so users can inspect a node even when persistent labels are intentionally limited.

### Mini-map

```ts
miniMap: {
    enabled: true,
    position: "bottom-right",
    width: 180,
    height: 120,
    interactive: true,
    showViewport: true,
    ariaLabel: "Graph overview",
}
```

The mini-map visualizes the currently visible graph rather than the hidden source data. With `interactive: true`, clicking it moves the camera target.

## Analytics and visual presentation

The graph instance exposes two focused controllers:

```ts
graph.analytics;
graph.presentation;
```

### Centrality

```ts
const degree = graph.analytics.degree({ scope: "visible" });
const pageRank = graph.analytics.pageRank({ scope: "visible" });
const betweenness = graph.analytics.betweenness({
    scope: "visible",
    normalized: true,
});
```

`scope` is `"all"` by default or `"visible"` for the explored and filtered subset.

- `degree()` returns degree, in-degree, out-degree, and weighted variants for every node.
- `pageRank()` returns ranking scores and convergence metadata.
- `betweenness()` returns bridge importance for every node.

### Communities

```ts
const result = await graph.analytics.detectCommunitiesAsync({
    scope: "visible",
    weighted: true,
});

console.log(result.communities);
```

Use `detectCommunities()` for synchronous execution on small graphs. Prefer `detectCommunitiesAsync()` in interactive interfaces because it yields between passes. For very large graphs, run analysis in application-managed background work.

### Turning metrics into a visual explanation

Analytics deliberately do not mutate the graph automatically. Apply temporary styles through `presentation`:

```ts
const pageRank = graph.analytics.pageRank({ scope: "visible" });

graph.presentation.setNodeStyles({
    "payments-api": {
        color: "#facc15",
        scale: 1.65,
        glow: 0.9,
    },
});

graph.presentation.clearNodeStyles();
```

This separation lets your application decide whether a metric affects color, size, glow, a legend, a details panel, or nothing at all.

## Events, loading, and diagnostics

### Selection and pointer events

```ts
const graph = createOrbitGraph(container, {
    onNodeClick: ({ node }) => console.log(node),
    onLinkClick: ({ link }) => console.log(link),
    onNodeHover: ({ node }) => console.log(node),
    onLinkHover: ({ link }) => console.log(link),
    onSelectionChange: (selection) => console.log(selection),
});
```

`GraphSelection` is one of:

```ts
type GraphSelection =
    | { kind: "node"; node: GraphNode }
    | { kind: "link"; link: GraphLink }
    | null;
```

### Visible data

```ts
onVisibleDataChange: ({ nodes, links }) => {
    visibleCount.textContent = `${nodes.length} nodes · ${links.length} links`;
}
```

This callback reports the data currently mounted after exploration and filters. It is the right source for counters, mini summaries, and visible-scope analytics UI.

### Loading and diagnostics

```ts
onLoadingChange: (state) => {
    if (state.loading) {
        console.log(`Loading ${state.operation} for ${state.nodeId}`);
    }
},

onDiagnostic: (diagnostic) => {
    console.error(diagnostic.code, diagnostic.message);
},
```

```ts
const state = graph.getLoadingState();
// {
//   loading: boolean,
//   operation: "node" | "neighborhood" | null,
//   nodeId: string | null,
//   error: GraphLoadError | null,
// }
```

Use diagnostics to show application-level retry messages. OrbitGraph does not display network errors by itself, which keeps your product’s error handling and wording under your control.

## Export and view state

### Images and JSON

```ts
const png = await graph.exportPNG();
await graph.downloadPNG("architecture.png");

const fullJSON = graph.exportJSON({ scope: "all" });
const visibleJSON = graph.exportJSON({ scope: "visible" });
graph.downloadJSON({ scope: "visible", fileName: "explored-subgraph.json" });
```

### Persisting user exploration

```ts
const viewState = graph.exportViewState();
localStorage.setItem("graph-view", JSON.stringify(viewState));

const saved = localStorage.getItem("graph-view");

if (saved) {
    graph.importViewState(JSON.parse(saved));
}
```

View state includes exploration, filters, layout, and layout options. It does not replace your graph data; load data first, then restore the view.

## React

```tsx
import { useRef } from "react";
import { OrbitGraph, type OrbitGraphHandle } from "@orbitgraph/react";
import type { GraphData } from "@orbitgraph/core";

export function GraphView({ data }: { data: GraphData }) {
    const graphRef = useRef<OrbitGraphHandle>(null);

    return (
        <>
            <button onClick={() => graphRef.current?.focusNode("team")}>
                Focus team
            </button>

            <OrbitGraph
                ref={graphRef}
                data={data}
                style={{ width: "100%", height: "100vh" }}
                options={{
                    miniMap: { enabled: true },
                    labels: { mode: "important", importantNodeIds: ["team"] },
                }}
                onSelectionChange={(selection) => console.log(selection)}
                onDiagnostic={(diagnostic) => console.error(diagnostic)}
            />
        </>
    );
}
```

The ref exposes the same user-facing actions as the Three.js instance, including exploration, camera movement, remote loading, exports, loading state, analytics, and presentation controllers.

Keep graph data declarative through the `data` prop. Use the ref for imperative user actions such as expanding a branch, exporting, or focusing a node.

## Performance guidance

- Start with `initialView: { mode: "node" }`, `neighborhood`, or `type` for large data sets.
- Hidden nodes are excluded from WebGL mounting and the active physics simulation.
- Keep collision forces enabled for smaller graphs; OrbitGraph automatically disables the expensive collision force above its threshold.
- Leave animated link flow disabled unless it adds meaningful value.
- Keep persistent labels capped with `labels.maxVisible`.
- Use the Worker physics mode for responsive interaction while larger force layouts settle.
- Use `loadNeighborhood()` with `limit` and `offset` instead of loading an entire remote graph at once.
- Run community detection asynchronously in interactive UI and prefer `scope: "visible"` when users are exploring a subset.

## Lifecycle

```ts
graph.destroy();
```

Always call `destroy()` when removing a non-React graph. It releases rendering resources, controls, events, active physics work, workers, overlays, and the canvas element.
