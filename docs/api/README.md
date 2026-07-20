# OrbitGraph

> Explore connected data in 3D — start small, follow relationships, and reveal only what matters.

![OrbitGraph preview](./assets/example.png)

## Install

```bash
npm install @orbitgraph/core @orbitgraph/three three
```

<details>
<summary><strong>Using React?</strong></summary>

```bash
npm install @orbitgraph/core @orbitgraph/three @orbitgraph/react three
```

</details>

---

## 1. Create a graph

```html
<div id="graph" style="width: 100vw; height: 100vh"></div>
```

```ts
import { createOrbitGraph } from "@orbitgraph/three";
import type { GraphData } from "@orbitgraph/core";

const container = document.querySelector<HTMLElement>("#graph");

if (!container) {
  throw new Error("Graph container was not found.");
}

const graph = createOrbitGraph(container, {
  backgroundColor: "#050816",
});
```

---

## 2. Add your data

```ts
const data: GraphData = {
  nodes: [
    {
      id: "design-team",
      label: "Design Team",
      type: "team",
      color: "#22d3ee",
      data: { region: "North" },
    },
    {
      id: "workspace",
      label: "Workspace",
      type: "resource",
      color: "#a855f7",
    },
    {
      id: "notifications",
      label: "Notifications",
      type: "service",
      color: "#3b82f6",
    },
  ],
  links: [
    {
      source: "design-team",
      target: "workspace",
      type: "manages",
      weight: 1,
    },
    {
      source: "workspace",
      target: "notifications",
      type: "uses",
      weight: 0.8,
    },
  ],
};

graph.setData(data);
```

Each node and relationship can contain JSON-compatible metadata in `data`.

---

## 3. Choose where exploration starts

Use `initialView` when the complete graph would be too large or too noisy.

| Start with | Configuration |
| --- | --- |
| Everything | `all` |
| One known entity | `node` |
| One entity and its connections | `neighborhood` |
| A category of entities | `type` |

```ts
const graph = createOrbitGraph(container, {
  initialView: {
    mode: "type",
    nodeType: "team",
    maxNodes: 100,
  },
});
```

```ts
const graph = createOrbitGraph(container, {
  initialView: {
    mode: "neighborhood",
    nodeId: "design-team",
    depth: 1,
    direction: "outgoing",
  },
});
```

> Hidden nodes are not mounted in WebGL or the force simulation. This keeps large graphs responsive from the first render.

---

## 4. Explore relationships

### Reveal connections

```ts
graph.expandNode("design-team", {
  depth: 1,
  direction: "outgoing",
  relationshipTypes: ["manages", "owns"],
});
```

### Reveal relationships in pages

Use this for a node with many connections.

```ts
// First 25 direct relationships
graph.expandNode("design-team", {
  direction: "outgoing",
  limit: 25,
  offset: 0,
});

// Next 25 direct relationships
graph.expandNode("design-team", {
  direction: "outgoing",
  limit: 25,
  offset: 25,
});
```

### Collapse, reset, or reveal everything

```ts
graph.collapseNode("design-team");

// Return to the initialView configured by your application.
graph.resetExploration();

// Temporarily display the complete graph.
graph.showAll();
```

---

## 5. Build your own controls

Use node exploration state to decide whether an interface should display an **Expand** button or how many relationships remain hidden.

```ts
const state = graph.getNodeExplorationState("design-team");

console.log(state);
// {
//   nodeId: "design-team",
//   expanded: false,
//   visibleNeighbors: 4,
//   hiddenNeighbors: 18,
//   canExpand: true
// }
```

### Navigate exploration history

```ts
graph.goBack();
graph.goForward();

const history = graph.getExplorationHistory();
// { canGoBack: true, canGoForward: false, index: 2, length: 3 }
```

### Focus a shortest route

```ts
const pathFound = graph.focusPath("design-team", "notifications", {
  direction: "outgoing",
});

if (!pathFound) {
  console.log("No route exists between these nodes.");
}
```

---

## 6. Find and filter

```ts
graph.search("workspace");

graph.toggleTypeFilter("service");
graph.setTypeFilters(["team", "service"]);

graph.setMinimumLinkWeight(0.7);

graph.clearFilters();
```

> Search and filters refine the currently explored graph. They never reveal nodes that are still hidden by exploration.

---

## 7. Handle interactions

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
  },

  onVisibleDataChange: ({ nodes, links }) => {
    console.log(`Showing ${nodes.length} nodes and ${links.length} relationships`);
  },
});
```

---

## 8. Add optional relationship flow

Animated flow is optional. Keep it disabled for maximum performance on large graphs.

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

---

## 9. Camera and cleanup

```ts
graph.focusNode("workspace");
graph.resetCamera();

graph.unpinNode("workspace");

// Call this when removing the graph from your application.
graph.destroy();
```

---

## React

```tsx
import { OrbitGraph } from "@orbitgraph/react";
import type { GraphData } from "@orbitgraph/core";

export function App({ data }: { data: GraphData }) {
  return (
    <OrbitGraph
      data={data}
      style={{ width: "100%", height: "100vh" }}
      options={{
        initialView: {
          mode: "type",
          nodeType: "team",
        },
        linkFlow: {
          enabled: true,
          maxParticles: 140,
          particleSize: 0.09,
          particleSpeed: 0.12,
        },
      }}
      onSelectionChange={(selection) => {
        console.log(selection);
      }}
    />
  );
}
```

---

## API at a glance

| Need | Method |
| --- | --- |
| Replace graph data | `setData(data)` |
| Add or remove data | `addNode`, `removeNode`, `addLink`, `removeLink` |
| Search and filter | `search`, `toggleTypeFilter`, `setTypeFilters`, `clearFilters` |
| Start small | `initialView` |
| Reveal a branch | `expandNode(nodeId, options)` |
| Hide a branch | `collapseNode(nodeId)` |
| Restart exploration | `resetExploration()` |
| Show all data | `showAll()` |
| Inspect a node | `getNodeExplorationState(nodeId)` |
| Follow a route | `focusPath(sourceId, targetId)` |
| Navigate views | `goBack()`, `goForward()` |
| Move the camera | `focusNode`, `resetCamera` |
| Release resources | `destroy()` |

## License

MIT