import { describe, expect, it, vi } from "vitest";

import type { GraphDataSource } from "@orbitgraph/core";

import { GraphDataStore } from "../src/GraphDataStore";
import { GraphExplorer } from "../src/GraphExplorer";
import { GraphLazyLoader } from "../src/GraphLazyLoader";

function createLoader(dataSource: GraphDataSource) {
    const dataStore = new GraphDataStore();
    const explorer = new GraphExplorer();
    const onDataChange = vi.fn();
    const onDiagnostic = vi.fn();

    const loader = new GraphLazyLoader(dataStore, explorer, {
        dataSource,
        onDataChange,
        onDiagnostic,
    });

    return { loader, onDataChange, onDiagnostic };
}

describe("GraphLazyLoader errors", () => {
    it("reports a node-loading failure through diagnostics and loading state", async () => {
        const source: GraphDataSource = {
            getNode: vi.fn().mockRejectedValue(
                new Error("Node service is unavailable."),
            ),
            getNeighborhood: vi.fn(),
        };

        const { loader, onDataChange, onDiagnostic } = createLoader(source);

        await expect(loader.loadNode("ada")).rejects.toThrow(
            "Node service is unavailable.",
        );

        expect(onDataChange).not.toHaveBeenCalled();
        expect(onDiagnostic).toHaveBeenCalledWith({
            level: "error",
            code: "request-failed",
            message: "Node service is unavailable.",
            operation: "node",
            nodeId: "ada",
            error: {
                code: "request-failed",
                message: "Node service is unavailable.",
                operation: "node",
                nodeId: "ada",
            },
        });

        expect(loader.getLoadingState()).toEqual({
            loading: false,
            operation: null,
            nodeId: null,
            error: {
                code: "request-failed",
                message: "Node service is unavailable.",
                operation: "node",
                nodeId: "ada",
            },
        });
    });

    it("reports a neighborhood-loading failure through diagnostics and loading state", async () => {
        const source: GraphDataSource = {
            getNeighborhood: vi.fn().mockRejectedValue(
                new Error("Neighborhood request timed out."),
            ),
        };

        const { loader, onDataChange, onDiagnostic } = createLoader(source);

        await expect(
            loader.loadNeighborhood("ada", {
                direction: "outgoing",
                limit: 25,
            }),
        ).rejects.toThrow("Neighborhood request timed out.");

        expect(onDataChange).not.toHaveBeenCalled();
        expect(onDiagnostic).toHaveBeenCalledWith({
            level: "error",
            code: "request-failed",
            message: "Neighborhood request timed out.",
            operation: "neighborhood",
            nodeId: "ada",
            error: {
                code: "request-failed",
                message: "Neighborhood request timed out.",
                operation: "neighborhood",
                nodeId: "ada",
            },
        });

        expect(loader.getLoadingState()).toEqual({
            loading: false,
            operation: null,
            nodeId: null,
            error: {
                code: "request-failed",
                message: "Neighborhood request timed out.",
                operation: "neighborhood",
                nodeId: "ada",
            },
        });
    });
});