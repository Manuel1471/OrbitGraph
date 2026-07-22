# @orbitgraph/react

React bindings for OrbitGraph.

The `OrbitGraph` component mounts the WebGL renderer, updates it when `data` changes, forwards callbacks as React props, and exposes user-triggered graph actions through a ref.

## Install

```bash
npm install @orbitgraph/core @orbitgraph/three @orbitgraph/react three
```

React 18 and React 19 are supported.

## Quick start

```tsx
import { useRef } from "react";
import { OrbitGraph, type OrbitGraphHandle } from "@orbitgraph/react";
import type { GraphData } from "@orbitgraph/core";

const data: GraphData = {
  nodes: [
    { id: "team", label: "Product Team", type: "group", color: "#22d3ee" },
    { id: "workspace", label: "Workspace", type: "resource", color: "#a855f7" },
  ],
  links: [
    { source: "team", target: "workspace", type: "manages", weight: 1 },
  ],
};

export function App() {
  const graphRef = useRef<OrbitGraphHandle>(null);

  return (
    <>
      <button onClick={() => graphRef.current?.resetCamera()}>
        Reset camera
      </button>

      <button onClick={() => graphRef.current?.downloadPNG("network.png")}>
        Export PNG
      </button>

      <OrbitGraph
        ref={graphRef}
        data={data}
        style={{ width: "100%", height: "100vh" }}
        options={{
          mobileControls: { enabled: "auto" },
          accessibility: { ariaLabel: "Product relationship graph" },
        }}
      />
    </>
  );
}
```

## Props and callbacks

```tsx
<OrbitGraph
  data={data}
  options={{
    initialView: { mode: "type", nodeType: "group" },
    linkFlow: { enabled: true, maxParticles: 140 },
    mobileControls: { enabled: "auto" },
  }}
  onSelectionChange={(selection) => console.log(selection)}
  onVisibleDataChange={({ nodes, links }) => console.log(nodes, links)}
  onLoadingChange={(state) => console.log(state.loading)}
  onKeyboardFocusChange={(node) => console.log(node)}
  onNodeClick={({ node }) => console.log(node)}
/>
```

`data` is declarative: replacing it updates the underlying graph and restores its configured `initialView`.

## Ref API

Use `OrbitGraphHandle` for actions initiated by buttons, menus, or other React UI.

```ts
graphRef.current?.focusNode("team");
graphRef.current?.expandNode("team", { depth: 1 });
graphRef.current?.collapseNode("team");
graphRef.current?.resetExploration();
graphRef.current?.showAll();

await graphRef.current?.downloadPNG("network.png");
const json = graphRef.current?.exportJSON({ scope: "visible" });
graphRef.current?.downloadJSON({ scope: "visible" });
```

The handle also provides `resetCamera`, `setInitialView`, `exportPNG`, `getLoadingState`, and the exploration methods above.

## Visual and interaction configuration

```tsx
<OrbitGraph
  data={data}
  options={{
    backgroundColor: "#050816",
    nodeColor: "#22d3ee",
    nodeSize: 0.8,
    linkColor: "#6366f1",
    linkOpacity: 0.5,
    camera: { minDistance: 2, maxDistance: 1000 },
    mobileControls: { enabled: "auto", position: "bottom-right" },
    accessibility: { keyboardNavigation: true },
  }}
/>
```

## Related packages

- [`@orbitgraph/core`](https://www.npmjs.com/package/@orbitgraph/core)
- [`@orbitgraph/three`](https://www.npmjs.com/package/@orbitgraph/three)

## License

MIT