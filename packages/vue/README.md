# @orbitgraph/vue

Official Vue 3 bindings for OrbitGraph.

`@orbitgraph/vue` mounts the renderer, reacts to `data` and `options`, forwards the complete event surface, destroys resources on unmount, and exposes the full typed OrbitGraph instance through a template ref.

## Install

```bash
npm install @orbitgraph/core @orbitgraph/three @orbitgraph/vue three vue
```

Vue 3.4 and newer are supported.

## Quick start

```vue
<script setup lang="ts">
import { ref } from "vue";
import { OrbitGraph, type OrbitGraphVueExposed } from "@orbitgraph/vue";
import type { GraphData } from "@orbitgraph/core";

const graphRef = ref<OrbitGraphVueExposed>();
const data = ref<GraphData>({
    nodes: [
        { id: "team", label: "Product Team", type: "team", color: "#22d3ee" },
        { id: "api", label: "Public API", type: "service", color: "#3b82f6" },
    ],
    links: [{ id: "team-api", source: "team", target: "api", type: "owns" }],
});
</script>

<template>
    <button @click="graphRef?.getGraph().focusNode('team')">Focus team</button>
    <OrbitGraph ref="graphRef" :data="data" class="graph"
        :options="{ initialView: { mode: 'node', nodeId: 'team' }, physics: { worker: true } }"
        @selection-change="console.log($event)" @diagnostic="console.error($event)" />
</template>

<style scoped>.graph { width: 100%; height: 100vh; }</style>
```

## Props and attributes

| Input | Type | Behavior |
| --- | --- | --- |
| `data` | `GraphData` | Required. Replacing the reference updates the graph and resets exploration. |
| `options` | `OrbitGraphOptions` | Renderer, camera, physics, labels, data source, themes and performance settings. Replacing it recreates the renderer safely. |
| HTML attributes | Vue attributes | `class`, `style`, ARIA and data attributes are forwarded to the host. |

The watchers are shallow. After changing nodes or links, assign a new `GraphData` reference rather than mutating an existing array in place.

## Events

| Event | Payload |
| --- | --- |
| `ready` | `OrbitGraphInstance` |
| `selection-change` | `GraphSelection` |
| `visible-data-change` | `VisibleGraphData` |
| `loading-change` | `GraphLoadingState` |
| `diagnostic` | `GraphDiagnostic` |
| `keyboard-focus-change` | `GraphNode \| null` |
| `node-click` / `link-click` | Typed click event |
| `node-hover` / `link-hover` | Typed hover event |

## Imperative API

```ts
const graph = graphRef.value?.getGraph();
graph?.setLayout("dag");
graph?.setAdvancedFilters({ minimumLinkWeight: 0.5 });
graph?.setCameraMovementSpeed(120);
const clusters = graph?.clusterCommunities() ?? [];
if (clusters[0]) graph?.collapseCluster(clusters[0].id);
```

`getGraph()` returns the complete `@orbitgraph/three` instance: exploration, loading, analytics, presentation, editing, history, filters, selection, routes, diff, clusters, LOD, exports, Worker compute, Yjs and camera controls. It throws before mount or after unmount.

## Exports, Workers and collaboration

```ts
const graph = graphRef.value!.getGraph();
const svg = graph.exportSVG();
const pdf = await graph.exportPDF({ title: "Architecture report" });
const result = await graph.computeInWorker("radial", abortController.signal);
const session = graph.connectYjs(provider);
```

The component destroys OrbitGraph automatically. Dispose only application-owned resources such as collaboration providers yourself.

## Canvas, WebGL and SSR

Use `options.renderMode: "canvas"` for independent Canvas 2D or `"webgl"` for instanced Three.js. This package requires the browser DOM; mount it client-side in Nuxt. Use `@orbitgraph/headless` during SSR and server report generation.

## Testing and troubleshooting

- Give the host a non-zero width and height; an un-sized host appears blank.
- Wait for `ready` or `nextTick()` before calling `getGraph()`.
- Listen to `diagnostic` and `loading-change` for remote failures.
- Mock `createOrbitGraph` in component tests; test actual rendering with Playwright.

## Related packages

- `@orbitgraph/core`: types and algorithms.
- `@orbitgraph/three`: imperative browser runtime.
- `@orbitgraph/headless`: Node.js and SSR runtime.
- `@orbitgraph/react` and `@orbitgraph/svelte`: equivalent bindings.

See the [complete API reference](https://github.com/Manuel1471/OrbitGraph/blob/develop/v1.5/docs/api/API.md).

## License

MIT
