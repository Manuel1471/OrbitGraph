# @orbitgraph/react

React bindings for OrbitGraph.

`@orbitgraph/react` mounts the Three.js renderer, updates it when `data` changes, forwards events declaratively, and exposes user-driven actions through a typed ref.

## Install

```bash
npm install @orbitgraph/core @orbitgraph/three @orbitgraph/react three
```

React 18 and React 19 are supported.

## Quick start

```tsx
import { useRef } from "react";
import { OrbitGraph, type OrbitGraphHandle } from "@orbitgraph/react";
import type { GraphData } from "@orbitgraph/core";

const data: GraphData = {
    nodes: [
        { id: "team", label: "Product Team", type: "team", color: "#22d3ee" },
        { id: "api", label: "Public API", type: "service", color: "#3b82f6" },
    ],
    links: [{ id: "team-api", source: "team", target: "api", type: "owns" }],
};

export function App() {
    const graphRef = useRef<OrbitGraphHandle>(null);

    return (
        <>
            <button onClick={() => graphRef.current?.focusNode("team")}>
                Focus team
            </button>

            <OrbitGraph
                ref={graphRef}
                data={data}
                style={{ width: "100%", height: "100vh" }}
                options={{
                    initialView: { mode: "node", nodeId: "team" },
                    labels: { mode: "important", importantNodeIds: ["team"] },
                    miniMap: { enabled: true, interactive: true },
                    physics: { worker: true },
                }}
                onSelectionChange={(selection) => console.log(selection)}
            />
        </>
    );
}
```

## Props

```ts
type OrbitGraphProps = {
    data: GraphData;
    options?: OrbitGraphOptions;
    className?: string;
    style?: React.CSSProperties;

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

`data` is declarative: replacing it resets exploration to the configured `initialView`. Put all renderer, physics, labels, mini-map, camera, and remote source configuration in `options`.

## Ref API

```ts
type OrbitGraphHandle = {
    resetCamera(): void;
    focusNode(nodeId: string): void;
    expandNode(nodeId: string, options?: GraphExpansionOptions): void;
    collapseNode(nodeId: string): void;
    resetExploration(): void;
    showAll(): void;
    setInitialView(view: GraphInitialView): void;

    loadNode(nodeId: string): Promise<GraphNode | undefined>;
    loadNeighborhood(nodeId: string, options?: GraphNeighborhoodLoadOptions): Promise<GraphNeighborhoodResult | null>;
    getLoadingState(): GraphLoadingState;

    exportPNG(): Promise<Blob>;
    downloadPNG(fileName?: string): Promise<void>;
    exportJSON(options?: GraphJSONExportOptions): string;
    downloadJSON(options?: GraphJSONExportOptions & { fileName?: string }): void;
    exportSVG(): string;
    downloadSVG(fileName?: string): void;
    exportPDF(options?: { title?: string; summary?: string }): Promise<Blob>;
    downloadPDF(fileName?: string, options?: { title?: string; summary?: string }): Promise<void>;

    getAnalytics(): GraphAnalyticsController;
    getPresentation(): GraphPresentationController;

    setAdvancedFilters(options: { minimumLinkWeight?: number; maximumLinkWeight?: number; attributes?: GraphAttributeFilter[] }): void;
    shareView(): string;
    loadSharedView(encodedState: string): void;
    addAnnotation(annotation: GraphAnnotation): void;
    getAnnotations(): GraphAnnotation[];
    saveBookmark(id: string, name: string): GraphBookmark | undefined;
    restoreBookmark(id: string): boolean;

    clusterCommunities(): GraphCluster[];
    collapseCluster(clusterId: string): void;
    expandCluster(clusterId: string): void;
    setLayout(layout: GraphLayout, options?: GraphLayoutOptions): void;
    enableClusterLevelOfDetail(zoomOutDistance?: number): boolean;
    disableClusterLevelOfDetail(): void;
    isClusterLevelOfDetailEnabled(): boolean;
    computeInWorker(layout?: GraphLayout, signal?: AbortSignal): Promise<GraphComputeResult>;
    connectYjs(provider: GraphYjsProvider): GraphYjsCollaboration;
};
```

Use the ref for actions caused by buttons, menus, shortcuts, or external application state. Keep graph data itself in the `data` prop.

## Remote loading and diagnostics

```tsx
<OrbitGraph
    ref={graphRef}
    data={initialData}
    options={{ dataSource }}
    onLoadingChange={(state) => setLoadingState(state)}
    onDiagnostic={(diagnostic) => setError(diagnostic.message)}
/>
```

```ts
await graphRef.current?.loadNeighborhood("team", {
    direction: "outgoing",
    limit: 25,
    offset: 0,
});
```

## Analytics

```ts
const graph = graphRef.current;

const pageRank = graph?.getAnalytics().pageRank({ scope: "visible" });

graph?.getPresentation().setNodeStyles({
    "api": { color: "#facc15", scale: 1.6, glow: 0.9 },
});
```

Use `getAnalytics()` for degree, PageRank, betweenness, and communities. Use `getPresentation()` to turn results into temporary color, size, and glow styles.

## Advanced exploration

```tsx
<button onClick={() => {
    const clusters = graphRef.current?.clusterCommunities() ?? [];
    if (clusters[0]) graphRef.current?.collapseCluster(clusters[0].id);
}}>
    Collapse first community
</button>
```

The ref also exposes `setAdvancedFilters()`, shared-view serialization, annotations, and bookmarks. Configure tooltip/detail renderers, semantic accessibility, and telemetry through the component's `options` prop exactly as in `@orbitgraph/three`.

## Related packages

- [`@orbitgraph/core`](https://www.npmjs.com/package/@orbitgraph/core): shared types and analysis utilities.
- [`@orbitgraph/three`](https://www.npmjs.com/package/@orbitgraph/three): Three.js renderer used by this component.

## License

MIT
