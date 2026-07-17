# @orbitgraph/react

React bindings for OrbitGraph.

`@orbitgraph/react` provides the `OrbitGraph` component, which mounts the Three.js graph renderer and updates it when your `GraphData` changes.

## Installation

```bash
npm install @orbitgraph/core @orbitgraph/three @orbitgraph/react three
```

React 18 and React 19 are supported.

## Quick start

```tsx
import { OrbitGraph } from "@orbitgraph/react";
import type { GraphData } from "@orbitgraph/core";

const data: GraphData = {
  nodes: [
    { id: "team", label: "Product Team", type: "group", color: "#22d3ee" },
    { id: "workspace", label: "Workspace", type: "resource", color: "#a855f7" },
    { id: "service", label: "Notification Service", type: "service", color: "#3b82f6" }
  ],
  links: [
    { source: "team", target: "workspace", type: "manages", weight: 1 },
    { source: "workspace", target: "service", type: "uses", weight: 0.8 }
  ]
};

export function App() {
  return (
    <OrbitGraph
      data={data}
      style={{ width: "100%", height: "100vh" }}
      options={{
        backgroundColor: "#050816",
        onSelectionChange: (selection) => console.log(selection)
      }}
    />
  );
}
```

## Props

```ts
type OrbitGraphProps = {
  data: GraphData;
  options?: OrbitGraphOptions;
  onSelectionChange?: (selection: GraphSelection) => void;
  className?: string;
  style?: React.CSSProperties;
};
```

`data` can be replaced with new graph data at any time; the component forwards the update to the underlying graph instance.

## Metadata

Nodes and relationships accept JSON-compatible metadata in their `data` property.

```ts
const data: GraphData = {
  nodes: [
    {
      id: "service",
      label: "Notification Service",
      type: "service",
      data: { status: "active", region: "us-east" }
    }
  ],
  links: []
};
```

## Related packages

- [`@orbitgraph/core`](https://www.npmjs.com/package/@orbitgraph/core): shared graph types.
- [`@orbitgraph/three`](https://www.npmjs.com/package/@orbitgraph/three): Three.js renderer used by this component.

## License

MIT