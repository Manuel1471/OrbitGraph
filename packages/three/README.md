# @orbitgraph/three

Three.js/WebGL renderer for OrbitGraph.

It provides an interactive 3D graph with force-directed layout, camera controls, drag-and-pin interactions, selection, hover events, labels, arrows, searching, and filtering.

## Installation

```bash
npm install @orbitgraph/core @orbitgraph/three three
```

## Quick start

```html
<div id="graph" style="width: 100vw; height: 100vh"></div>
```

```ts
import { createOrbitGraph } from "@orbitgraph/three";
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

## Options

```ts
createOrbitGraph(container, {
  backgroundColor: "#050816",
  nodeColor: "#22d3ee",
  nodeSize: 1,
  linkColor: "#6366f1",
  linkOpacity: 0.55,
  onNodeClick: ({ node }) => console.log(node),
  onLinkClick: ({ link }) => console.log(link),
  onNodeHover: ({ node }) => console.log(node),
  onLinkHover: ({ link }) => console.log(link),
  onSelectionChange: (selection) => console.log(selection)
});
```

## Instance API

```ts
graph.setData(data);

graph.addNode(node);
graph.removeNode(nodeId);

graph.addLink(link);
graph.removeLink(linkId);

graph.search("service");
graph.toggleTypeFilter("service");
graph.setTypeFilters(["service", "group"]);
graph.setMinimumLinkWeight(0.7);
graph.clearFilters();

graph.focusNode("service");
graph.resetCamera();
graph.unpinNode("service");
graph.destroy();
```

## Metadata

Nodes and links can store JSON-compatible information in `data`. This metadata is preserved in events and selections.

```ts
{
  id: "service",
  label: "Notification Service",
  type: "service",
  data: {
    owner: "Platform Team",
    status: "active"
  }
}
```

## Related packages

- [`@orbitgraph/core`](https://www.npmjs.com/package/@orbitgraph/core): shared graph types.
- [`@orbitgraph/react`](https://www.npmjs.com/package/@orbitgraph/react): React component bindings.

## License

MIT