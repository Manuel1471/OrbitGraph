# Contributing to OrbitGraph

Thank you for considering a contribution to OrbitGraph.

OrbitGraph is a TypeScript monorepo for exploring relationship data in 3D. Contributions can improve the graph core, Three.js renderer, React bindings, examples, documentation, tests, or performance.

## Before you start

- Search existing [issues](https://github.com/Manuel1471/OrbitGraph/issues) and pull requests before opening a new one.
- Open an issue first for major features, API changes, new dependencies, or architectural changes.
- Keep pull requests focused. Prefer several small pull requests over one unrelated large change.

## Development setup

### Prerequisites

- Node.js 22 or newer
- npm 10 or newer
- Git

### Install dependencies

```bash
git clone https://github.com/Manuel1471/OrbitGraph.git
cd OrbitGraph
npm install
```

### Validate your environment

```bash
npm run typecheck
npm run test:run
npm run build
```

## Repository structure

```txt
packages/
  core/       Shared graph types and graph utilities
  three/      Three.js renderer, physics, layouts, and interactions
  react/      React component bindings

examples/
  vanilla/    Vanilla JavaScript usage example
  react/      React usage example
  benchmark/  Performance benchmark for generated graphs

docs/         Additional documentation and API guides
```

## Local development

Run an example from the repository root:

```bash
npm run dev:vanilla
npm run dev:react
npm run dev:benchmark
```

Build a specific workspace when needed:

```bash
npm run build:core
npm run build:three
npm run build:react
```

## Branches

Create a branch from `main` using a descriptive prefix:

```bash
git switch main
git pull origin main
git switch -c feat/keyboard-navigation
```

Suggested prefixes:

| Prefix | Use for |
| --- | --- |
| `feat/` | New user-facing functionality |
| `fix/` | Bug fixes |
| `perf/` | Rendering, memory, or simulation improvements |
| `docs/` | Documentation-only changes |
| `test/` | Test coverage improvements |
| `refactor/` | Internal code improvements without API changes |
| `chore/` | Tooling, CI, or maintenance changes |

## Code guidelines

- Write TypeScript with `strict` type safety. Do not introduce unnecessary `any` types.
- Keep `@orbitgraph/core` renderer-agnostic. It must not depend on Three.js, React, or browser-only APIs.
- Keep public APIs documented with TSDoc comments.
- Preserve backward compatibility in `1.x` releases unless the change is explicitly planned for a future major release.
- Prefer small, reusable modules over adding unrelated responsibilities to `OrbitGraph.ts`.
- Dispose Three.js resources when removing meshes, materials, textures, or geometries.
- Do not commit generated `dist` output, coverage files, or `node_modules`.

## Testing

Every behavior change should include or update tests.

```bash
npm run test:run
```

Test locations:

```txt
packages/core/tests/
packages/three/tests/
```

For renderer changes, also test the relevant example manually. For performance changes, compare the benchmark with and without your change and include the observed behavior in the pull request.

## Documentation and examples

Update documentation whenever you change public behavior.

- Update the relevant package `README.md` for public package APIs.
- Update the root `README.md` for important cross-package features.
- Add or update an example when a feature benefits from a practical demonstration.
- Keep user-facing documentation and examples in English.

## Commit messages

Use concise, imperative commit messages:

```txt
feat: add keyboard graph navigation
fix: preserve selection after filtering
perf: move force simulation to a worker
docs: document lazy loading options
test: cover paginated neighborhood loading
```

## Pull requests

Before opening a pull request:

```bash
npm run typecheck
npm run test:run
npm run build
```

Your pull request should include:

- A clear summary of the change.
- The motivation or problem being solved.
- Tests added or updated.
- Documentation and example updates when the public API changes.
- Screenshots or benchmark notes for visual or performance changes.

The CI workflow must pass before a pull request can be merged.

## Reporting bugs

Include the following information when opening a bug report:

- OrbitGraph package versions
- Browser, operating system, and device details
- Minimal reproduction steps
- Expected behavior and actual behavior
- Console errors and screenshots when relevant
- Graph size: node count, relationship count, and whether link flow is enabled

## Feature requests

Explain the user problem before proposing an API. A useful feature request includes:

- The graph use case it enables
- An example dataset or interaction flow
- Expected API or visual behavior
- Performance implications for small and large graphs

## License

By contributing, you agree that your contributions will be licensed under the project's MIT License.
