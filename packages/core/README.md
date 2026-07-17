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
        active: true
      }
    },
    {
      id: "service",
      label: "Notification Service",
      type: "service"
    }
  ],
  links: [
    {
      id: "team-owns-service",
      source: "team",
      target: "service",
      type: "owns",
      weight: 0.9,
      data: {
        environment: "production"
      }
    }
  ]
};
```

## Types

- `GraphNode`: a graph entity with an `id`, optional visual properties, and JSON-compatible `data`.
- `GraphLink`: a directed relationship between `source` and `target` nodes.
- `GraphData`: a collection of `nodes` and `links`.
- `JSONValue`: a JSON-compatible primitive, array, or object.
- `GraphSelection`: the current node selection, link selection, or `null`.
- `OrbitGraphOptions`: shared renderer options and event callback types.

## Metadata

Both nodes and links accept JSON-compatible metadata through the `data` property:

```ts
const node = {
  id: "api",
  label: "Public API",
  type: "service",
  data: {
    version: "v1",
    regions: ["us-east", "eu-west"],
    healthy: true
  }
};
```

## Related packages

- [`@orbitgraph/three`](https://www.npmjs.com/package/@orbitgraph/three): 3D WebGL renderer.
- [`@orbitgraph/react`](https://www.npmjs.com/package/@orbitgraph/react): React bindings.

## License

MIT