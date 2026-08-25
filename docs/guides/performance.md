# Performance

OrbitGraph is designed to keep relationship exploration responsive while adapting its rendering strategy to graph size.

## Benchmark example

Graph Scale Lab includes interactive scale controls and telemetry for performance exploration.

```bash
npm run dev:benchmark
```

It generates deterministic graphs from 100 to 50,000 nodes, displays FPS and stage timing, and lets you compare renderers and layouts against the same dataset. Changing a layout does not regenerate data.

## Interpreting results

OrbitGraph does not publish a hardware-independent FPS claim. Record browser, GPU, display resolution, pixel ratio, renderer, layout, node/link density and whether the simulation has stabilized. The lab reports generation, renderer construction and framing separately because Worker generation cannot remove the cost of creating GPU/Canvas resources on the main thread.

## Automatic optimizations

OrbitGraph applies different strategies as graph size increases.

- Shared geometries and materials reduce GPU allocations for nodes and arrows.
- Views with 5,000+ nodes start as aggregate type groups or deterministic segments, avoiding full-detail construction during the initial overview.
- Semantic zoom expands the cluster nearest the camera target instead of all clusters simultaneously.
- WebGL nodes use `InstancedMesh`; frustum virtualization compacts the active instance range so offscreen nodes are not part of the draw call.
- Canvas mode owns no WebGL context and batches relationship strokes into a single path.
- `GraphComputePipeline` transfers packed numeric buffers to a Worker without cloning large object graphs.
- Large graphs retain every distinct relationship for rendering and simulation. Only parallel relationships with the same source, target and type are consolidated into a single edge with its count and combined weight, preserving all original links in data APIs, analytics, filtering and exports.
- Relationship arrows are reduced or hidden when they would become visually noisy or expensive.
- Collision physics is disabled for large graphs where it is more expensive than useful.
- Hover raycasting is throttled to reduce pointer-interaction cost.
- Node labels are rendered only when needed instead of permanently for every node.
- PDF dependencies are imported only when a PDF export is requested.

These trade-offs preserve a usable overview of large networks while retaining richer interaction for smaller graphs.

## Animated link flow

Animated link flow is optional and disabled by default. Enable it only when directional movement adds useful meaning to the graph.

```ts
const graph = createOrbitGraph(container, {
  linkFlow: {
    enabled: true,
    maxParticles: 140,
    particleSize: 0.09,
    particleSpeed: 0.12
  }
});
```

Recommended defaults:

- Keep `maxParticles` around `100–200`.
- Use a small `particleSize` such as `0.05–0.10`.
- Use a low `particleSpeed` such as `0.08–0.15`.
- Disable link flow for dense graphs when it does not communicate meaningful activity.

## Recommendations for large graphs

1. Use the benchmark with data that resembles your production graph, especially its relationship density.
2. Store meaningful `type` and `weight` values so users can filter the graph before exploring every relationship.
3. Keep labels, animated effects, and per-link interaction optional.
4. Prefer progressive exploration: focus on a node, filter by type, then inspect its neighborhood.
5. Measure both stable FPS and the time required for `graph.setData(data)` to produce the first useful frame.

## Measuring your workload

For each relevant graph size, record:

- Node count.
- Relationship count.
- Time from `setData()` to first render.
- FPS after the layout has stabilized.
- FPS during camera movement, hover, drag, and selection.
- Whether animated link flow, labels, or arrows are enabled.

This provides a useful performance baseline for future OrbitGraph releases.
