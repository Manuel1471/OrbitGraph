# Performance

OrbitGraph is designed to keep relationship exploration responsive while adapting its rendering strategy to graph size.

## Benchmark example

The repository includes an interactive benchmark at `examples/benchmark`.

```bash
npm run dev:benchmark
```

It generates graphs with 100, 500, 1,000, and 5,000 nodes, displays the current FPS, and lets you compare visual settings with the same data shape.

## Development benchmark snapshot

The following measurements were observed on the development machine after the force layout had stabilized. They are indicative rather than a hardware-independent guarantee.

| Graph size | Relationships | Approximate FPS | Notes |
| --- | ---: | ---: | --- |
| 100 nodes | ~220 | 60–61 FPS | Full interaction and optional visual effects are suitable. |
| 500 nodes | ~1,020 | ~60 FPS | Responsive exploration under the benchmark workload. |
| 5,000 nodes | ~10,020 | ~60 FPS | Automatic level-of-detail optimizations are active after layout stabilization. |
| 5,000 nodes before renderer optimization | ~10,020 | ~15 FPS | Baseline used to validate the rendering improvements. |

Actual results vary by device, GPU, browser, screen resolution, graph density, force-simulation state, and enabled visual effects.

## Automatic optimizations

OrbitGraph applies different strategies as graph size increases.

- Shared geometries and materials reduce GPU allocations for nodes and arrows.
- Large graph relationships can be rendered in batches to reduce draw calls.
- Relationship arrows are reduced or hidden when they would become visually noisy or expensive.
- Collision physics is disabled for large graphs where it is more expensive than useful.
- Hover raycasting is throttled to reduce pointer-interaction cost.
- Node labels are rendered only when needed instead of permanently for every node.

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