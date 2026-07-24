# OrbitGraph API

This guide focuses on using OrbitGraph. For package installation and complete examples, see the repository README.

## Create an instance

```ts
import { createOrbitGraph } from "@orbitgraph/three";

const graph = createOrbitGraph(container, options);
```

## Data

```ts
graph.setData(data);

graph.addNode(node);
graph.removeNode(nodeId);

graph.addLink(link);
graph.removeLink(linkId);
```

`setData()` replaces source data and resets exploration to the configured `initialView`.

## Exploration

```ts
graph.expandNode("team", {
  depth: 1,
  direction: "outgoing",
  relationshipTypes: ["owns"],
  limit: 25,
  offset: 0,
});

graph.collapseNode("team");
graph.resetExploration();
graph.showAll();
graph.setInitialView({ mode: "node", nodeId: "team" });
```

```ts
const state = graph.getNodeExplorationState("team");
const history = graph.getExplorationHistory();

graph.goBack();
graph.goForward();
graph.focusPath("team", "service", { direction: "outgoing" });
```

## Search and filtering

```ts
graph.search("notifications");
graph.toggleTypeFilter("service");
graph.setTypeFilters(["team", "service"]);
graph.setMinimumLinkWeight(0.7);
graph.clearFilters();
```

Filters refine the currently explored view and never reveal hidden nodes.

## Remote loading

Configure `dataSource` in `OrbitGraphOptions` to load data on demand.

```ts
await graph.loadNode("team");

await graph.loadNeighborhood("team", {
  depth: 1,
  direction: "outgoing",
  limit: 50,
  offset: 0,
});
```

Repeated neighborhood requests use the in-memory cache unless `force: true` is supplied.

```ts
await graph.loadNeighborhood("team", {
  limit: 50,
  offset: 0,
  force: true,
});
```

### Loading state

```ts
const state = graph.getLoadingState();

if (state.loading) {
  console.log(state.operation, state.nodeId);
}

if (state.error) {
  console.error(state.error.code, state.error.message);
}
```

`onLoadingChange` receives the same state whenever a remote operation starts, completes, or fails.

### Diagnostics

```ts
const graph = createOrbitGraph(container, {
  onDiagnostic: (diagnostic) => {
    monitoring.captureMessage(diagnostic.message, {
      extra: diagnostic,
    });
  },
});
```

Diagnostics complement normal promise behavior. Failed `loadNode()` and `loadNeighborhood()` calls still reject, so callers can retry or provide fallback data.

## GraphQL adapter

```ts
import { createGraphQLDataSource } from "@orbitgraph/three";

const dataSource = createGraphQLDataSource({
  endpoint: "/graphql",
  getNeighborhood: {
    document: `query Neighborhood($nodeId: ID!) {
      neighborhood(nodeId: $nodeId) {
        nodes { id label type }
        links { source target type weight }
      }
    }`,
    variables: ({ nodeId }) => ({ nodeId }),
    select: (data) => data.neighborhood,
  },
});
```

Use the adapter's `request` option to integrate an existing GraphQL client instead of using built-in `fetch`.

## Camera, interaction, and layout

```ts
graph.focusNode("service");
graph.resetCamera();
graph.unpinNode("service");

graph.setLayout("radial", { spacing: 14 });
```

Camera, keyboard navigation, and mobile touch behavior are configured through the `camera`, `accessibility`, and `mobile` options.

## Analytics

```ts
graph.analytics.degree();
graph.analytics.pageRank({ scope: "visible" });
graph.analytics.betweenness();

await graph.analytics.detectCommunitiesAsync({
  scope: "visible",
  weighted: true,
});
```

Analytics use all loaded data by default. Use `scope: "visible"` for the currently explored and filtered subset.

## Physics performance

```ts
const graph = createOrbitGraph(container, {
  physics: {
    worker: true,
    tickRate: 60,
  },
});
```

`physics.worker` moves iterative force simulation into a module Web Worker when supported. It defaults to `true` and falls back to local physics when Worker support is unavailable. It applies to `force` layout only; `radial`, `grid`, and `hierarchical` layouts are deterministic and do not require a worker.

## Export

```ts
const png = await graph.exportPNG();
await graph.downloadPNG("graph.png");

const json = graph.exportJSON({ scope: "visible" });
graph.downloadJSON({
  scope: "visible",
  fileName: "visible-graph.json",
});
```

## Lifecycle

```ts
graph.destroy();
```

Call `destroy()` when the graph is no longer needed to release event listeners, WebGL resources, animation work, and physics resources.
