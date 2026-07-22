# OrbitGraph

> Explore connected data in 3D — start small, follow relationships, and reveal only what matters.

![OrbitGraph preview](./assets/example.png)

## Start here

| I want to... | Go to |
| --- | --- |
| Render my first graph | [Quick start](#quick-start) |
| Copy API recipes | [API guide](./docs/api/README.md) |
| Explore a large graph progressively | [Relationship exploration](./docs/guides/relationship-exploration.md) |
| Use touch, keyboard, camera, and exports | [Interaction guide](./docs/guides/interaction-and-export.md) |
| Test graph size and FPS | [Performance guide](./docs/guides/performance.md) |

## Features

- 3D force-directed graph layouts with orbit, pan, zoom, drag, and pin interactions
- Progressive exploration: start from a node, neighborhood, or type instead of rendering all data
- Search, type filters, link-weight filtering, selections, labels, paths, and exploration history
- Responsive touch gestures plus optional large mobile camera controls
- Keyboard navigation with visible focus and accessible canvas labels
- Optional animated relationship flow
- PNG screenshots and complete or visible JSON exports
- Vanilla JavaScript and React support

## Install

### Vanilla JavaScript

```bash
npm install @orbitgraph/core @orbitgraph/three three
```

### React

```bash
npm install @orbitgraph/core @orbitgraph/three @orbitgraph/react three
```

## Quick start

```ts
import { createOrbitGraph } from "@orbitgraph/three";
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

const container = document.querySelector<HTMLElement>("#graph");

if (!container) {
  throw new Error("Graph container was not found.");
}

const graph = createOrbitGraph(container, {
  mobileControls: { enabled: "auto" },
  accessibility: { ariaLabel: "Product relationships" },
});

graph.setData(data);
```

## Explore large graphs progressively

```ts
const graph = createOrbitGraph(container, {
  initialView: {
    mode: "neighborhood",
    nodeId: "team",
    depth: 1,
    direction: "outgoing",
  },
});

graph.setData(data);
graph.expandNode("team", { depth: 1, direction: "outgoing" });
```

Nodes outside the explored subset are not mounted in WebGL or the force simulation.

## Interaction and export

```ts
graph.focusNode("workspace");
graph.resetCamera();

await graph.downloadPNG("product-network.png");
graph.downloadJSON({ scope: "visible", fileName: "visible-network.json" });
```

Keyboard navigation is enabled by default. Use arrow keys to move focus, `Enter` to focus a node, `+` to expand, `-` to collapse, and `Escape` to clear the current selection.

## Benchmark and examples

```bash
npm run build
npm run dev:benchmark
```

| Example | Purpose |
| --- | --- |
| [`examples/vanilla`](./examples/vanilla) | Direct TypeScript/browser integration |
| [`examples/react`](./examples/react) | React component, callbacks, and refs |
| [`examples/benchmark`](./examples/benchmark) | Generated graphs and FPS comparison |

## Development

```bash
npm install
npm run typecheck
npm run test:run
npm run build
```

## Roadmap

See [ROADMAP.md](./ROADMAP.md). The next planned release focuses on Worker-based graph computation and graph analytics.

## License

MIT