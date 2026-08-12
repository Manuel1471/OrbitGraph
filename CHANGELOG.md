# Changelog

All notable changes to OrbitGraph are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows [Semantic Versioning](https://semver.org/).

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
