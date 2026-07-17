# OrbitGraph

A TypeScript library for exploring complex relationship graphs in 3D.

OrbitGraph renders nodes and directed relationships as an interactive WebGL universe. It is built for user networks, services, documents, events, organizations, dependencies, and knowledge graphs.

## Features

- 3D force-directed graph layout
- Orbit, zoom, pan, drag, and pin nodes
- Directed links with arrows, colors, and weight-based opacity
- Node and relationship selection
- Hover labels and JSON metadata panels
- Search, multi-type filters, and minimum relationship weight
- Incremental node and relationship updates
- Vanilla JavaScript support first; React bindings are planned

## Packages

| Package | Purpose |
|---|---|
| `@orbitgraph/core` | Graph types and data utilities |
| `@orbitgraph/three` | Three.js/WebGL renderer |

## Installation

```bash
npm install @orbitgraph/three @orbitgraph/core three
```
## Quick start

HTML:

```html
<div id="graph" style="width: 100vw; height: 100vh"></div>
```

TypeScript:

```ts
import { createOrbitGraph } from "@orbitgraph/three";
import type { GraphData } from "@orbitgraph/core";

const data: GraphData = {
  nodes: [
    {
      id: "team",
      label: "Product Team",
      type: "group",
      color: "#22d3ee",
      data: {
        department: "Product"
      }
    },
    {
      id: "workspace",
      label: "Main Workspace",
      type: "resource",
      color: "#a855f7"
    },
    {
      id: "service",
      label: "Notification Service",
      type: "service",
      color: "#3b82f6"
    }
  ],
  links: [
    {
      id: "team-manages-workspace",
      source: "team",
      target: "workspace",
      type: "manages",
      weight: 1
    },
    {
      id: "workspace-uses-service",
      source: "workspace",
      target: "service",
      type: "uses",
      weight: 0.8
    }
  ]
};

const container = document.querySelector<HTMLElement>("#graph");

if (!container) {
  throw new Error("Graph container was not found.");
}

const graph = createOrbitGraph(container, {
  onSelectionChange: (selection) => {
    console.log(selection);
  }
});

graph.setData(data);
graph.resetCamera();
```

## Data model

Each node and link can include JSON-compatible metadata.

```ts
{
  id: "api",
  label: "API",
  type: "service",
  data: {
    framework: "FastAPI",
    status: "active"
  }
}
```

```ts
{
  id: "monetra-uses-api",
  source: "monetra",
  target: "api",
  type: "uses",
  weight: 0.9,
  data: {
    protocol: "HTTPS"
  }
}
```

## API

```ts
graph.setData(data);

graph.addNode(node);
graph.removeNode(nodeId);

graph.addLink(link);
graph.removeLink(linkId);

graph.search("api");
graph.toggleTypeFilter("service");
graph.setMinimumLinkWeight(0.7);
graph.clearFilters();

graph.focusNode("monetra");
graph.resetCamera();

graph.unpinNode("monetra");
graph.destroy();
```

## Development

```bash
npm install
npm run typecheck
npm run test:run
npm run build
npm run dev
```

A working consumer example is available in [`examples/vanilla`](./examples/vanilla).

## Status

OrbitGraph is currently in early development.

## License

MIT