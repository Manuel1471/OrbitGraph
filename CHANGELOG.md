# Changelog

All notable changes to OrbitGraph are documented in this file.

The project follows [Semantic Versioning](https://semver.org/). Package versions are released together for `@orbitgraph/core`, `@orbitgraph/three`, and `@orbitgraph/react`.

## [1.1.0] - 2026-07-21

### Added

- Hybrid desktop, touch, and keyboard camera navigation with configurable movement and zoom limits.
- Optional responsive mobile camera controls with large zoom and reset targets, enabled automatically on coarse-pointer devices.
- Keyboard accessibility for visible graph nodes, including focus indication, node activation, expansion, collapse, and selection clearing.
- PNG export and download for the current rendered graph view.
- Complete or visible graph data export and download as JSON.
- React `OrbitGraphHandle` ref API for camera, exploration, export, and loading-state actions.
- React callbacks for lazy-loading state and keyboard focus changes.
- React component, mobile controls, keyboard navigation, and export test coverage.

### Changed

- Refactored the Three.js facade into focused runtime, data-store, lazy-loader, view-synchronizer, and interaction modules.
- Updated documentation and examples for camera, accessibility, responsive controls, and exports.

## [1.0.0] - 2026-07-20

### Added

- Progressive graph exploration through `initialView` modes: `all`, `node`, `neighborhood`, and `type`.
- Exploration controls, history, shortest-path focus, lazy data loading, persisted view state, and multiple layouts.
- Vanilla and React examples, benchmark tooling, CI validation, API docs, contribution guide, security policy, and community files.

### Changed

- Hidden exploration data is excluded from rendering and force simulation.
- Search and filters refine the explored subset instead of revealing hidden data.
- Renderer and physics behavior were optimized for large graphs.

## [0.5.0] - 2026-07-20

### Added

- Optional animated relationship flow and interactive performance benchmark.

### Changed

- Reused renderer geometries and materials and reduced expensive link visuals for large graphs.

## [0.4.0] - 2026-07-20

### Added

- Initial `@orbitgraph/react` package, package READMEs, API docs, and consumer examples.

## [0.3.0] - 2026-07-20

### Added

- Labels, arrows, hover events, selections, metadata, search, filters, and incremental update APIs.

## [0.2.0] - 2026-07-20

### Added

- Three.js graph renderer with 3D force layout, orbit controls, zoom, drag, and pinning.

## [0.1.0] - 2026-07-20

### Added

- Initial `@orbitgraph/core` and `@orbitgraph/three` releases.

[Unreleased]: https://github.com/Manuel1471/OrbitGraph/compare/1.0.0...HEAD
[1.0.0]: https://github.com/Manuel1471/OrbitGraph/releases/tag/1.0.0