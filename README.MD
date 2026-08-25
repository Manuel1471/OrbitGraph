# OrbitGraph

> Explore connected data in 3D — load only what matters, reveal relationships progressively, and explain the structure visually.

![OrbitGraph preview](./assets/example.png)

OrbitGraph is a TypeScript library for interactive relationship graphs. It combines Three.js and Canvas rendering, progressive exploration, analytics, remote data loading, first-class React/Vue/Svelte bindings, and a headless server runtime in focused packages.

## Install

```bash
npm install @orbitgraph/core @orbitgraph/three three
```

Framework and server packages:

```bash
npm install @orbitgraph/react react react-dom
npm install @orbitgraph/vue vue
npm install @orbitgraph/svelte svelte
npm install @orbitgraph/headless
```

React, Vue, and Svelte expose the same runtime and event capabilities. The headless package mirrors data-oriented features—editing, history, selection, routing, diff, analytics, layouts and vector reports—without importing DOM/WebGL code.

<details>
<summary><strong>Using React?</strong></summary>

```bash
npm install @orbitgraph/core @orbitgraph/three @orbitgraph/react three
```

</details>

## Start with a useful view

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
    initialView: { mode: "node", nodeId: "team" },
    labels: {
        mode: "important",
        importantNodeIds: ["team"],
        showNodeType: true,
    },
    miniMap: {
        enabled: true,
        interactive: true,
    },
});

graph.setData(data);
graph.expandNode("team", { direction: "outgoing" });
```

Hidden nodes are kept out of WebGL and the active physics simulation until exploration reveals them.

## What OrbitGraph includes

- 3D force-directed, radial, grid, hierarchical, Dagre-powered DAG, weighted Sankey, timeline, bipartite, geographic, concentric, sphere, and arc layouts.
- Progressive exploration from a node, neighborhood, or node type.
- Local search, type filters, link-weight filters, history, and path focus.
- Worker-backed physics with automatic main-thread fallback.
- Optional remote loading through `GraphDataSource` and a GraphQL adapter.
- Degree, PageRank, betweenness, and community detection.
- Visual presentation APIs for analytics: color, scale, glow, and legends you control.
- Intelligent persistent labels, hover labels, and an interactive mini-map.
- Desktop keyboard movement, keyboard graph navigation, touch controls, and mobile controls.
- Node/link events, selection, diagnostics, loading state, PNG export, JSON export, and view-state persistence.
- Automatic community colors with collapsible clusters, advanced metadata filters, and shareable views.
- Bookmarks and serializable annotations for application-managed collaboration.
- CSV, Cytoscape, JSON-LD, and Neo4j import helpers, plus timeline, bipartite, geographic, DAG, and Sankey layouts.
- Application-owned tooltip/detail renderers, semantic node list, adaptive label detail, and optional FPS telemetry.
- Canvas 2D fallback, MapLibre geographic layer, runtime plugin registry, plus SVG and PDF exports.
- Vanilla JavaScript and React support.

## Packages

| Package | Purpose |
| --- | --- |
| [`@orbitgraph/core`](./packages/core) | Data types, analytics, communities, and data-source contracts. |
| [`@orbitgraph/three`](./packages/three) | Three.js renderer and imperative graph API. |
| [`@orbitgraph/react`](./packages/react) | React component and ref-based actions. |

## Explore and analyze

```ts
const pageRank = graph.analytics.pageRank({ scope: "visible" });

graph.presentation.setNodeStyles({
    "api": {
        color: "#facc15",
        scale: 1.6,
        glow: 0.9,
    },
});

const communities = await graph.analytics.detectCommunitiesAsync({
    scope: "visible",
    weighted: true,
});
```

Analytics calculate data; they never change your graph automatically. Your application decides how results should appear.

## Collaborative exploration and large graphs

```ts
const clusters = graph.clusterCommunities();
graph.collapseCluster(clusters[0].id);
graph.expandCluster(clusters[0].id);

