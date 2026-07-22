    # Interaction and export

OrbitGraph supports desktop, touch, keyboard, and programmatic exploration without requiring a custom control layer.

## Camera and touch navigation

```ts
const graph = createOrbitGraph(container, {
  camera: {
    keyboardNavigation: true,
    movementSpeed: 18,
    boostMultiplier: 2.5,
    minDistance: 2,
    maxDistance: 1000,
  },
});
```

- Drag on desktop to orbit.
- Use the wheel or trackpad to zoom.
- Use one finger to rotate on touch devices.
- Use two fingers to pan and pinch-zoom.
- Use `graph.focusNode(id)` or `graph.resetCamera()` for programmatic framing.

## Responsive mobile controls

```ts
const graph = createOrbitGraph(container, {
  mobileControls: {
    enabled: "auto",
    position: "bottom-right",
    showZoomButtons: true,
    showResetButton: true,
  },
});
```

`"auto"` shows the overlay only for coarse-pointer devices such as phones and tablets. Set `enabled: true` to show it everywhere or `enabled: false` to disable it.

## Keyboard accessibility

```ts
const graph = createOrbitGraph(container, {
  accessibility: {
    keyboardNavigation: true,
    ariaLabel: "Interactive relationship graph",
  },
});
```

| Key | Action |
| --- | --- |
| Arrow keys | Move focus among visible nodes |
| `Enter` | Select and focus the current node |
| `+` | Expand the current node |
| `-` | Collapse the current node |
| `F` | Move the camera to the current node |
| `Escape` | Clear selection and keyboard focus |

Keyboard navigation only traverses nodes in the current explored and filtered view.

## Export a PNG

```ts
const image = await graph.exportPNG();

await graph.downloadPNG("relationship-graph.png");
```

`exportPNG()` returns a `Blob`, which lets an application upload, store, or attach the image instead of downloading it.

## Export graph JSON

```ts
const allData = graph.exportJSON();

const visibleData = graph.exportJSON({
  scope: "visible",
  pretty: true,
});

graph.downloadJSON({
  scope: "visible",
  fileName: "explored-relationships.json",
});
```

Use `scope: "all"` for complete source data and `scope: "visible"` for the subset currently produced by exploration and filters.

## React actions

```tsx
const graphRef = useRef<OrbitGraphHandle>(null);

<OrbitGraph ref={graphRef} data={data} />;

graphRef.current?.focusNode("team");
await graphRef.current?.downloadPNG("relationship-graph.png");
```

The React ref API is for actions. Continue to use `data`, `options`, and callbacks as normal declarative props.