# @orbitgraph/three

Three.js/WebGL renderer for OrbitGraph.

It renders interactive 3D relationship graphs with progressive exploration, mouse and touch navigation, keyboard accessibility, camera controls, filters, labels, exports, and optional animated link flow.

## Install

```bash
npm install @orbitgraph/core @orbitgraph/three three
```

## Quick start

```ts
import { createOrbitGraph } from "@orbitgraph/three";

const graph = createOrbitGraph(document.querySelector("#graph")!, {
  backgroundColor: "#050816",
  mobileControls: { enabled: "auto" },
});

graph.setData({
  nodes: [
    { id: "team", label: "Product Team", type: "group" },
    { id: "workspace", label: "Workspace", type: "resource" },
  ],
  links: [
    { source: "team", target: "workspace", type: "manages", weight: 1 },
  ],
});
```

## Configure interaction

```ts
createOrbitGraph(container, {
  camera: {
    keyboardNavigation: true,
    movementSpeed: 18,
    boostMultiplier: 2.5,
    minDistance: 2,
    maxDistance: 1000,
  },
  accessibility: {
    keyboardNavigation: true,
    ariaLabel: "Interactive product relationship graph",
  },
  mobileControls: {
    enabled: "auto",
    position: "bottom-right",
    showZoomButtons: true,
    showResetButton: true,
  },
});
```

Touch gestures are always available through OrbitControls: one finger rotates; two fingers pan and pinch-zoom. `mobileControls` adds large zoom and reset targets on coarse-pointer devices.

### Keyboard controls

| Key | Action |
| --- | --- |
| Arrow keys | Move focus between visible nodes |
| `Enter` | Focus the selected node |
| `+` | Expand the focused node |
| `-` | Collapse the focused node |
| `F` | Focus the camera on the node |
| `Escape` | Clear selection and keyboard focus |

## Progressive exploration

```ts
const graph = createOrbitGraph(container, {
  initialView: {
    mode: "type",
    nodeType: "group",
    maxNodes: 100,
  },
});

graph.expandNode("team", {
  depth: 1,
  direction: "outgoing",
  relationshipTypes: ["manages"],
});
```

## Export

```ts
const image = await graph.exportPNG();
await graph.downloadPNG("network.png");

const allData = graph.exportJSON();
const visibleData = graph.exportJSON({ scope: "visible" });
graph.downloadJSON({
  scope: "visible",
  fileName: "visible-network.json",
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
graph.setMinimumLinkWeight(0.7);
graph.clearFilters();

graph.expandNode("team");
graph.collapseNode("team");
graph.resetExploration();
graph.showAll();

graph.focusNode("team");
graph.focusPath("team", "service");
graph.resetCamera();
graph.unpinNode("team");

graph.destroy();
```

## Related packages

- [`@orbitgraph/core`](https://www.npmjs.com/package/@orbitgraph/core)
- [`@orbitgraph/react`](https://www.npmjs.com/package/@orbitgraph/react)

## License

MIT