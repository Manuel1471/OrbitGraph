# Changelog

All notable changes to OrbitGraph are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows [Semantic Versioning](https://semver.org/).

## [1.5.0] - Unreleased

### Added

- Fully independent Canvas runtime: `renderMode: "canvas"` no longer creates a WebGL renderer or GPU context.
- Instanced node rendering with compact frustum virtualization; off-camera nodes are removed from the active instance draw count while source data remains intact.
- `GraphComputePipeline` packs graphs into transferable `Float32Array` / `Uint32Array` buffers for cancellable Worker layouts, clustering and transformation.
- `GraphYjsCollaboration` provides CRDT operation merging, provider synchronization, awareness, cursors and multi-user presence through Yjs.
- Official `@orbitgraph/vue` component and `@orbitgraph/svelte` action packages.
- `@orbitgraph/headless` for DOM-free analytics, deterministic layouts, SVG and PDF generation in Node.js and SSR environments.
- Vue and Svelte bindings now match React's callback surface, reactive lifecycle, cleanup guarantees, and full imperative runtime access; each package has dedicated wrapper tests.
- `HeadlessOrbitGraph` adds stateful editing, validation, undo/redo, selection, routes, snapshot diff, analytics, JSON and vector report APIs without browser globals.
- Playwright visual E2E matrix covering Chromium, Firefox and WebKit, including layout transitions and 50K cancellation.
- Runtime WASD/QE camera speed controls through `setCameraMovementSpeed()`.
- Integrated Canvas presentation mode for `createOrbitGraph({ renderMode: "canvas" })`.
- Aggregate nodes and consolidated links rendered for collapsed communities.
- Professional Dagre DAG and weighted d3-sankey layouts, plus concentric, sphere, and arc layouts.
- Large-graph relationship consolidation: every distinct relationship stays active; parallel links with equal endpoints and type are represented by one aggregated edge while source data and analytics retain every original relationship.
- Vector SVG export, report-style PDF headers, theme presets, dynamic plugin lifecycle, and advanced graph algorithms.
- Graph Scale Lab now supports 100–50,000-node repeatable scenarios, WebGL/Canvas selection, force and deterministic layouts, telemetry, JSON export, themes, style rules, relationship flow, and semantic-zoom controls.
- Benchmark scenario generation runs in a Worker in 500-node batches, reports progress, supports cancellation, and preserves the currently mounted graph while a new scenario is prepared.
- Added deterministic Worker-payload tests to the main Vitest run, covering metadata, stable data, valid relationship endpoints, final progress, and cancellation.
- Automatic large-graph LOD begins before full-detail objects are created at 5,000+ nodes. It groups by type when possible and uses deterministic 1,000-node segments for untyped graphs.
- Semantic zoom expands only the cluster nearest the camera target and keeps the remaining graph aggregated, preventing one zoom gesture from mounting the complete massive graph.
- Frustum culling hides off-viewport objects and batched links while retaining a relationship when either endpoint remains near the viewport; temporary math objects are reused to reduce garbage collection.
- Cluster aggregation now computes metrics and consolidated links in one linear pass instead of rescanning every relationship per cluster.
- Benchmark stages distinguish generation, renderer construction, framing and ready state; stale jobs are cancelled and Worker cancellation/errors are handled explicitly.
- PDF support is loaded on demand, keeping jsPDF out of applications that do not export reports.
- Force charge strength scales with node count to prevent large simulations from expanding into unusable camera bounds.
- Camera framing supports large clipping distances and smooth fit transitions instead of abrupt layout-change teleports.
- React refs now expose layouts and semantic LOD controls; tests cover asynchronous PDF export, clustering, layouts, and runtime camera-speed controls.

### Fixed

- Fixed invalid optional IDs in `aggregatedLinkIds`, restoring clean repository-wide typechecking.
- Fixed benchmark layout changes regenerating a different dataset and restored clustering, styling, and JSON-export actions.
- Fixed camera fit animations continuing after pointer, wheel, or keyboard input.
- Fixed the benchmark appearing stuck at 95% by reporting the main-thread build and framing phases separately.

## [1.4.0]

### Added

- Graph snapshot comparison, weighted shortest paths, and edge-disjoint route alternatives.
- Operation-based editing API, custom streaming adapter contract, and bounded undo/redo history.
- Declarative node style rules based on type, degree, PageRank, and metadata predicates.
- Multi-node selection API and v1.4 core contracts for cluster summary nodes, themes, streams, and plugins.
- Canvas 2D renderer, MapLibre GeoJSON layer, runtime plugin registry, and SVG/PDF export APIs.
- Aggregate cluster-data generator for rendering collapsed communities as summary nodes and consolidated links.

## [1.3.0]

### Added

- Community clustering API with visual community colors and collapsible cluster membership.
- Combined metadata predicates and inclusive link-weight range filtering.
- Serializable shared-view URLs, application-managed annotations, and named bookmarks.
- Framework-neutral tooltip and detail-panel render hooks.
- CSV, Cytoscape, JSON-LD, and Neo4j graph import helpers.
- Timeline, bipartite, geographic, DAG, and Sankey layout modes.
- Optional FPS/visible-count telemetry, adaptive label level of detail, and an accessible synchronized semantic node list.
- React ref bindings for advanced filters, shared views, annotations, and bookmarks.

## [1.2.0]

### Added

- Optional `createGraphQLDataSource()` adapter in `@orbitgraph/three` for mapping GraphQL responses to `GraphDataSource`.
- Generic GraphQL request abstraction that supports built-in `fetch` or an existing GraphQL client without adding a GraphQL client dependency.
- Structured remote-loading errors through `GraphLoadError` and `GraphLoadingState.error`.
- `onDiagnostic` callback for application logging, telemetry, and error reporting.
- Direct `onDiagnostic` prop in `@orbitgraph/react`.
- Error coverage for node and neighborhood lazy-loading failures.
- Graph analytics APIs for degree, in-degree, out-degree, PageRank, betweenness centrality, and community detection.
- `graph.analytics` controller in `@orbitgraph/three` with `all` and `visible` data scopes.
- Worker-backed force physics for supported browsers, with a local simulation fallback.

### Changed

- Remote requests continue to reject their original promise after OrbitGraph emits loading state and diagnostics, preserving application-level retry and recovery control.
- Force-directed layouts can run outside the browser main thread through module Workers.

## [1.1.0]

### Added

- Improved camera navigation with desktop and touch-friendly controls.
- Keyboard navigation and visible keyboard focus support.
- PNG and JSON export utilities.
- Responsive mobile graph controls.
- React imperative ref support for exploration, camera, loading, and export actions.
- React component test coverage in the validation workflow.
- Additional examples and documentation for interaction, exports, accessibility, and mobile usage.

### Changed

- Refactored the Three.js runtime into smaller focused controllers and synchronizers.
- Improved CI validation to run workspace builds and tests on pull requests.

## [1.0.0]

### Added

- Initial stable release of OrbitGraph.
- TypeScript monorepo packages for `@orbitgraph/core`, `@orbitgraph/three`, and `@orbitgraph/react`.
- Interactive 3D force-directed graph rendering with Three.js.
- Node and relationship selection, hover behavior, search, type filters, and minimum relationship weight filters.
- Progressive graph exploration with initial views, expansion, collapse, navigation history, and path focus.
- Optional animated relationship flow.
- Vanilla JavaScript, React, benchmark, and playground examples.
- Documentation, API reference, contribution guide, security policy, Code of Conduct, issue templates, and pull request validation.

### Performance

- Large graph benchmark with generated data sets from 100 to 10,000 nodes.
- Hidden exploration data excluded from active rendering and physics simulation.

## [0.5.0]

### Added

- Loading state callbacks for lazy graph data.
- Exploration improvements and related React bindings.

## [0.4.0]

### Added

- Initial exploration API, incremental view updates, and expanded package documentation.

## [0.3.0]

### Added

- First public multi-package release with core graph types, Three.js rendering, and React bindings.
