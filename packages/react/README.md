# @orbitgraph/react

React bindings for OrbitGraph.

`@orbitgraph/react` provides the declarative `OrbitGraph` component and an imperative ref for camera, exploration, loading, analytics, and export actions. Version 1.2 also forwards GraphQL and diagnostic capabilities from the renderer.

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
    { source: "workspace", target: "service", type: "uses", weight: 0.85 },
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
      onSelectionChange={(selection) => {
        console.log(selection);
      }}
    />
  );
}
```

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
    initialView: {
      mode: "type",
      nodeType: "service",
      maxNodes: 100,
    },
    linkFlow: {
      enabled: true,
      maxParticles: 140,
      particleSize: 0.09,
      particleSpeed: 0.12,
    },
  }}
/>
```

## Remote data, loading, and diagnostics

Pass a `GraphDataSource` through `options.dataSource`. Loading and diagnostic callbacks are direct props, keeping UI state declarative.

```tsx
import { useState } from "react";

import { OrbitGraph } from "@orbitgraph/react";
import type {
  GraphDiagnostic,
  GraphLoadingState,
} from "@orbitgraph/core";

export function RelationshipExplorer() {
  const [loadingState, setLoadingState] = useState<GraphLoadingState>({
    loading: false,
    operation: null,
    nodeId: null,
    error: null,
  });

  function handleDiagnostic(diagnostic: GraphDiagnostic) {
    console.error(diagnostic);
  }

  return (
    <>
      {loadingState.loading && <p>Loading graph data…</p>}
      {loadingState.error && (
        <p role="alert">{loadingState.error.message}</p>
      )}

      <OrbitGraph
        data={data}
        options={{ dataSource }}
        onLoadingChange={setLoadingState}
        onDiagnostic={handleDiagnostic}
      />
    </>
  );
}
```

The original `loadNode()` and `loadNeighborhood()` promises still reject when a remote request fails. Use a ref when the parent needs to invoke those methods directly.

## Imperative ref

```tsx
import { useRef } from "react";

import {
  OrbitGraph,
  type OrbitGraphHandle,
} from "@orbitgraph/react";

export function GraphScreen() {
  const graphRef = useRef<OrbitGraphHandle>(null);

  return (
    <>
      <button onClick={() => graphRef.current?.resetCamera()}>
        Reset camera
      </button>
      <button onClick={() => graphRef.current?.expandNode("team")}>
        Expand team
      </button>
      <button onClick={() => graphRef.current?.downloadPNG("graph.png")}>
        Export PNG
      </button>

      <OrbitGraph ref={graphRef} data={data} />
    </>
  );
}
```

The ref exposes camera, exploration, export, and `getLoadingState()` methods. Keep source graph data in the `data` prop.

## Props

```ts
type OrbitGraphProps = {
  data: GraphData;
  options?: OrbitGraphOptions;
  onSelectionChange?: (selection: GraphSelection) => void;
  onVisibleDataChange?: (data: VisibleGraphData) => void;
  onLoadingChange?: (state: GraphLoadingState) => void;
  onDiagnostic?: (diagnostic: GraphDiagnostic) => void;
  onKeyboardFocusChange?: (node: GraphNode | null) => void;
  onNodeClick?: OrbitGraphOptions["onNodeClick"];
  onLinkClick?: OrbitGraphOptions["onLinkClick"];
  onNodeHover?: OrbitGraphOptions["onNodeHover"];
  onLinkHover?: OrbitGraphOptions["onLinkHover"];
  className?: string;
  style?: React.CSSProperties;
};
```

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

- [`@orbitgraph/core`](https://www.npmjs.com/package/@orbitgraph/core): shared graph types and utilities.
- [`@orbitgraph/three`](https://www.npmjs.com/package/@orbitgraph/three): Three.js renderer used by this component.

## License

MIT
