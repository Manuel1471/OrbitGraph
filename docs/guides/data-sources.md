# Data Sources and Diagnostics

OrbitGraph supports progressive graph exploration through `GraphDataSource`.

Your application owns authentication, transport, retries, server schema, and long-term caching. OrbitGraph owns merging received data, exploration state, and rendering only the visible subset.

## `GraphDataSource`

```ts
type GraphDataSource = {
  getNode?: (nodeId: string) => Promise<GraphNode | undefined>;
  getNeighborhood: (
    query: GraphNeighborhoodQuery,
  ) => Promise<GraphNeighborhoodResult>;
};
```

`getNeighborhood` receives a node ID plus direction, relationship type, depth, pagination limit, and offset when configured.

## REST example

```ts
import type { GraphDataSource } from "@orbitgraph/core";

const dataSource: GraphDataSource = {
  async getNode(nodeId) {
    const response = await fetch(`/api/nodes/${nodeId}`);

    if (!response.ok) {
      throw new Error(`Unable to load node ${nodeId}.`);
    }

    return response.json();
  },
  async getNeighborhood({
    nodeId,
    limit = 50,
    offset = 0,
    direction = "both",
  }) {
    const parameters = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
      direction,
    });

    const response = await fetch(
      `/api/nodes/${nodeId}/neighborhood?${parameters}`,
    );

    if (!response.ok) {
      throw new Error("Unable to load neighborhood.");
    }

    return response.json();
  },
};
```

## GraphQL example

```ts
import { createGraphQLDataSource } from "@orbitgraph/three";

const dataSource = createGraphQLDataSource({
  endpoint: "/graphql",
  headers: () => ({
    authorization: `Bearer ${getAccessToken()}`,
  }),
  getNode: {
    document: `query Person($id: ID!) {
      person(id: $id) { id label type }
    }`,
    variables: (id) => ({ id }),
    select: (data) => data.person ?? undefined,
  },
  getNeighborhood: {
    document: `query Neighborhood($nodeId: ID!, $limit: Int, $offset: Int) {
      neighborhood(nodeId: $nodeId, limit: $limit, offset: $offset) {
        nodes { id label type }
        links { id source target type weight }
        hasMore
        nextOffset
      }
    }`,
    variables: ({ nodeId, limit, offset }) => ({ nodeId, limit, offset }),
    select: (data) => data.neighborhood,
  },
});
```

`select` is the schema adapter: use it to transform your response shape into `GraphNode` or `GraphNeighborhoodResult`.

### Existing GraphQL clients

OrbitGraph does not add a GraphQL-client dependency. If the application already uses Apollo, urql, Relay, or a custom client, provide a compatible request function through the adapter's `request` option.

```ts
const dataSource = createGraphQLDataSource({
  request: async (document, variables) => {
    const result = await graphqlClient.request(document, variables);
    return result;
  },
  getNeighborhood: {
    document: NEIGHBORHOOD_QUERY,
    variables: ({ nodeId }) => ({ nodeId }),
    select: (data) => data.neighborhood,
  },
});
```

## Use a source

```ts
const graph = createOrbitGraph(container, {
  initialView: { mode: "node", nodeId: "root" },
  dataSource,
});

await graph.loadNode("root");
await graph.loadNeighborhood("root", {
  direction: "outgoing",
  limit: 50,
  offset: 0,
});
```

Loaded records are merged with existing graph data. They are then subject to the same exploration and filtering rules as local records.

## Pagination and cache behavior

Use `limit` and `offset` for nodes with many relationships.

```ts
await graph.loadNeighborhood("root", {
  direction: "outgoing",
  limit: 50,
  offset: 0,
});

await graph.loadNeighborhood("root", {
  direction: "outgoing",
  limit: 50,
  offset: 50,
});
```

OrbitGraph caches previously loaded neighborhood pages. Set `force: true` to refresh one page explicitly.

```ts
await graph.loadNeighborhood("root", {
  limit: 50,
  offset: 0,
  force: true,
});
```

## Loading state and errors

```ts
const graph = createOrbitGraph(container, {
  dataSource,
  onLoadingChange: (state) => {
    if (state.loading) {
      showLoadingIndicator(state.operation, state.nodeId);
    }

    if (state.error) {
      showError(state.error.message);
    }
  },
  onDiagnostic: (diagnostic) => {
    logger.error(diagnostic);
  },
});
```

`GraphLoadingState.error` contains the most recent structured error:

```ts
{
  code: "request-failed",
  message: "Neighborhood request timed out.",
  operation: "neighborhood",
  nodeId: "root"
}
```

`onDiagnostic` is suited to logs, telemetry, and monitoring integrations. OrbitGraph does not decide how your UI should render an error.

Remote calls still reject, so application code can decide when to retry or recover.

```ts
try {
  await graph.loadNeighborhood("root", { limit: 50 });
} catch (error) {
  showRetryAction();
}
```
