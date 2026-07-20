# @orbitgraph/react

React bindings for OrbitGraph.

`@orbitgraph/react` provides the `OrbitGraph` component, which mounts the Three.js graph renderer and updates it when `GraphData` changes.

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
    { id: "service", label: "Notification Service", type: "service", color: "#3b82f6" },
  ],
  links: [
    { source: "team", target: "workspace", type: "manages", weight: 1 },
    { source: "workspace", target: "service", type: "uses", weight: 0.8 },
  ],
};

export function App() {
  return (
    <OrbitGraph
      data={data}
      style={{ width: "100%", height: "100vh" }}
      options={{
        backgroundColor: "#050816",
        linkFlow: {
          enabled: true,
          maxParticles: 140,
          particleSize: 0.09,
          particleSpeed: 0.12,
        },
      }}
      onSelectionChange={(selection) => console.log(selection)}
    />
  );
}
```

## Progressive exploration

Pass `initialView` through `options` to mount only the relevant starting subset.

```tsx
<OrbitGraph
  data={data}
  style={{ width: "100%", height: "100vh" }}
  options={{
    initialView: {
      mode: "type",
      nodeType: "group",
      maxNodes: 100,
    },
  }}
  onVisibleDataChange={({ nodes, links }) => {
    console.log(`Showing ${nodes.length} nodes and ${links.length} links`);
  }}
/>
```

The React component forwards `options` to `@orbitgraph/three`. Search, filters, selection callbacks, `linkFlow`, and `initialView` use the same types and behavior as the vanilla renderer.

## Visual customization

```tsx
<OrbitGraph
  data={data}
  options={{
    backgroundColor: "#050816",
    nodeColor: "#22d3ee",
    nodeSize: 0.8,
    linkColor: "#6366f1",
    linkOpacity: 0.5,
    linkFlow: {
      enabled: true,
      maxParticles: 140,
      particleSize: 0.09,
      particleSpeed: 0.12,
    },
  }}
/>
```

### Link flow

`linkFlow` enables subtle animated energy segments that travel from a source node to its target.

| Option | Description |
| --- | --- |
| `enabled` | Enables or disables animated relationship flow. Disabled by default. |
| `maxParticles` | Maximum animated segments. Lower values improve performance. |
| `particleSize` | Relative size of every energy segment. |
| `particleSpeed` | Flow movement speed. |

For a minimal or static graph:

```tsx
<OrbitGraph data={data} options={{ linkFlow: { enabled: false } }} />
```

## Props

```ts
type OrbitGraphProps = {
  data: GraphData;
  options?: OrbitGraphOptions;
  onSelectionChange?: (selection: GraphSelection) => void;
  onVisibleDataChange?: (data: VisibleGraphData) => void;
  onNodeClick?: OrbitGraphOptions["onNodeClick"];
  onLinkClick?: OrbitGraphOptions["onLinkClick"];
  onNodeHover?: OrbitGraphOptions["onNodeHover"];
  onLinkHover?: OrbitGraphOptions["onLinkHover"];
  className?: string;
  style?: React.CSSProperties;
};
```

`data` can be replaced at any time. The component forwards the new value to the underlying graph instance.

## Metadata

Nodes and relationships accept JSON-compatible metadata in `data`.

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

## Related packages

- [`@orbitgraph/core`](https://www.npmjs.com/package/@orbitgraph/core): shared graph types.
- [`@orbitgraph/three`](https://www.npmjs.com/package/@orbitgraph/three): Three.js renderer used by this component.

## License

MIT