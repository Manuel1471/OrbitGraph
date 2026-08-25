# @orbitgraph/headless

DOM-free OrbitGraph runtime for SSR, Node.js, CLI tools, background jobs, tests, analytics services and report generation.

`@orbitgraph/headless` mirrors the data-oriented browser APIs without importing Three.js or requiring DOM, Canvas or WebGL globals.

## Install

```bash
npm install @orbitgraph/core @orbitgraph/headless
```

The package is published as ESM and CommonJS with TypeScript declarations.

## Quick start

```ts
import { HeadlessOrbitGraph } from "@orbitgraph/headless";
import type { GraphOperation } from "@orbitgraph/core";
import type { GraphData } from "@orbitgraph/core";

const data: GraphData = {
    nodes: [
        { id: "client", label: "Web Client", type: "app" },
        { id: "api", label: "Public API", type: "service" },
    ],
    links: [{ id: "client-api", source: "client", target: "api", weight: 0.9 }],
};

const graph = new HeadlessOrbitGraph(data);
const analytics = graph.analyze();
const route = graph.findWeightedPath("client", "api");
const svg = graph.exportSVG({ layout: "radial" });
const pdf = await graph.exportPDF({ title: "Architecture report" });
```

## Runtime API

```ts
const graph = new HeadlessOrbitGraph(data);

graph.setData(nextData);
graph.getData();
graph.getNode("api");

graph.analyze();
graph.layout("grid", 24);
graph.compare(previousSnapshot);
graph.findWeightedPath("client", "api");
graph.findKShortestPaths("client", "api", 3);

graph.selectNodes(["client", "api"]);
graph.getSelectedNodeIds();
graph.clearNodeSelection();

graph.exportJSON();
graph.exportSVG({ width: 1200, height: 800, layout: "radial" });
await graph.exportPDF({ title: "Report", width: 1200, height: 800 });
```

Returned graph data is cloned, so callers cannot mutate internal runtime state through `getData()`.

## Validated editing and history

```ts
const operations: GraphOperation[] = [
    { type: "add-node", node: { id: "worker", label: "Worker" } },
    { type: "add-link", link: { id: "api-worker", source: "api", target: "worker" } },
];

const validation = graph.validateOperations(operations);
if (!validation.valid) throw new Error(validation.errors.join("\n"));

graph.applyOperations(operations);
graph.undo();
graph.redo();
```

Supported operations add, update and remove nodes or links. Removing a node also removes its relationships. Invalid duplicate IDs or missing endpoints throw before modifying the graph. A new edit after undo discards the old redo branch.

## Analytics and routing

`analyze()` returns degree metrics, PageRank and community detection. Weighted routing interprets relationship weights as inverse traversal cost. `findKShortestPaths()` returns edge-disjoint alternatives, and `compare()` reports added, removed and changed nodes and relationships between snapshots.

For specialized algorithms, import `calculateCoreNumbers`, `calculateNodeSimilarity`, connected components and anomaly detection directly from `@orbitgraph/core`.

## Stateless helpers

Use standalone functions for one-shot jobs that do not need editing or history:

```ts
import { analyzeGraph, layoutGraph, renderGraphPDF, renderGraphSVG } from "@orbitgraph/headless";

const positions = layoutGraph(data, "concentric", 32);
const analytics = analyzeGraph(data);
const svg = renderGraphSVG(data, { layout: "grid" });
const pdf = await renderGraphPDF(data, { title: "Graph report" });
```

Both export paths draw vector relationships and nodes. PDF returns `Uint8Array`, which can be passed to `Buffer.from(pdf)` in Node.js or returned directly by many server frameworks.

## SSR examples

```ts
// Next.js, Nuxt, SvelteKit, Express or another server handler
const report = new HeadlessOrbitGraph(await loadGraph());
const bytes = await report.exportPDF({ title: "Dependency report" });
return new Response(bytes, { headers: { "content-type": "application/pdf" } });
```

The module is safe to import during SSR. Only `exportPDF()` dynamically loads jsPDF, keeping analytics and SVG-only workloads smaller.

## Differences from browser packages

Headless intentionally has no camera, pointer events, tooltips, PNG capture, WebGL, Canvas renderer or DOM downloads. Use `@orbitgraph/three` or a framework binding for those capabilities. Headless covers the equivalent data, analytics, editing, selection, routing, comparison, layout and report workflows.

## Testing and troubleshooting

- Use Headless in unit tests when renderer behavior is irrelevant.
- Keep node IDs unique and ensure relationship endpoints exist.
- PDF is asynchronous because its implementation is loaded on demand.
- SVG/PDF layouts are deterministic, making them suitable for snapshots and CI artifacts.
- Large server jobs should reuse one runtime only when history is required; stateless helpers avoid retained state.

## Related packages

- `@orbitgraph/core`: shared contracts, imports and algorithms.
- `@orbitgraph/three`: browser renderer and imperative runtime.
- `@orbitgraph/react`, `@orbitgraph/vue` and `@orbitgraph/svelte`: browser framework bindings.

See the [complete API reference](https://github.com/Manuel1471/OrbitGraph/blob/develop/v1.5/docs/api/API.md).

## License

MIT
