import type {
    GraphDataSource,
    GraphDiagnostic,
    GraphExpansionOptions,
    GraphLoadError,
    GraphLoadingState,
    GraphNeighborhoodLoadOptions,
    GraphNeighborhoodResult,
    GraphNode,
} from "@orbitgraph/core";

import { GraphDataStore } from "./GraphDataStore";
import { GraphExplorer } from "./GraphExplorer";

type GraphLazyLoaderOptions = {
    dataSource?: GraphDataSource;
    onDataChange: () => void;
    onLoadingChange?: (state: GraphLoadingState) => void;
    onDiagnostic?: (diagnostic: GraphDiagnostic) => void;
};

/**
 * Loads graph records on demand and keeps a small cache of requested
 * neighborhoods. Rendering is deliberately delegated to its owner.
 */
export class GraphLazyLoader {
    private dataSource: GraphDataSource | undefined;
    private readonly loadedNeighborhoodKeys = new Set<string>();

    private loadingState: GraphLoadingState = {
        loading: false,
        operation: null,
        nodeId: null,
        error: null,
    };

    constructor(
        private readonly dataStore: GraphDataStore,
        private readonly explorer: GraphExplorer,
        private readonly options: GraphLazyLoaderOptions,
    ) {
        this.dataSource = options.dataSource;
    }

    setDataSource(dataSource?: GraphDataSource): void {
        this.dataSource = dataSource;
        this.resetCache();
    }

    resetCache(): void {
        this.loadedNeighborhoodKeys.clear();
    }

    getLoadingState(): GraphLoadingState {
        return { ...this.loadingState };
    }

    async loadNode(nodeId: string): Promise<GraphNode | undefined> {
        const existingNode = this.dataStore.getNode(nodeId);

        if (existingNode) {
            return existingNode;
        }

        if (!this.dataSource?.getNode) {
            const loadError = this.createLoadError(
                "data-source-unavailable",
                "A GraphDataSource with getNode() is required to load a node.",
                "node",
                nodeId,
            );

            this.reportFailure(loadError);

            throw new Error(loadError.message);
        }

        this.setLoadingState({
            loading: true,
            operation: "node",
            nodeId,
            error: null,
        });

        try {
            const node = await this.dataSource.getNode(nodeId);

            if (node) {
                this.dataStore.merge({ nodes: [node], links: [] });
                this.explorer.updateData(this.dataStore.getData());
                this.options.onDataChange();
            }

            this.setLoadingState({
                loading: false,
                operation: null,
                nodeId: null,
                error: null,
            });

            return node;
        } catch (error) {
            this.reportFailure(
                this.createLoadError(
                    "request-failed",
                    this.getErrorMessage(error, `Unable to load node "${nodeId}".`),
                    "node",
                    nodeId,
                ),
            );

            throw error;
        }
    }

    async loadNeighborhood(
        nodeId: string,
        options: GraphNeighborhoodLoadOptions = {},
    ): Promise<GraphNeighborhoodResult | null> {
        if (!this.dataSource) {
            const loadError = this.createLoadError(
                "data-source-unavailable",
                "A GraphDataSource is required to load a neighborhood.",
                "neighborhood",
                nodeId,
            );

            this.reportFailure(loadError);

            throw new Error(loadError.message);
        }

        const { force = false, ...expansionOptions } = options;
        const cacheKey = this.getNeighborhoodCacheKey(
            nodeId,
            expansionOptions,
        );

        if (!force && this.loadedNeighborhoodKeys.has(cacheKey)) {
            this.explorer.expandNode(nodeId, expansionOptions);
            this.options.onDataChange();

            return null;
        }

        this.setLoadingState({
            loading: true,
            operation: "neighborhood",
            nodeId,
            error: null,
        });

        try {
            const result = await this.dataSource.getNeighborhood({
                nodeId,
                ...expansionOptions,
            });

            this.dataStore.merge(result);
            this.explorer.updateData(this.dataStore.getData());
            this.loadedNeighborhoodKeys.add(cacheKey);
            this.explorer.expandNode(nodeId, expansionOptions);
            this.options.onDataChange();

            this.setLoadingState({
                loading: false,
                operation: null,
                nodeId: null,
                error: null,
            });

            return result;
        } catch (error) {
            this.reportFailure(
                this.createLoadError(
                    "request-failed",
                    this.getErrorMessage(
                        error,
                        `Unable to load the neighborhood for "${nodeId}".`,
                    ),
                    "neighborhood",
                    nodeId,
                ),
            );

            throw error;
        }
    }

    private reportFailure(error: GraphLoadError): void {
        this.setLoadingState({
            loading: false,
            operation: null,
            nodeId: null,
            error,
        });

        this.options.onDiagnostic?.({
            level: "error",
            code: error.code,
            message: error.message,
            operation: error.operation,
            nodeId: error.nodeId,
            error,
        });
    }

    private createLoadError(
        code: GraphLoadError["code"],
        message: string,
        operation: GraphLoadError["operation"],
        nodeId: string,
    ): GraphLoadError {
        return {
            code,
            message,
            operation,
            nodeId,
        };
    }

    private getErrorMessage(error: unknown, fallback: string): string {
        if (error instanceof Error && error.message) {
            return error.message;
        }

        return fallback;
    }

    private setLoadingState(state: GraphLoadingState): void {
        this.loadingState = state;
        this.options.onLoadingChange?.(this.getLoadingState());
    }

    private getNeighborhoodCacheKey(
        nodeId: string,
        options: GraphExpansionOptions,
    ): string {
        const relationshipTypes = options.relationshipTypes
            ? [...options.relationshipTypes].sort().join("\u0000")
            : "";

        return [
            nodeId,
            options.depth ?? 1,
            options.direction ?? "both",
            relationshipTypes,
            options.limit ?? "all",
            options.offset ?? 0,
        ].join("|");
    }
}