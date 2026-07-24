# @orbitgraph/three

Three.js/WebGL renderer for OrbitGraph.

Version 1.2 provides interactive 3D graph rendering, progressive exploration, layouts, filters, Worker-backed force physics, lazy loading, optional GraphQL integration, exports, keyboard navigation, mobile controls, and analytics.

## Installation

```bash
npm install @orbitgraph/core @orbitgraph/three three
```

## Quick start

```html
<div id="graph" style="width: 100vw; height: 100vh"></div>
```

```ts
import { createOrbitGraph } from "@orbitgraph/three";
import type { GraphData } from "@orbitgraph/core";

const data: GraphData = {
  nodes: [
    { id: "team", label: "Product Team", type: "group", color: "#22d3ee" },
    { id: "workspace", label: "Workspace", type: "resource", color: "#a855f7" },
  ],
  links: [
    { source: "team", target: "workspace", type: "manages", weight: 1 },
  ],
};

const container = document.querySelector<HTMLElement>("#graph");

if (!container) {
  throw new Error("Graph container was not found.");
}

const graph = createOrbitGraph(container, {
  backgroundColor: "#050816",
});

graph.setData(data);
graph.resetCamera();
```

## Options

```ts
createOrbitGraph(container, {
  backgroundColor: "#050816",
  nodeColor: "#22d3ee",
  nodeSize: 1,
  linkColor: "#6366f1",
  linkOpacity: 0.55,
  initialView: { mode: "all" },
  linkFlow: {
    enabled: true,
    maxParticles: 140,
    particleSize: 0.09,
    particleSpeed: 0.12,
  },
  physics: {
    worker: true,
    tickRate: 60,
  },
  onSelectionChange: (selection) => console.log(selection),
  onDiagnostic: (diagnostic) => console.error(diagnostic),
});
```

## Progressive exploration

```ts
const graph = createOrbitGraph(container, {
  initialView: {
    mode: "neighborhood",
    nodeId: "team",
    depth: 1,
    direction: "outgoing",
  },
});

graph.expandNode("team", {
  direction: "outgoing",
  limit: 25,
  offset: 0,
});

graph.collapseNode("team");
graph.resetExploration();
graph.showAll();
```

Nodes outside the explored subset are not mounted in the renderer or active physics simulation.

## Remote data and GraphQL

Pass a `dataSource` to load graph records only when users explore them.

```ts
const graph = createOrbitGraph(container, {
  dataSource,
  onLoadingChange: (state) => {
    if (state.error) {
      console.error(state.error.message);
    }
  },
  onDiagnostic: (diagnostic) => {
    logger.error(diagnostic);
  },
});

await graph.loadNode("team");
await graph.loadNeighborhood("team", {
  direction: "outgoing",
  limit: 50,
  offset: 0,
});
```

### GraphQL adapter

`createGraphQLDataSource()` maps schema-specific GraphQL responses to OrbitGraph's `GraphDataSource`. It has no GraphQL-client dependency.

```ts
import { createGraphQLDataSource } from "@orbitgraph/three";

const dataSource = createGraphQLDataSource({
  endpoint: "/graphql",
  getNode: {
    document: "query Person($id: ID!) { person(id: $id) { id label type } }",
    variables: (id) => ({ id }),
    select: (data) => data.person ?? undefined,
  },
  getNeighborhood: {
    document: `query Neighborhood($nodeId: ID!, $limit: Int, $offset: Int) {
      neighborhood(nodeId: $nodeId, limit: $limit, offset: $offset) {
        nodes { id label type }
        links { id source target type weight }
        hasMore
        nextOffset
      }
    }`,
    variables: ({ nodeId, limit, offset }) => ({ nodeId, limit, offset }),
    select: (data) => data.neighborhood,
  },
});
```

Failed requests emit `onDiagnostic`, update `getLoadingState().error`, and reject their original promise.

## Instance API

```ts
graph.setData(data);
graph.addNode(node);
graph.removeNode(nodeId);
graph.addLink(link);
graph.removeLink(linkId);

graph.search("service");
graph.toggleTypeFilter("service");
graph.setTypeFilters(["service", "group"]);
graph.setMinimumLinkWeight(0.7);
graph.clearFilters();

graph.expandNode("team");
graph.collapseNode("team");
graph.resetExploration();
graph.showAll();

await graph.loadNode("team");
await graph.loadNeighborhood("team", { limit: 50 });
graph.getLoadingState();

graph.focusNode("service");
graph.resetCamera();
graph.unpinNode("service");

await graph.downloadPNG("graph.png");
graph.downloadJSON({ scope: "visible", fileName: "graph.json" });

graph.destroy();
```

## Analytics

```ts
const degree = graph.analytics.degree();
const pageRank = graph.analytics.pageRank({ scope: "visible" });
const betweenness = graph.analytics.betweenness();
const communities = await graph.analytics.detectCommunitiesAsync();
```

## Worker physics

Force-directed physics can run in a module Web Worker so layout work does not block interaction on the main browser thread.

```ts
const graph = createOrbitGraph(container, {
  physics: {
    worker: true,
    tickRate: 60,
  },
});
```

`worker` defaults to `true` when the browser supports Workers. OrbitGraph falls back to the local simulation in SSR, tests, and environments without Worker support. Deterministic `radial`, `grid`, and `hierarchical` layouts stay on the main thread because they do not run an iterative simulation.

## Metadata

Nodes and links can store JSON-compatible information in `data`. Metadata is preserved in events, selections, exports, and loaded data.

```ts
{
  id: "service",
  label: "Notification Service",
  type: "service",
  data: {
    owner: "Platform Team",
    status: "active"
  }
}
```

## Related packages

- [`@orbitgraph/core`](https://www.npmjs.com/package/@orbitgraph/core): shared types, graph utilities, and analytics.
- [`@orbitgraph/react`](https://www.npmjs.com/package/@orbitgraph/react): React component bindings.

## License

MIT
