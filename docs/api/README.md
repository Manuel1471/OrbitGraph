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

## 2. Add graph data

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

## 4. Choose a layout

OrbitGraph can arrange the **active subset** of the graph with force physics, a radial view, a grid, or a directed hierarchy.

```ts
const graph = createOrbitGraph(container, {
  layout: "hierarchical",
  layoutOptions: {
    rootId: "design-team",
    direction: "outgoing",
    spacing: 16,
  },
});
```

Change the layout at runtime:

```ts
graph.setLayout("force");
graph.setLayout("radial", { spacing: 16 });
graph.setLayout("grid", { spacing: 12 });
graph.setLayout("hierarchical", {
  rootId: "design-team",
  direction: "outgoing",
  spacing: 16,
});
```

| Layout | Best for |
| --- | --- |
| `force` | Discovering natural relationship clusters |
| `radial` | Compact, balanced overview |
| `grid` | Scanning a large active set |
| `hierarchical` | Invitations, referrals, dependencies, and reporting trees |

---

## 5. Explore relationships

### Reveal connections

```ts
graph.expandNode("design-team", {
  depth: 1,
  direction: "outgoing",
  relationshipTypes: ["manages", "owns"],
});
```

### Reveal relationships in pages

Use this for a node with many connections already available in the graph.

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

// Temporarily display the complete graph data currently loaded in memory.
graph.showAll();
```

---

## 6. Load graph data on demand

For large datasets, do not send the whole graph to the browser. Provide a `dataSource`, load a root node, then load each relationship page only when the user requests it.

```ts
const graph = createOrbitGraph(container, {
  initialView: {
    mode: "node",
    nodeId: "design-team",
  },

  dataSource: {
    async getNode(nodeId) {
      const response = await fetch(`/api/nodes/${nodeId}`);
      return response.ok ? response.json() : undefined;
    },

    async getNeighborhood(query) {
      const parameters = new URLSearchParams({
        depth: String(query.depth ?? 1),
        direction: query.direction ?? "both",
        limit: String(query.limit ?? 50),
        offset: String(query.offset ?? 0),
      });

      const response = await fetch(
        `/api/nodes/${query.nodeId}/relationships?${parameters}`,
      );

      return response.json();
    },
  },

  onLoadingChange: ({ loading, operation, nodeId }) => {
    console.log({ loading, operation, nodeId });
  },
});

await graph.loadNode("design-team");

await graph.loadNeighborhood("design-team", {
  direction: "outgoing",
  limit: 50,
});
```

`getNeighborhood()` returns a page in this shape:

```ts
{
  nodes: [
    { id: "member-1", label: "Member 1", type: "person" },
  ],
  links: [
    {
      id: "design-team-manages-member-1",
      source: "design-team",
      target: "member-1",
      type: "manages",
    },
  ],
  totalNeighbors: 850,
  hasMore: true,
  nextOffset: 50,
}
```

Loaded pages are cached in memory. Request the same page with `force: true` to refresh it.

```ts
await graph.loadNeighborhood("design-team", {
  limit: 50,
  offset: 0,
  force: true,
});
```

---

## 7. Save and restore a view

Save the user’s current exploration, filters, and layout. Graph data is deliberately not duplicated inside the saved state.

```ts
const savedView = graph.exportViewState();

localStorage.setItem("orbitgraph-view", JSON.stringify(savedView));
```

Restore it after loading the graph data:

```ts
graph.setData(data);

const savedView = localStorage.getItem("orbitgraph-view");

if (savedView) {
  graph.importViewState(JSON.parse(savedView));
}
```

---

## 8. Build your own controls

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

## 9. Find and filter

```ts
graph.search("workspace");

graph.toggleTypeFilter("service");
graph.setTypeFilters(["team", "service"]);

graph.setMinimumLinkWeight(0.7);

graph.clearFilters();
```

> Search and filters refine the currently explored graph. They never reveal nodes that are still hidden by exploration.

---

## 10. Handle interactions

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

## 11. Add optional relationship flow

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

## 12. Camera and cleanup

```ts
graph.focusNode("workspace");
graph.resetCamera();

graph.unpinNode("workspace");

// Call this when removing the graph from your application.
graph.destroy();
```

---

## React

The React component forwards `options` to the same renderer API.

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
        layout: "radial",
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

| Need | Method or option |
| --- | --- |
| Replace graph data | `setData(data)` |
| Add or remove data | `addNode`, `removeNode`, `addLink`, `removeLink` |
| Arrange active nodes | `layout`, `layoutOptions`, `setLayout()` |
| Search and filter | `search`, `toggleTypeFilter`, `setTypeFilters`, `clearFilters` |
| Start small | `initialView` |
| Reveal local data | `expandNode(nodeId, options)` |
| Load remote data | `dataSource`, `loadNode()`, `loadNeighborhood()` |
| Observe loading | `onLoadingChange`, `getLoadingState()` |
| Hide a branch | `collapseNode(nodeId)` |
| Restart exploration | `resetExploration()` |
| Show loaded data | `showAll()` |
| Save a user view | `exportViewState()` |
| Restore a user view | `importViewState(state)` |
| Inspect a node | `getNodeExplorationState(nodeId)` |
| Follow a route | `focusPath(sourceId, targetId)` |
| Navigate views | `goBack()`, `goForward()` |
| Move the camera | `focusNode`, `resetCamera` |
| Release resources | `destroy()` |

## License

MIT