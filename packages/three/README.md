# @orbitgraph/three

Interactive Three.js/WebGL renderer for OrbitGraph.

Start with a compact subset, reveal relationships in 3D, choose a layout, save a user view, or load relationship pages on demand.

## Install

```bash
npm install @orbitgraph/core @orbitgraph/three three
```

## Quick start

```ts
import { createOrbitGraph } from "@orbitgraph/three";
import type { GraphData } from "@orbitgraph/core";

const container = document.querySelector<HTMLElement>("#graph");

if (!container) {
  throw new Error("Graph container was not found.");
}

const graph = createOrbitGraph(container, {
  backgroundColor: "#050816",
  layout: "force",
});

const data: GraphData = {
  nodes: [
    { id: "team", label: "Product Team", type: "team", color: "#22d3ee" },
    { id: "service", label: "Notification Service", type: "service", color: "#3b82f6" },
  ],
  links: [
    { source: "team", target: "service", type: "owns", weight: 0.9 },
  ],
};

graph.setData(data);
```

## Layouts

```ts
graph.setLayout("force");
graph.setLayout("radial", { spacing: 16 });
graph.setLayout("grid", { spacing: 12 });
graph.setLayout("hierarchical", {
  rootId: "team",
  direction: "outgoing",
  spacing: 16,
});
```

| Layout | Best for |
| --- | --- |
| `force` | Relationship clusters and open exploration. |
| `radial` | Compact visual overview. |
| `grid` | Scanning many active nodes. |
| `hierarchical` | Referrals, reporting, invitations, and dependencies. |

## Explore without rendering everything

```ts
const graph = createOrbitGraph(container, {
  initialView: {
    mode: "node",
    nodeId: "team",
  },
});

graph.expandNode("team", {
  direction: "outgoing",
  depth: 1,
  limit: 25,
  offset: 0,
});
```

```ts
graph.collapseNode("team");
graph.resetExploration();
graph.showAll();
```

Hidden nodes are excluded from the renderer and force simulation.

## Load relationships on demand

```ts
const graph = createOrbitGraph(container, {
  initialView: { mode: "node", nodeId: "team" },
  dataSource: {
    async getNode(nodeId) {
      const response = await fetch(`/api/nodes/${nodeId}`);
      return response.ok ? response.json() : undefined;
    },
    async getNeighborhood(query) {
      const response = await fetch(`/api/nodes/${query.nodeId}/relationships`);
      return response.json();
    },
  },
});

await graph.loadNode("team");
await graph.loadNeighborhood("team", {
  direction: "outgoing",
  limit: 50,
});
```

Use `onLoadingChange` or `getLoadingState()` to show a loading indicator. Relationship pages are cached in memory; add `force: true` to request a fresh page.

## Save and restore the current view

```ts
const state = graph.exportViewState();
localStorage.setItem("orbitgraph-view", JSON.stringify(state));

graph.setData(data);

const savedState = localStorage.getItem("orbitgraph-view");

if (savedState) {
  graph.importViewState(JSON.parse(savedState));
}
```

The saved state includes exploration, filters, and layout. It does not duplicate graph data.

## Filters and interactions

```ts
graph.search("notification");
graph.setTypeFilters(["team", "service"]);
graph.setMinimumLinkWeight(0.7);

graph.focusNode("service");
graph.focusPath("team", "service");
```

```ts
const graph = createOrbitGraph(container, {
  onNodeClick: ({ node }) => console.log(node),
  onLinkClick: ({ link }) => console.log(link),
  onSelectionChange: (selection) => console.log(selection),
  onVisibleDataChange: ({ nodes, links }) => console.log(nodes.length, links.length),
});
```

## Optional relationship flow

```ts
const graph = createOrbitGraph(container, {
  linkFlow: {
    enabled: true,
    maxParticles: 140,
    particleSize: 0.09,
    particleSpeed: 0.12,
  },
});
```

Disable flow for a minimal static graph or maximum large-graph performance.

## Instance API

```ts
graph.setData(data);
graph.addNode(node);
graph.removeNode(nodeId);
graph.addLink(link);
graph.removeLink(linkId);

graph.setLayout("radial");

graph.expandNode(nodeId, options);
graph.collapseNode(nodeId);
graph.resetExploration();
graph.showAll();

await graph.loadNode(nodeId);
await graph.loadNeighborhood(nodeId, options);

graph.exportViewState();
graph.importViewState(state);

graph.search(query);
graph.setTypeFilters(types);
graph.clearFilters();

graph.focusNode(nodeId);
graph.focusPath(sourceId, targetId);
graph.resetCamera();
graph.destroy();
```

## Related packages

- [`@orbitgraph/core`](https://www.npmjs.com/package/@orbitgraph/core): shared graph types and utilities.
- [`@orbitgraph/react`](https://www.npmjs.com/package/@orbitgraph/react): React bindings.

## License

MIT