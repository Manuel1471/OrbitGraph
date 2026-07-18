# Relationship Exploration

OrbitGraph is designed for directed relationship data: an entity is represented by a node, and a connection between entities is represented by a link.

This guide explains how to model, inspect, filter, and update relationship graphs.

## Model directed relationships

A link always has a source and a target:

```ts
{
  id: "alex-invited-jordan",
  source: "alex",
  target: "jordan",
  type: "invited",
  weight: 1
}
```

The relationship above means that Alex invited Jordan. Direction is useful for invitation networks, organization structures, service dependencies, approvals, referrals, and event flows.

## Store context on nodes and links

Use `data` to retain information that belongs to the entity or relationship.

```ts
const data = {
  nodes: [
    {
      id: "alex",
      label: "Alex Morgan",
      type: "person",
      data: {
        organization: "Example Organization",
        role: "Coordinator"
      }
    },
    {
      id: "jordan",
      label: "Jordan Lee",
      type: "person"
    }
  ],
  links: [
    {
      id: "alex-invited-jordan",
      source: "alex",
      target: "jordan",
      type: "invited",
      weight: 0.9,
      data: {
        eventId: "annual-forum",
        invitedAt: "2026-07-17",
        source: "registration-system"
      }
    }
  ]
};
```

Use only JSON-compatible values in `data`: strings, numbers, booleans, `null`, arrays, and objects.

## Filter a graph

OrbitGraph provides search, type filters, and a minimum relationship weight.

```ts
graph.search("alex");

graph.toggleTypeFilter("person");
graph.toggleTypeFilter("organization");

graph.setMinimumLinkWeight(0.7);
```

Clear all active filters when the user wants to return to the full graph:

```ts
graph.clearFilters();
```

Listen for visible-data changes when your interface needs to update counts or summaries:

```ts
const graph = createOrbitGraph(container, {
  onVisibleDataChange: ({ nodes, links }) => {
    console.log(`${nodes.length} visible nodes`);
    console.log(`${links.length} visible relationships`);
  }
});
```

## Inspect a selection

Use selection events to display a side panel, statistics, or metadata.

```ts
const graph = createOrbitGraph(container, {
  onSelectionChange: (selection) => {
    if (!selection) {
      return;
    }

    if (selection.kind === "node") {
      console.log(selection.node.label, selection.node.data);
      return;
    }

    console.log(selection.link.type, selection.link.data);
  }
});
```

## Focus the camera

Guide users to an entity after a search result, a table click, or a notification.

```ts
graph.focusNode("alex");
```

Return to the default camera position with:

```ts
graph.resetCamera();
```

## Update data incrementally

Use incremental updates for data that changes over time. This avoids replacing the entire graph when only one entity or relationship changes.

```ts
graph.addNode({
  id: "casey",
  label: "Casey Nguyen",
  type: "person"
});

graph.addLink({
  id: "jordan-invited-casey",
  source: "jordan",
  target: "casey",
  type: "invited",
  weight: 1
});

graph.removeLink("jordan-invited-casey");
graph.removeNode("casey");
```

## Performance guidance

For large networks, preserve the information needed to explore the graph and avoid enabling every visual effect at once.

- Use meaningful `type` values so users can filter quickly.
- Set relationship `weight` values to support relevance filters.
- Keep animated link flow disabled unless it adds useful meaning.
- Show metadata in a regular HTML panel instead of rendering every label permanently.
- Use the benchmark example to measure your own data shape, not only node count.

## Trees and graphs

An invitation chain can be a tree when each person has one inviter and no cycles exist. In real data, a person may participate in multiple events or have several relevant relationships. That turns the structure into a directed graph.

OrbitGraph uses the same `GraphData` model for both cases. You can provide a simple tree for hierarchical exploration or a richer graph for discovering cross-connections.