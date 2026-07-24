import { describe, expect, it, vi } from "vitest";

import {
    createGraphQLClient,
    createGraphQLDataSource,
    GraphQLDataSourceError,
    type GraphQLRequest,
} from "../src/GraphQLDataSource";

describe("GraphQLDataSource", () => {
    it("maps schema-specific GraphQL data to a GraphDataSource", async () => {
        const request = vi.fn(async <TData>(document: string): Promise<TData> => {
            if (document === "NODE_QUERY") {
                return {
                    person: { id: "ada", label: "Ada", type: "person" },
                } as TData;
            }

            return {
                neighborhood: {
                    nodes: [
                        { id: "ada", label: "Ada" },
                        { id: "grace", label: "Grace" },
                    ],
                    links: [{ source: "ada", target: "grace", type: "knows" }],
                    hasMore: false,
                },
            } as TData;
        });

        const source = createGraphQLDataSource({
            request: request as unknown as GraphQLRequest,
            getNode: {
                document: "NODE_QUERY",
                select: (data: { person: { id: string; label: string; type: string } }) => data.person,
            },
            getNeighborhood: {
                document: "NEIGHBORHOOD_QUERY",
                variables: ({ nodeId, limit, offset }) => ({ nodeId, limit, offset }),
                select: (data: {
                    neighborhood: {
                        nodes: Array<{ id: string; label: string }>;
                        links: Array<{ source: string; target: string; type: string }>;
                        hasMore: boolean;
                    };
                }) => data.neighborhood,
            },
        });

        await expect(source.getNode?.("ada")).resolves.toMatchObject({
            id: "ada",
        });
        await expect(
            source.getNeighborhood({ nodeId: "ada", limit: 25, offset: 0 }),
        ).resolves.toMatchObject({ hasMore: false });

        expect(request).toHaveBeenLastCalledWith(
            "NEIGHBORHOOD_QUERY",
            { nodeId: "ada", limit: 25, offset: 0 },
        );
    });

    it("surfaces GraphQL response errors", async () => {
        const client = createGraphQLClient({
            endpoint: "/graphql",
            fetch: vi.fn(async () =>
                new Response(
                    JSON.stringify({ errors: [{ message: "Not authorized" }] }),
                    { status: 200, headers: { "content-type": "application/json" } },
                ),
            ) as unknown as typeof fetch,
        });

        await expect(client("query Viewer { viewer { id } }")).rejects.toBeInstanceOf(
            GraphQLDataSourceError,
        );
    });
});