# @orbitgraph/core

Shared TypeScript data model and graph utilities for OrbitGraph.

`@orbitgraph/core` is renderer-agnostic: use it to model relationship data, explore it with the `Graph` utility, define remote data sources, and share types between browser, server, and React code.

## Install

```bash
npm install @orbitgraph/core
```

## Define graph data

```ts
import type { GraphData } from "@orbitgraph/core";

const data: GraphData = {
  nodes: [
    {
      id: "team",
      label: "Product Team",
      type: "team",
      data: { region: "North" },
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
      data: { environment: "production" },
    },
  ],
};
```

Nodes and relationships can store JSON-compatible metadata in `data`.

## Use the Graph utility

```ts
import { Graph } from "@orbitgraph/core";

const graph = new Graph(data);

graph.getNode("team");
graph.getNeighbors("team");
graph.getNodeLinks("team");
```

## Lazy data sources

Use `GraphDataSource` when a graph is too large to send to the client at once. `@orbitgraph/three` calls these functions; your application decides whether they use REST, GraphQL, WebSockets, or another transport.

```ts
import type { GraphDataSource } from "@orbitgraph/core";

const source: GraphDataSource = {
  async getNode(nodeId) {
    const response = await fetch(`/api/nodes/${nodeId}`);
    return response.ok ? response.json() : undefined;
  },

  async getNeighborhood({ nodeId, limit = 50, offset = 0 }) {
    const response = await fetch(
      `/api/nodes/${nodeId}/relationships?limit=${limit}&offset=${offset}`,
    );

    return response.json();
  },
};
```

The neighborhood result contains the newly available nodes and relationships:

```ts
{
  nodes: [{ id: "person-1", label: "Person 1" }],
  links: [{ source: "team", target: "person-1", type: "manages" }],
  totalNeighbors: 850,
  hasMore: true,
  nextOffset: 50
}
```

## Important types

| Type | Purpose |
| --- | --- |
| `GraphNode` | A graph entity with identity, optional styling, and metadata. |
| `GraphLink` | A directed relationship between two node ids. |
| `GraphData` | A collection of nodes and links. |
| `Graph` | In-memory helper for reading and editing graph data. |
| `GraphInitialView` | Defines the first visible graph subset. |
| `GraphExpansionOptions` | Configures depth, direction, type filtering, and pagination. |
| `GraphLayout` | `force`, `radial`, `grid`, or `hierarchical`. |
| `GraphDataSource` | Application-provided asynchronous node and neighborhood loader. |
| `OrbitGraphViewState` | Serializable exploration, filter, and layout state. |
| `JSONValue` | JSON-compatible value supported by metadata. |

## Related packages

- [`@orbitgraph/three`](https://www.npmjs.com/package/@orbitgraph/three): Three.js/WebGL renderer and interactive exploration API.
- [`@orbitgraph/react`](https://www.npmjs.com/package/@orbitgraph/react): React component bindings.

## License

MIT