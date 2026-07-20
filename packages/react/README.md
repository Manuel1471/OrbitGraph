# @orbitgraph/react

> Explore connected data in 3D with a declarative React component and optional imperative controls.

`@orbitgraph/react` renders an OrbitGraph inside a React application. It updates when `data` changes and exposes the underlying graph instance through a React `ref` when you need exploration, filtering, layouts, or lazy loading.

## Install

```bash
npm install @orbitgraph/core @orbitgraph/three @orbitgraph/react three
```

React 18 and React 19 are supported.

---

## Quick start

```tsx
import { OrbitGraph } from "@orbitgraph/react";
import type { GraphData } from "@orbitgraph/core";

const data: GraphData = {
  nodes: [
    { id: "team", label: "Product Team", type: "team", color: "#22d3ee" },
    { id: "service", label: "Notifications", type: "service", color: "#a855f7" },
  ],
  links: [
    { source: "team", target: "service", type: "owns", weight: 1 },
  ],
};

export function App() {
  return (
    <OrbitGraph
      data={data}
      style={{ width: "100%", height: "100vh" }}
      options={{ backgroundColor: "#050816" }}
      onSelectionChange={(selection) => {
        console.log(selection);
      }}
    />
  );
}
```

---

## Customize the graph

Pass renderer options through `options`.

```tsx
<OrbitGraph
  data={data}
  options={{
    backgroundColor: "#050816",
    nodeColor: "#22d3ee",
    nodeSize: 0.8,
    linkColor: "#6366f1",
    linkOpacity: 0.5,
    layout: "radial",
    linkFlow: {
      enabled: true,
      maxParticles: 140,
      particleSize: 0.09,
      particleSpeed: 0.12,
    },
  }}
/>
```

`linkFlow` is optional. Disable it for a minimal static visualization or for the best performance on large graphs.

---

## Start small and explore

Use `initialView` to avoid mounting a complete graph immediately.

```tsx
<OrbitGraph
  data={data}
  options={{
    initialView: {
      mode: "neighborhood",
      nodeId: "team",
      depth: 1,
      direction: "outgoing",
    },
  }}
/>
```

Available initial modes:

| Mode | Displays |
| --- | --- |
| `all` | The complete graph |
| `node` | One known node |
| `neighborhood` | A node and its relationships |
| `type` | Nodes matching a type |

Hidden nodes are kept out of the WebGL renderer and force simulation until they are revealed.

---

## Access the graph instance with a ref

Use `OrbitGraphHandle` when your interface needs buttons, menus, pagination, or custom exploration behavior.

```tsx
import { useRef } from "react";
import {
  OrbitGraph,
  type OrbitGraphHandle,
} from "@orbitgraph/react";

export function GraphPage() {
  const graphRef = useRef<OrbitGraphHandle>(null);

  function revealMore(): void {
    graphRef.current?.getInstance()?.expandNode("team", {
      direction: "outgoing",
      depth: 1,
      limit: 25,
    });
  }

  return (
    <>
      <button onClick={revealMore}>Reveal relationships</button>

      <OrbitGraph
        ref={graphRef}
        data={data}
        style={{ width: "100%", height: "100vh" }}
      />
    </>
  );
}
```

The ref exposes:

```ts
type OrbitGraphHandle = {
  getInstance(): OrbitGraphInstance | null;
};
```

The returned instance supports methods such as `expandNode`, `collapseNode`, `focusPath`, `setLayout`, `search`, and `destroy`.

---

## Use `onReady`

`onReady` runs once after the Three.js graph has been created.

```tsx
<OrbitGraph
  data={{ nodes: [], links: [] }}
  onReady={(graph) => {
    graph.setLayout("grid");
  }}
/>
```

---

## Lazy loading

For graphs that are too large to load at once, provide a `dataSource`. OrbitGraph does not prescribe how data is fetched: use `fetch`, GraphQL, a database client, or another source.

```tsx
import type { GraphDataSource } from "@orbitgraph/core";

const dataSource: GraphDataSource = {
  async getNode(nodeId) {
    const response = await fetch(`/api/nodes/${nodeId}`);
    return response.json();
  },

  async getNeighborhood({ nodeId, limit = 25, offset = 0 }) {
    const response = await fetch(
      `/api/nodes/${nodeId}/relationships?limit=${limit}&offset=${offset}`,
    );

    return response.json();
  },
};
```

Load the root node when the component is ready:

```tsx
<OrbitGraph
  data={{ nodes: [], links: [] }}
  options={{
    initialView: { mode: "node", nodeId: "team" },
    dataSource,
  }}
  onReady={async (graph) => {
    await graph.loadNode("team");
  }}
  onLoadingChange={(state) => {
    console.log(state.loading, state.operation, state.nodeId);
  }}
/>
```

Then load a page of relationships through the ref or in an event handler:

```ts
await graphRef.current?.getInstance()?.loadNeighborhood("team", {
  direction: "outgoing",
  limit: 25,
  offset: 0,
});
```

Repeated neighborhood requests are cached in memory. Pass `force: true` to request a fresh page.

---

## Events

```tsx
<OrbitGraph
  data={data}
  onNodeClick={({ node }) => console.log("Node:", node)}
  onLinkClick={({ link }) => console.log("Relationship:", link)}
  onNodeHover={({ node }) => console.log("Hover node:", node)}
  onLinkHover={({ link }) => console.log("Hover relationship:", link)}
  onSelectionChange={(selection) => console.log("Selection:", selection)}
  onVisibleDataChange={({ nodes, links }) => {
    console.log(`Visible: ${nodes.length} nodes, ${links.length} relationships`);
  }}
  onLoadingChange={(state) => console.log("Loading:", state)}
/>
```

---

## Props

```ts
type OrbitGraphProps = {
  data: GraphData;
  options?: OrbitGraphOptions;
  onReady?: (graph: OrbitGraphInstance) => void;
  onSelectionChange?: (selection: GraphSelection) => void;
  onVisibleDataChange?: (data: VisibleGraphData) => void;
  onLoadingChange?: (state: GraphLoadingState) => void;
  onNodeClick?: OrbitGraphOptions["onNodeClick"];
  onLinkClick?: OrbitGraphOptions["onLinkClick"];
  onNodeHover?: OrbitGraphOptions["onNodeHover"];
  onLinkHover?: OrbitGraphOptions["onLinkHover"];
  className?: string;
  style?: React.CSSProperties;
};
```

Updating the `data` prop replaces the underlying graph data. The graph instance itself remains mounted.

---

## Metadata

Nodes and relationships can contain JSON-compatible metadata in `data`.

```ts
const data: GraphData = {
  nodes: [
    {
      id: "service",
      label: "Notification Service",
      type: "service",
      data: { status: "active", region: "us-east" },
    },
  ],
  links: [],
};
```

---

## Related packages

- [`@orbitgraph/core`](https://www.npmjs.com/package/@orbitgraph/core): types, exploration, and lazy-loading contracts.
- [`@orbitgraph/three`](https://www.npmjs.com/package/@orbitgraph/three): Three.js/WebGL renderer and imperative API.

## License

MIT