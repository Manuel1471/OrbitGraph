# OrbitGraph API guide

This reference is organized around actions you can copy into an application.

## Create and load

```ts
const graph = createOrbitGraph(container, options);
graph.setData(data);
```

## Explore

```ts
graph.expandNode("team", { depth: 1, direction: "outgoing" });
graph.collapseNode("team");
graph.resetExploration();
graph.showAll();

graph.goBack();
graph.goForward();
graph.focusPath("team", "service");
```

## Search and filter

```ts
graph.search("workspace");
graph.toggleTypeFilter("service");
graph.setTypeFilters(["group", "service"]);
graph.setMinimumLinkWeight(0.7);
graph.clearFilters();
```

## Camera, touch, and keyboard

```ts
const graph = createOrbitGraph(container, {
  camera: {
    keyboardNavigation: true,
    minDistance: 2,
    maxDistance: 1000,
  },
  mobileControls: {
    enabled: "auto",
    position: "bottom-right",
  },
  accessibility: {
    ariaLabel: "Interactive relationship graph",
  },
});

graph.focusNode("team");
graph.resetCamera();
graph.unpinNode("team");
```

## Export

```ts
const png = await graph.exportPNG();
await graph.downloadPNG("network.png");

const completeJSON = graph.exportJSON();
const visibleJSON = graph.exportJSON({ scope: "visible" });
graph.downloadJSON({ scope: "visible", fileName: "visible-network.json" });
```

## Events

```ts
createOrbitGraph(container, {
  onNodeClick: ({ node }) => {},
  onLinkClick: ({ link }) => {},
  onSelectionChange: (selection) => {},
  onVisibleDataChange: ({ nodes, links }) => {},
  onLoadingChange: (state) => {},
  onKeyboardFocusChange: (node) => {},
});
```

## React

```tsx
const graphRef = useRef<OrbitGraphHandle>(null);

<OrbitGraph ref={graphRef} data={data} />;

graphRef.current?.expandNode("team");
await graphRef.current?.downloadPNG("network.png");
```

See the package README for the complete React prop and ref API.