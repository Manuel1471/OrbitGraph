# Changelog

All notable changes to OrbitGraph are documented in this file.

The project follows [Semantic Versioning](https://semver.org/). Package versions are released together for `@orbitgraph/core`, `@orbitgraph/three`, and `@orbitgraph/react`.

## [1.0.0] - 2026-07-20

### Added

- Progressive graph exploration through `initialView` modes: `all`, `node`, `neighborhood`, and `type`.
- Exploration controls: `expandNode`, `collapseNode`, `resetExploration`, and `showAll`.
- Paginated relationship expansion with `limit` and `offset`.
- Exploration history with back and forward navigation.
- Shortest-path discovery and camera focus through `focusPath`.
- Persistent exploration state with `exportViewState` and `importViewState`.
- Lazy graph loading support through data-source APIs and loading-state events.
- React bindings with an imperative ref API, `onReady`, and loading-state callbacks.
- Additional layouts: force, radial, grid, and hierarchical.
- Benchmark controls for full graphs, progressive exploration, layouts, link flow, and custom data sizes up to 50,000 nodes.
- Community and project documentation: contribution guide, security policy, code of conduct, wiki, API documentation, examples, and CI validation.

### Changed

- Hidden exploration data is excluded from both WebGL rendering and force simulation.
- Search and filters now refine the explored subset instead of revealing hidden data.
- Renderer and physics behavior were optimized for large graphs.
- Package documentation now focuses on practical usage for Vanilla JavaScript and React.

### Performance

- Added progressive exploration to keep large datasets responsive from the first render.
- Added level-of-detail behavior for expensive link visuals.
- Added optional animated relationship flow, disabled by default.

## [0.5.0] - 2026-07-20

### Added

- Optional animated relationship flow with `linkFlow` configuration.
- Interactive performance benchmark with FPS, node, and relationship counters.
- Link-flow controls for comparing visual fidelity and performance.

### Changed

- Reused geometries and materials in the renderer to reduce allocations.
- Disabled expensive arrows and collision behavior for large graphs when appropriate.
- Improved incremental updates for nodes and relationships.

## [0.4.0] - 2026-07-20

### Added

- Initial public React package: `@orbitgraph/react`.
- React `OrbitGraph` component with data updates and event callbacks.
- Package-level READMEs and improved API documentation.
- Vanilla, React, and benchmark consumer examples.

### Changed

- Improved workspace build scripts and package publishing configuration.
- Expanded automated test coverage for core, renderer, physics, filtering, and integration behavior.

## [0.3.0] - 2026-07-20

### Added

- Node labels, directed link arrows, hover events, selections, and JSON metadata support.
- Search, multiple type filters, minimum link-weight filtering, visible-data events, and camera reset.
- Incremental graph update APIs for adding and removing nodes and relationships.

### Changed

- Refactored the Three.js implementation into focused renderer, interaction, filter, physics, camera, and label modules.

## [0.2.0] - 2026-07-20

### Added

- Three.js graph renderer with orbit controls, zoom, node dragging, pinning, and force-directed 3D layout.
- Directed relationships with configurable color, opacity, type, weight, and metadata.

## [0.1.0] - 2026-07-20

### Added

- Initial release of `@orbitgraph/core` and `@orbitgraph/three`.
- Core graph types, graph data utilities, and initial Three.js visualization APIs.

[1.0.0]: https://github.com/Manuel1471/OrbitGraph/releases/tag/1.0.0
[0.5.0]: https://github.com/Manuel1471/OrbitGraph/releases/tag/0.5.0
[0.4.0]: https://github.com/Manuel1471/OrbitGraph/releases/tag/0.4.0
[0.3.0]: https://github.com/Manuel1471/OrbitGraph/releases/tag/0.3.0
[0.2.0]: https://github.com/Manuel1471/OrbitGraph/releases/tag/0.2.0
[0.1.0]: https://github.com/Manuel1471/OrbitGraph/releases/tag/0.1.0