import type {
    GraphDataSource,
    GraphNeighborhoodQuery,
    GraphNeighborhoodResult,
    GraphNode,
    JSONValue,
} from "@orbitgraph/core";

/** JSON-compatible variables passed to a GraphQL operation. */
export type GraphQLVariables = Record<string, JSONValue | undefined>;

/** A GraphQL error returned by a server response. */
export type GraphQLResponseError = {
    message: string;
    path?: Array<string | number>;
    extensions?: Record<string, JSONValue>;
};

/** Error raised when a GraphQL request or response cannot be used. */
export class GraphQLDataSourceError extends Error {
    readonly name = "GraphQLDataSourceError";

    constructor(
        message: string,
        readonly options: {
            status?: number;
            errors?: GraphQLResponseError[];
            cause?: unknown;
        } = {},
    ) {
        super(message);
    }
}

/** Function used by the adapter to execute a GraphQL document. */
export type GraphQLRequest = <TData>(
    document: string,
    variables?: GraphQLVariables,
) => Promise<TData>;

/** Options used to create a fetch-based GraphQL request function. */
export type GraphQLClientOptions = {
    /** GraphQL HTTP endpoint. */
    endpoint: string;
    /** Static or lazily resolved request headers, for example authorization. */
    headers?: HeadersInit | (() => HeadersInit | Promise<HeadersInit>);
    /** Request credentials mode. */
    credentials?: RequestCredentials;
    /** Custom fetch implementation, useful for SSR, tests, or React Native. */
    fetch?: typeof fetch;
};

/** GraphQL operation that loads one graph node. */
export type GraphQLNodeOperation<TData> = {
    /** GraphQL query or persisted-operation document. */
    document: string;
    /** Builds GraphQL variables from an OrbitGraph node id. */
    variables?: (nodeId: string) => GraphQLVariables;
    /** Maps the schema-specific response to an OrbitGraph node. */
    select: (data: TData) => GraphNode | undefined;
};

/** GraphQL operation that loads a node neighborhood or one relationship page. */
export type GraphQLNeighborhoodOperation<TData> = {
    /** GraphQL query or persisted-operation document. */
    document: string;
    /** Builds GraphQL variables from OrbitGraph's exploration query. */
    variables?: (query: GraphNeighborhoodQuery) => GraphQLVariables;
    /** Maps the schema-specific response to an OrbitGraph neighborhood page. */
    select: (data: TData) => GraphNeighborhoodResult;
};

/**
 * Schema adapter configuration for a GraphQL-backed graph data source.
 *
 * Use `request` with Apollo, urql, Relay, or any existing client. Use
 * `endpoint` to use OrbitGraph's lightweight fetch-based client instead.
 */
export type GraphQLDataSourceOptions<TNodeData = unknown, TNeighborhoodData = unknown> = {
    endpoint?: string;
    headers?: GraphQLClientOptions["headers"];
    credentials?: RequestCredentials;
    fetch?: typeof fetch;
    request?: GraphQLRequest;
    getNode?: GraphQLNodeOperation<TNodeData>;
    getNeighborhood: GraphQLNeighborhoodOperation<TNeighborhoodData>;
};

type GraphQLResponse<TData> = {
    data?: TData;
    errors?: GraphQLResponseError[];
};

/**
 * Creates a minimal GraphQL request function without adding a GraphQL client
 * dependency to OrbitGraph.
 */
export function createGraphQLClient(
    options: GraphQLClientOptions,
): GraphQLRequest {
    const fetchImplementation = options.fetch ?? globalThis.fetch;

    if (!fetchImplementation) {
        throw new GraphQLDataSourceError(
            "No fetch implementation is available for the GraphQL data source.",
        );
    }

    return async <TData>(
        document: string,
        variables: GraphQLVariables = {},
    ): Promise<TData> => {
        let response: Response;

        try {
            const headers = await resolveHeaders(options.headers);

            response = await fetchImplementation(options.endpoint, {
                method: "POST",
                credentials: options.credentials,
                headers: {
                    "content-type": "application/json",
                    ...headers,
                },
                body: JSON.stringify({ query: document, variables }),
            });
        } catch (cause) {
            throw new GraphQLDataSourceError(
                "The GraphQL request could not be completed.",
                { cause },
            );
        }

        let payload: GraphQLResponse<TData>;

        try {
            payload = (await response.json()) as GraphQLResponse<TData>;
        } catch (cause) {
            throw new GraphQLDataSourceError(
                "The GraphQL response was not valid JSON.",
                { status: response.status, cause },
            );
        }

        if (!response.ok || payload.errors?.length) {
            throw new GraphQLDataSourceError(
                payload.errors?.map((error) => error.message).join(" ") ||
                `GraphQL request failed with status ${response.status}.`,
                { status: response.status, errors: payload.errors },
            );
        }

        if (payload.data === undefined) {
            throw new GraphQLDataSourceError(
                "The GraphQL response did not include a data payload.",
                { status: response.status },
            );
        }

        return payload.data;
    };
}

/**
 * Creates an OrbitGraph lazy data source backed by GraphQL.
 *
 * GraphQL response shapes remain application-specific, so callers provide
 * small `select` functions instead of OrbitGraph assuming a server schema.
 */
export function createGraphQLDataSource<TNodeData, TNeighborhoodData>(
    options: GraphQLDataSourceOptions<TNodeData, TNeighborhoodData>,
): GraphDataSource {
    const request = options.request ?? createFetchRequest(options);
    const neighborhoodOperation = options.getNeighborhood;

    return {
        getNode: options.getNode
            ? async (nodeId: string): Promise<GraphNode | undefined> => {
                const operation = options.getNode!;
                const data = await request<TNodeData>(
                    operation.document,
                    operation.variables?.(nodeId),
                );

                return operation.select(data);
            }
            : undefined,
        getNeighborhood: async (
            query: GraphNeighborhoodQuery,
        ): Promise<GraphNeighborhoodResult> => {
            const data = await request<TNeighborhoodData>(
                neighborhoodOperation.document,
                neighborhoodOperation.variables?.(query),
            );
            const result = neighborhoodOperation.select(data);

            assertNeighborhoodResult(result);

            return result;
        },
    };
}

function createFetchRequest<TNodeData, TNeighborhoodData>(
    options: GraphQLDataSourceOptions<TNodeData, TNeighborhoodData>,
): GraphQLRequest {
    if (!options.endpoint) {
        throw new GraphQLDataSourceError(
            "createGraphQLDataSource requires either a request function or an endpoint.",
        );
    }

    return createGraphQLClient({
        endpoint: options.endpoint,
        headers: options.headers,
        credentials: options.credentials,
        fetch: options.fetch,
    });
}

async function resolveHeaders(
    headers: GraphQLClientOptions["headers"],
): Promise<Record<string, string>> {
    const resolvedHeaders =
        typeof headers === "function" ? await headers() : headers;

    return Object.fromEntries(new Headers(resolvedHeaders).entries());
}

function assertNeighborhoodResult(
    result: GraphNeighborhoodResult,
): void {
    if (!Array.isArray(result?.nodes) || !Array.isArray(result?.links)) {
        throw new GraphQLDataSourceError(
            "The GraphQL neighborhood selector must return { nodes, links }.",
        );
    }
}