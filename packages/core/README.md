# @orbitgraph/core

Core TypeScript types and graph data utilities for OrbitGraph.

This package is renderer-agnostic. Use it to define graph data, access shared types, and work with graph relationships independently of Three.js or React.

## Installation

```bash
npm install @orbitgraph/core
```

## Data model

```ts
import type { GraphData } from "@orbitgraph/core";

const data: GraphData = {
  nodes: [
    {
      id: "team",
      label: "Product Team",
      type: "group",
      data: {
        department: "Product",
        active: true,
      },
    },
    {
      id: "service",
      label: "Notification Service",
      type: "service",
    },
  ],
  links: [
    {
      id: "team-owns-service",
      source: "team",
      target: "service",
      type: "owns",
      weight: 0.9,
      data: {
        environment: "production",
      },
    },
  ],
};
```

## Graph utility

`Graph` stores nodes and relationships in memory and exposes basic traversal helpers.

```ts
import { Graph } from "@orbitgraph/core";

const graph = new Graph(data);

graph.getNode("team");
graph.getNeighbors("team");
graph.getNodeLinks("team");

graph.addNode({ id: "dashboard", type: "resource" });
graph.addLink({
  source: "team",
  target: "dashboard",
  type: "manages",
});
```

## Important types

| Type | Purpose |
| --- | --- |
| `GraphNode` | Graph entity with an ID, optional visual properties, and JSON-compatible metadata. |
| `GraphLink` | Directed relationship between a source and target node. |
| `GraphData` | Collection of graph nodes and relationships. |
| `JSONValue` | JSON-compatible primitive, array, or object. |
| `GraphDirection` | `incoming`, `outgoing`, or `both`. |
| `GraphExpansionOptions` | Depth, direction, relationship type, and pagination options for expansion. |
| `GraphInitialView` | Initial `all`, `node`, `neighborhood`, or `type` exploration view. |
| `LinkFlowOptions` | Optional animated relationship-flow configuration. |
| `GraphSelection` | Current selected node, selected relationship, or `null`. |
| `OrbitGraphOptions` | Renderer options and event callback types shared with other packages. |

## Metadata

Both nodes and links accept JSON-compatible metadata through `data`.

```ts
const node = {
    id: "api",
    label: "Public API",
    type: "service",
    data: {
        version: "v1",
        regions: ["us-east", "eu-west"],
        healthy: true,
    },
};
```

## Related packages

- [`@orbitgraph/three`](https://www.npmjs.com/package/@orbitgraph/three): 3D WebGL renderer.
- [`@orbitgraph/react`](https://www.npmjs.com/package/@orbitgraph/react): React bindings.

## License

MIT