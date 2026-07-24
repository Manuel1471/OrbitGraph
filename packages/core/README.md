# @orbitgraph/core

Renderer-agnostic TypeScript types, graph utilities, analytics, exploration contracts, remote data contracts, and physics configuration for OrbitGraph 1.2.

## Installation

```bash
npm install @orbitgraph/core
```

## Graph data

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

## Main types

- `GraphNode`: a graph entity with an `id`, optional visual properties, and JSON-compatible metadata.
- `GraphLink`: a directed relationship between `source` and `target` nodes.
- `GraphData`: a collection of nodes and links.
- `Graph`: an in-memory utility for adding, removing, querying, and serializing graph data.
- `GraphInitialView`: the initial subset visible in an OrbitGraph renderer.
- `GraphExpansionOptions`: neighborhood depth, direction, relationship type, and pagination options.
- `GraphDataSource`: an application-defined contract for progressively loading nodes and neighborhoods.
- `GraphLoadingState`: the active loading operation and its most recent `error`.
- `GraphLoadError`: structured information about a failed remote request.
- `GraphDiagnostic`: an application-facing diagnostic emitted when remote loading fails.
- `OrbitGraphPhysicsOptions`: worker and tick-rate configuration for renderer physics.

## Graph utility

```ts
import { Graph } from "@orbitgraph/core";

const graph = new Graph(data);

graph.getNode("team");
graph.getNeighbors("team");
graph.getNodeLinks("team");

graph.addNode({ id: "api", label: "Public API" });
graph.addLink({
  source: "service",
  target: "api",
  type: "uses",
});
```

## Remote data contracts

The core package defines a transport-neutral contract. Your application decides whether the backend is REST, GraphQL, a local database, or another service.

```ts
import type {
  GraphDataSource,
  GraphNeighborhoodResult,
} from "@orbitgraph/core";

const dataSource: GraphDataSource = {
  async getNode(nodeId) {
    return fetchNode(nodeId);
  },
  async getNeighborhood({ nodeId, limit, offset }) {
    const result: GraphNeighborhoodResult = await fetchNeighborhood(
      nodeId,
      limit,
      offset,
    );

    return result;
  },
};
```

The optional GraphQL adapter is exported by `@orbitgraph/three`; this package does not depend on a GraphQL client.

## Analytics

```ts
import {
  calculateBetweennessCentrality,
  calculateDegreeMetrics,
  calculatePageRank,
  detectCommunities,
} from "@orbitgraph/core";

const degree = calculateDegreeMetrics(data);
const pageRank = calculatePageRank(data);
const betweenness = calculateBetweennessCentrality(data);
const communities = detectCommunities(data);
```

Use `detectCommunitiesAsync()` when running community detection without blocking an interactive application flow.

## Related packages

- [`@orbitgraph/three`](https://www.npmjs.com/package/@orbitgraph/three): Three.js/WebGL renderer and GraphQL adapter.
- [`@orbitgraph/react`](https://www.npmjs.com/package/@orbitgraph/react): React bindings.

## License

MIT
