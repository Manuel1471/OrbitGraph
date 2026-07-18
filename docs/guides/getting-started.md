# Getting Started

This guide shows how to render your first interactive 3D relationship graph with OrbitGraph.

## Installation

For a Vanilla JavaScript or TypeScript application:

```bash
npm install @orbitgraph/core @orbitgraph/three three
```

For React:

```bash
npm install @orbitgraph/core @orbitgraph/three @orbitgraph/react three
```

## Create a container

OrbitGraph needs an HTML element with a defined size.

```html
<div id="graph" style="width: 100vw; height: 100vh"></div>
```

## Render a graph

Create nodes and directed links, then pass them to `setData`.

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
      label: "Workspace",
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
  backgroundColor: "#050816",
  linkColor: "#6366f1",
  linkOpacity: 0.55
});

graph.setData(data);
graph.resetCamera();
```

## Use metadata

Each node and link can store JSON-compatible metadata in its `data` property.

```ts
const node = {
  id: "service",
  label: "Notification Service",
  type: "service",
  data: {
    status: "active",
    region: "us-east",
    owners: ["platform-team"]
  }
};
```

## Respond to interactions

Use callbacks to connect the graph to the rest of your user interface.

```ts
const graph = createOrbitGraph(container, {
  onNodeClick: ({ node }) => {
    console.log("Selected node:", node);
  },
  onLinkClick: ({ link }) => {
    console.log("Selected relationship:", link);
  },
  onSelectionChange: (selection) => {
    console.log("Current selection:", selection);
  }
});
```

## Optional animated link flow

Relationship flow is disabled by default. Enable it when animated directional energy improves the experience for your graph.

```ts
const graph = createOrbitGraph(container, {
  linkFlow: {
    enabled: true,
    maxParticles: 140,
    particleSize: 0.09,
    particleSpeed: 0.12
  }
});
```

For large graphs, keep the particle count low or leave link flow disabled.

## React

The React package mounts and manages the same renderer for you.

```tsx
import { OrbitGraph } from "@orbitgraph/react";

export function App() {
  return (
    <OrbitGraph
      data={data}
      style={{ width: "100%", height: "100vh" }}
      options={{
        backgroundColor: "#050816"
      }}
      onSelectionChange={(selection) => {
        console.log(selection);
      }}
    />
  );
}
```

## Next steps

- Read the API reference for every public method and option.
- See the Vanilla, React, and benchmark examples in the OrbitGraph repository.
- Read [Relationship Exploration](./relationship-exploration.md) to learn how to work with directed relationship data.