graph.setAdvancedFilters({
    minimumLinkWeight: 0.5,
    attributes: [{ field: "status", operator: "equals", value: "production" }],
});

const urlState = graph.shareView();
graph.addAnnotation({
    id: "note-api",
    target: { kind: "node", nodeId: "api" },
    body: "Review ownership before launch.",
    createdAt: new Date().toISOString(),
});
graph.saveBookmark("launch-review", "Launch review");
```

Use `accessibility: { semanticView: true }` to render a synchronized semantic node list. `performance: { telemetry: true, onPerformanceSample }` reports FPS and visible graph counts; labels automatically reduce to 20 items above 1,000 visible nodes unless `levelOfDetail: false` is set.

## Editing, routes, and graph changes

```ts
graph.applyOperations([{ type: "update-node", nodeId: "api", patch: { data: { status: "production" } } }]);
graph.undo();
graph.redo();

graph.setStyleRules([{ id: "important", when: { minPageRank: 0.1 }, style: { color: "#facc15", scale: 1.5 } }]);
const route = graph.findWeightedPath("team", "api");
const comparison = graph.compare(previousSnapshot);
```

## v1.5 runtime modes and scale controls

```ts
import { graphThemes } from "@orbitgraph/core";

const graph = createOrbitGraph(container, {
    camera: { movementSpeed: 80, boostMultiplier: 3 },
    renderMode: "canvas", // lightweight 2D presentation while preserving the public graph API
    theme: graphThemes.midnight,
});

graph.setCameraMovementSpeed(140); // tune WASD/QE navigation for a large graph
graph.collapseCluster(graph.clusterCommunities()[0].id); // renders a summary cluster node
```

v1.5 also provides `CanvasGraphRenderer`, `MapLibreGraphLayer`, `GraphPluginRegistry`, graph themes, connected components, k-core numbers, neighborhood similarity, and degree anomaly detection through `@orbitgraph/core`.

## Remote data

```ts
const graph = createOrbitGraph(container, {
    dataSource: {
        async getNode(nodeId) {
            return fetch(`/api/nodes/${nodeId}`).then((response) => response.json());
        },
        async getNeighborhood({ nodeId, limit = 25, offset = 0 }) {
            return fetch(`/api/nodes/${nodeId}/neighbors?limit=${limit}&offset=${offset}`)
                .then((response) => response.json());
        },
    },
});

await graph.loadNeighborhood("team", { limit: 25, offset: 0 });
```

## Documentation

- [Complete API reference](./docs/api/API.md)
- [Core package documentation](./packages/core/README.md)
- [Three.js package documentation](./packages/three/README.md)
- [React package documentation](./packages/react/README.md)
- [Changelog](./CHANGELOG.md)
- [Contributing](./CONTRIBUTING.md)

## Examples

```bash
npm install
npm run dev:vanilla
npm run dev:react
npm run dev:benchmark
```

The three complete examples are intentionally complementary: **Vanilla Graph Studio** covers imperative APIs, Canvas/WebGL switching, editing history, clusters, routes, themes and exports; **React Graph Dashboard** demonstrates the declarative integration, selection UI, analytics, renderer switching, themes and report exports; **Graph Scale Lab** is a focused 100–50,000-node benchmark with renderer, layout, flow, clustering, FPS and loading-time controls.

Graph Scale Lab generates deterministic data in a Worker with progress, cancellation, stale-job protection, and separate renderer/framing stages. Graphs of 5,000+ nodes begin in aggregate LOD; semantic zoom expands the cluster nearest the camera target while keeping the rest aggregated.

Canvas mode is WebGL-independent. WebGL mode uses one instanced node draw surface and compacts the active instance range after frustum culling. `GraphComputePipeline` provides transferable Worker computation, `GraphYjsCollaboration` provides CRDT presence/operations, and the headless package runs analytics, layouts and reports without DOM or WebGL.

## Development

```bash
npm run typecheck
npm run test:run
npm run test:e2e
npm run build
```

## License

MIT
