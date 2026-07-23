import {
    calculateBetweennessCentrality,
    calculateDegreeMetrics,
    calculatePageRank,
    detectCommunities,
    detectCommunitiesAsync,
    type BetweennessOptions,
    type CommunityDetectionOptions,
    type CommunityDetectionResult,
    type GraphData,
    type GraphDegreeMetrics,
    type PageRankOptions,
    type PageRankResult,
} from "@orbitgraph/core";

/** Selects which portion of OrbitGraph data should be analyzed. */
export type GraphAnalyticsScope = "all" | "visible";

/** Shared option for every analytics operation. */
export type GraphAnalyticsScopeOptions = {
    /**
     * Analyzes the complete loaded data or only the explored and filtered
     * subset. @defaultValue "all"
     */
    scope?: GraphAnalyticsScope;
};

export type DegreeMetricsOptions = GraphAnalyticsScopeOptions;
export type PageRankAnalyticsOptions = PageRankOptions &
    GraphAnalyticsScopeOptions;
export type BetweennessAnalyticsOptions = BetweennessOptions &
    GraphAnalyticsScopeOptions;
export type CommunityDetectionAnalyticsOptions = CommunityDetectionOptions &
    GraphAnalyticsScopeOptions;

export type {
    BetweennessOptions,
    CommunityDetectionOptions,
    CommunityDetectionResult,
    GraphDegreeMetrics,
    PageRankOptions,
    PageRankResult,
};

/**
 * Analytics API attached to an OrbitGraph instance as `graph.analytics`.
 * It deliberately does not modify node styles or graph data.
 */
export class GraphAnalyticsController {
    constructor(
        private readonly getAllData: () => GraphData,
        private readonly getVisibleData: () => GraphData,
    ) {}

    /** Calculates degree, in-degree, out-degree, and weighted variants. */
    degree(
        options: DegreeMetricsOptions = {},
    ): Record<string, GraphDegreeMetrics> {
        return calculateDegreeMetrics(this.getData(options.scope));
    }

    /** Calculates PageRank for the selected graph scope. */
    pageRank(options: PageRankAnalyticsOptions = {}): PageRankResult {
        const { scope, ...pageRankOptions } = options;

        return calculatePageRank(this.getData(scope), pageRankOptions);
    }

    /** Calculates unweighted Brandes betweenness centrality. */
    betweenness(
        options: BetweennessAnalyticsOptions = {},
    ): Record<string, number> {
        const { scope, ...betweennessOptions } = options;

        return calculateBetweennessCentrality(
            this.getData(scope),
            betweennessOptions,
        );
    }

    /** Synchronously detects graph communities with label propagation. */
    detectCommunities(
        options: CommunityDetectionAnalyticsOptions = {},
    ): CommunityDetectionResult {
        const { scope, ...communityOptions } = options;

        return detectCommunities(this.getData(scope), communityOptions);
    }

    /**
     * Detects communities while yielding between propagation passes. Use this
     * version from interactive browser views; use a Worker for huge graphs.
     */
    detectCommunitiesAsync(
        options: CommunityDetectionAnalyticsOptions = {},
    ): Promise<CommunityDetectionResult> {
        const { scope, ...communityOptions } = options;

        return detectCommunitiesAsync(this.getData(scope), communityOptions);
    }

    private getData(scope: GraphAnalyticsScope | undefined): GraphData {
        return scope === "visible" ? this.getVisibleData() : this.getAllData();
    }
}