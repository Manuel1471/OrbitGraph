# @orbitgraph/svelte

Official Svelte 5 bindings for OrbitGraph.

The package provides a reactive action and an imperative controller. Both mount OrbitGraph, forward every public event, update data, recreate safely when options change, and release renderer resources on destroy.

## Install

```bash
npm install @orbitgraph/core @orbitgraph/three @orbitgraph/svelte three svelte
```

Svelte 5 and newer are supported.

## Quick start

```svelte
<script lang="ts">
    import { orbitGraph } from "@orbitgraph/svelte";
    import type { GraphData } from "@orbitgraph/core";

    let data = $state<GraphData>({
        nodes: [
            { id: "team", label: "Product Team", type: "team" },
            { id: "api", label: "Public API", type: "service" },
        ],
        links: [{ id: "team-api", source: "team", target: "api", type: "owns" }],
    });
</script>

<div class="graph" use:orbitGraph={{
    data,
    options: { renderMode: "canvas", physics: { worker: true } },
    onSelectionChange: (selection) => console.log(selection),
    onDiagnostic: (diagnostic) => console.error(diagnostic),
}}></div>

<style>.graph { width: 100%; height: 100vh; }</style>
```

## Action options

```ts
type OrbitGraphActionOptions = {
    data: GraphData;
    options?: OrbitGraphOptions;
    onReady?: (graph: OrbitGraph) => void;
    onSelectionChange?: (selection: GraphSelection) => void;
    onVisibleDataChange?: (data: VisibleGraphData) => void;
    onLoadingChange?: (state: GraphLoadingState) => void;
    onDiagnostic?: (diagnostic: GraphDiagnostic) => void;
    onKeyboardFocusChange?: (node: GraphNode | null) => void;
    onNodeClick?: OrbitGraphOptions["onNodeClick"];
    onLinkClick?: OrbitGraphOptions["onLinkClick"];
    onNodeHover?: OrbitGraphOptions["onNodeHover"];
    onLinkHover?: OrbitGraphOptions["onLinkHover"];
};
```

Updating `data` calls `setData()`. Replacing `options` recreates the renderer because camera, renderer and plugin construction settings are not all mutable. Keep a stable options object when only graph data changes.

## Imperative controller

Use the controller when a toolbar, rune, store or custom component needs direct access to OrbitGraph:

```svelte
<script lang="ts">
    import { onMount } from "svelte";
    import { createOrbitGraphController, type OrbitGraphController } from "@orbitgraph/svelte";

    let host: HTMLDivElement;
    let controller: OrbitGraphController;

    onMount(() => {
        controller = createOrbitGraphController(host, { data, options: { renderMode: "webgl" } });
        return () => controller.destroy();
    });

    function focusTeam() { controller.graph.focusNode("team"); }
</script>

<button onclick={focusTeam}>Focus team</button>
<div bind:this={host} class="graph"></div>
```

`controller.graph` is the complete runtime: exploration, remote loading, analytics, presentation, editing, undo/redo, filters, selection, routes, diff, clusters, semantic LOD, exports, Worker compute, Yjs and camera controls.

## Advanced operations

```ts
controller.graph.setLayout("sankey");
controller.graph.setAdvancedFilters({ minimumLinkWeight: 0.5 });
controller.graph.applyOperations([{ type: "add-node", node: { id: "worker" } }]);
const result = await controller.graph.computeInWorker("radial", signal);
const pdf = await controller.graph.exportPDF({ title: "Dependency report" });
const collaboration = controller.graph.connectYjs(provider);
```

## Canvas, WebGL and SSR

Set `renderMode` to `"canvas"` for independent Canvas 2D or `"webgl"` for instanced Three.js. The action and controller require a real browser element. Guard manual controller construction with `onMount` in SvelteKit; use `@orbitgraph/headless` in server `load` functions, endpoints and prerendering.

## Testing and troubleshooting

- The graph host must have explicit, non-zero dimensions.
- Call `destroy()` exactly once for manually created controllers; the action cleans itself up.
- Listen to `onDiagnostic` and `onLoadingChange` for remote errors.
- Mock `createOrbitGraph` for action/controller unit tests and use Playwright for renderer behavior.
- If an options object is rebuilt every update, the renderer will also be rebuilt; hoist or memoize it when appropriate.

## Related packages

- `@orbitgraph/core`: types and algorithms.
- `@orbitgraph/three`: imperative browser runtime.
- `@orbitgraph/headless`: Node.js and SSR runtime.
- `@orbitgraph/react` and `@orbitgraph/vue`: equivalent bindings.

See the [complete API reference](https://github.com/Manuel1471/OrbitGraph/blob/develop/v1.5/docs/api/API.md).

## License

MIT
