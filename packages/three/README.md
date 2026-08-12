# @orbitgraph/three

Three.js/WebGL renderer for OrbitGraph.

It provides the imperative graph instance, interaction model, progressive exploration, Worker physics, layouts, analytics controllers, visual presentation, collaboration helpers, exports, intelligent labels, mini-map navigation, and accessibility views.

## Install

```bash
npm install @orbitgraph/core @orbitgraph/three three
```

## Quick start

```ts
import { createOrbitGraph } from "@orbitgraph/three";
import type { GraphData } from "@orbitgraph/core";

const graph = createOrbitGraph(document.querySelector<HTMLElement>("#graph")!, {
    initialView: { mode: "node", nodeId: "team" },
    labels: { mode: "important", importantNodeIds: ["team"] },
    miniMap: { enabled: true, interactive: true },
    physics: { worker: true },
});

const data: GraphData = {
    nodes: [
        { id: "team", label: "Product Team", type: "team" },
        { id: "api", label: "Public API", type: "service" },
    ],
    links: [{ id: "team-api", source: "team", target: "api", type: "owns" }],
};

graph.setData(data);
graph.expandNode("team", { direction: "outgoing" });
```

## Main API

```ts
graph.setData(data);
graph.addNode(node);
graph.removeNode(nodeId);
graph.addLink(link);
graph.removeLink(linkId);

graph.expandNode(nodeId, options);
graph.collapseNode(nodeId);
graph.resetExploration();
graph.showAll();

graph.search("api");
graph.setTypeFilters(["team", "service"]);
graph.setMinimumLinkWeight(0.7);
graph.setAdvancedFilters({
    minimumLinkWeight: 0.4,
    attributes: [{ field: "environment", operator: "equals", value: "production" }],
});
graph.clearFilters();

graph.focusNode("api");
graph.resetCamera();
graph.unpinNode("api");
graph.destroy();
```

For the complete API and option definitions, see the [API reference](../../docs/api/API.md).

## Remote loading

```ts
const graph = createOrbitGraph(container, { dataSource });

await graph.loadNode("team");
await graph.loadNeighborhood("team", {
    direction: "outgoing",
    limit: 25,
    offset: 0,
});

const state = graph.getLoadingState();
```

The loader merges received records, caches repeated neighborhood pages, emits loading state, and sends failures through `onDiagnostic`.

`createGraphQLDataSource()` is available as an optional GraphQL adapter. OrbitGraph remains independent from any GraphQL client or server.

## Analytics and presentation

```ts
const pageRank = graph.analytics.pageRank({ scope: "visible" });
const degree = graph.analytics.degree({ scope: "visible" });
const bridges = graph.analytics.betweenness({ scope: "visible", normalized: true });
const communities = await graph.analytics.detectCommunitiesAsync({ scope: "visible" });

graph.presentation.setNodeStyles({
    "api": { color: "#facc15", scale: 1.6, glow: 0.9 },
});

graph.presentation.clearNodeStyles();
```

Analytics are read-only. `presentation` applies temporary visual styles without mutating source graph data.

## Clusters, collaboration, and shared views

```ts
const clusters = graph.clusterCommunities();
graph.collapseCluster(clusters[0].id);
graph.expandCluster(clusters[0].id);

const sharedView = graph.shareView();
graph.loadSharedView(sharedView);

graph.addAnnotation({
    id: "api-review",
    target: { kind: "node", nodeId: "api" },
    body: "Review this dependency.",
    createdAt: new Date().toISOString(),
});
graph.saveBookmark("review", "Dependency review");
```

`clusterCommunities()` uses the visible graph and applies a presentation overlay to distinguish each community. Collapsing a cluster temporarily hides its members; source graph data remains unchanged. Annotations and bookmarks live in `graph.collaboration`; persist `graph.collaboration.export()` in the application when collaboration must survive a page reload.

## Visual and interaction options

```ts
const graph = createOrbitGraph(container, {
    backgroundColor: "#050816",
    nodeColor: "#22d3ee",
    nodeSize: 0.75,
    linkColor: "#6366f1",
    linkOpacity: 0.5,
    linkFlow: { enabled: true, maxParticles: 100 },
    labels: { mode: "important", maxVisible: 20, showNodeType: true },
    miniMap: { enabled: true, position: "bottom-right", interactive: true },
    camera: { keyboardNavigation: true, minDistance: 2, maxDistance: 1000 },
    physics: { worker: true, tickRate: 60 },
    accessibility: { semanticView: true },
    performance: {
        telemetry: true,
        onPerformanceSample: ({ fps, visibleNodes }) => console.log(fps, visibleNodes),
    },
});
```

`ui.renderTooltip` and `ui.renderDetails` may return application-owned `HTMLElement` content for the current selection. The renderer mounts it without imposing a framework. Persistent labels automatically reduce on views larger than 1,000 nodes; set `performance.levelOfDetail` to `false` to opt out.

The layout names `"dag"` and `"sankey"` use directed layers. `"timeline"` reads `data[timeField]`, `"bipartite"` uses `bipartiteTypes`, and `"geographic"` reads longitude and latitude metadata.

## Events

```ts
const graph = createOrbitGraph(container, {
    onNodeClick: ({ node }) => console.log(node),
    onLinkClick: ({ link }) => console.log(link),
    onSelectionChange: (selection) => console.log(selection),
    onVisibleDataChange: ({ nodes, links }) => console.log(nodes.length, links.length),
    onLoadingChange: (state) => console.log(state),
    onDiagnostic: (diagnostic) => console.error(diagnostic),
});
```

## Export and view state

```ts
await graph.downloadPNG("architecture.png");
graph.downloadJSON({ scope: "visible", fileName: "explored-graph.json" });

const viewState = graph.exportViewState();
graph.importViewState(viewState);
```

## Related packages

- [`@orbitgraph/core`](https://www.npmjs.com/package/@orbitgraph/core): types and graph utilities.
- [`@orbitgraph/react`](https://www.npmjs.com/package/@orbitgraph/react): React bindings.

## License

MIT
