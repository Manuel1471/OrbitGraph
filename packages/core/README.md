# @orbitgraph/core

Renderer-agnostic types and graph utilities for OrbitGraph.

Use this package to model nodes, directed relationships, exploration state, loading sources, layout configuration, accessibility, camera, mobile-control, and export options independently from Three.js or React.

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
      type: "group",
      data: { department: "Product", active: true },
    },
  ],
  links: [
    {
      source: "team",
      target: "workspace",
      type: "manages",
      weight: 0.9,
      data: { environment: "production" },
    },
  ],
};
```

## Important types

| Type | Purpose |
| --- | --- |
| `GraphNode`, `GraphLink`, `GraphData` | Source graph model |
| `GraphInitialView`, `GraphExpansionOptions` | Progressive exploration configuration |
| `GraphDataSource`, `GraphLoadingState` | Lazy loading contracts and status |
| `GraphLayout`, `GraphLayoutOptions` | Renderer layout configuration |
| `OrbitGraphCameraOptions` | Desktop, touch, and camera-distance configuration |
| `GraphMobileControlsOptions` | Optional responsive camera-control overlay |
| `GraphAccessibilityOptions` | Keyboard navigation and accessible labels |
| `GraphJSONExportOptions` | Complete or visible JSON export settings |
| `VisibleGraphData`, `GraphSelection` | Renderer callback payloads |

## Graph utility

```ts
import { Graph } from "@orbitgraph/core";

const graph = new Graph(data);

graph.getNode("team");
graph.getNeighbors("team");
graph.getNodeLinks("team");
graph.addNode(node);
graph.addLink(link);
graph.removeNode("team");
```

## Related packages

- [`@orbitgraph/three`](https://www.npmjs.com/package/@orbitgraph/three)
- [`@orbitgraph/react`](https://www.npmjs.com/package/@orbitgraph/react)

## License

MIT