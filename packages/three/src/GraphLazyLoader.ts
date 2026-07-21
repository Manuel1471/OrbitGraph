import type {
    GraphDataSource,
    GraphExpansionOptions,
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
            throw new Error(
                "A GraphDataSource with getNode() is required to load a node.",
            );
        }

        this.setLoadingState({
            loading: true,
            operation: "node",
            nodeId,
        });

        try {
            const node = await this.dataSource.getNode(nodeId);

            if (!node) {
                return undefined;
            }

            this.dataStore.merge({ nodes: [node], links: [] });
            this.explorer.updateData(this.dataStore.getData());
            this.options.onDataChange();

            return node;
        } finally {
            this.setLoadingState({
                loading: false,
                operation: null,
                nodeId: null,
            });
        }
    }

    async loadNeighborhood(
        nodeId: string,
        options: GraphNeighborhoodLoadOptions = {},
    ): Promise<GraphNeighborhoodResult | null> {
        if (!this.dataSource) {
            throw new Error(
                "A GraphDataSource is required to load a neighborhood.",
            );
        }

        const { force = false, ...expansionOptions } = options;
        const cacheKey = this.getNeighborhoodCacheKey(nodeId, expansionOptions);

        if (!force && this.loadedNeighborhoodKeys.has(cacheKey)) {
            this.explorer.expandNode(nodeId, expansionOptions);
            this.options.onDataChange();
            return null;
        }

        this.setLoadingState({
            loading: true,
            operation: "neighborhood",
            nodeId,
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

            return result;
        } finally {
            this.setLoadingState({
                loading: false,
                operation: null,
                nodeId: null,
            });
        }
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