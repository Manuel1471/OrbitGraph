# @orbitgraph/core

Shared TypeScript contracts and graph analysis utilities for OrbitGraph.

This package is renderer-agnostic. Use it to model data, import common graph formats, implement remote sources, calculate graph metrics, manage serializable collaboration state, detect communities, and share OrbitGraph types across an application.

## Install

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
            type: "team",
            data: { department: "Product", active: true },
        },
        {
            id: "api",
            label: "Public API",
            type: "service",
        },
    ],
    links: [
        {
            id: "team-owns-api",
            source: "team",
            target: "api",
            type: "owns",
            weight: 0.95,
        },
    ],
};
```

| Type | Description |
| --- | --- |
| `GraphNode` | Entity with a required ID and optional label, type, style, and JSON metadata. |
| `GraphLink` | Directed relationship between source and target IDs. |
| `GraphData` | Collection of nodes and relationships. |
| `JSONValue` | JSON-compatible metadata value. |
| `GraphDirection` | `incoming`, `outgoing`, or `both`. |

## Analytics

```ts
import {
    calculateDegreeMetrics,
    calculatePageRank,
    calculateBetweennessCentrality,
} from "@orbitgraph/core";

const degree = calculateDegreeMetrics(data);
const pageRank = calculatePageRank(data);
const betweenness = calculateBetweennessCentrality(data, { normalized: true });
```

- `calculateDegreeMetrics()` returns degree, in-degree, out-degree, and weighted variants.
- `calculatePageRank()` returns scores and convergence information.
- `calculateBetweennessCentrality()` identifies bridge nodes.

## Community detection

```ts
import {
    detectCommunities,
    detectCommunitiesAsync,
} from "@orbitgraph/core";

const result = detectCommunities(data, { weighted: true });

const asynchronousResult = await detectCommunitiesAsync(data, {
    weighted: true,
});
```

Use `detectCommunitiesAsync()` in interactive applications because it yields between propagation passes. It returns communities and a node-to-community mapping.

## Importing data

```ts
import {
    importCSVNodes,
    importCSVLinks,
    importCytoscape,
    importJSONLD,
    importNeo4j,
} from "@orbitgraph/core";

const nodes = importCSVNodes("id,label,team\napi,Public API,platform");
const links = importCSVLinks("source,target,weight\nteam,api,0.95");
```

The package also exports `importJSON()` for node-link data. CSV preserves unrecognised columns in `data`; Cytoscape accepts its `{ elements }` structure; JSON-LD turns IRI-valued properties into links; and `importNeo4j()` accepts a plain-object projection of Neo4j driver records.

## Collaboration state

```ts
import { GraphCollaborationStore } from "@orbitgraph/core";

const collaboration = new GraphCollaborationStore();
collaboration.upsertAnnotation({
    id: "review-api",
    target: { kind: "node", nodeId: "api" },
    body: "Confirm ownership.",
    createdAt: new Date().toISOString(),
});

const persisted = collaboration.export();
```

`GraphCollaborationStore` holds annotations and named view bookmarks in memory. Its `export()` and `import()` methods make persistence and real-time synchronization the responsibility of the host application.

## Remote data contracts

```ts
import type { GraphDataSource } from "@orbitgraph/core";

const source: GraphDataSource = {
    async getNode(nodeId) {
        return fetch(`/api/nodes/${nodeId}`).then((response) => response.json());
    },
    async getNeighborhood({ nodeId, limit, offset, direction }) {
        return fetch(`/api/nodes/${nodeId}/neighbors`).then(
            (response) => response.json(),
        );
    },
};
```

`GraphDataSource` is intentionally transport-neutral. Your application can use REST, GraphQL, tRPC, local files, IndexedDB, or any other source.

## Shared renderer types

`@orbitgraph/core` exports shared types used by renderer packages:

- `OrbitGraphOptions`
- `GraphInitialView` and `GraphExpansionOptions`
- `GraphLoadingState`, `GraphLoadError`, and `GraphDiagnostic`
- `GraphSelection`, click events, hover events, and `VisibleGraphData`
- Layout, camera, physics, accessibility, labels, mobile-control, and mini-map options
- JSON export and view-state types
- `GraphAttributeFilter`, `GraphCluster`, `GraphAnnotation`, `GraphBookmark`, UI-renderer, and performance types

## Related packages

- [`@orbitgraph/three`](https://www.npmjs.com/package/@orbitgraph/three): Three.js/WebGL renderer.
- [`@orbitgraph/react`](https://www.npmjs.com/package/@orbitgraph/react): React bindings.

## License

MIT
