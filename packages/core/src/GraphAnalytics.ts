import type { GraphData } from "./types";

/** Degree values for one node. */
export type GraphDegreeMetrics = {
    degree: number;
    inDegree: number;
    outDegree: number;
    weightedDegree: number;
    weightedInDegree: number;
    weightedOutDegree: number;
};

/** Options used when calculating PageRank. */
export type PageRankOptions = {
    /** PageRank damping factor. @defaultValue 0.85 */
    damping?: number;
    /** Maximum calculation iterations. @defaultValue 100 */
    maxIterations?: number;
    /** Convergence threshold. @defaultValue 0.000001 */
    tolerance?: number;
    /** Treats every relationship as having the same strength. @defaultValue false */
    ignoreWeights?: boolean;
    /** Treats directed relationships as bidirectional. @defaultValue false */
    undirected?: boolean;
};

/** Result returned by a PageRank calculation. */
export type PageRankResult = {
    scores: Record<string, number>;
    iterations: number;
    converged: boolean;
};

/** Options used when calculating unweighted Brandes betweenness centrality. */
export type BetweennessOptions = {
    /** Treats relationships as bidirectional. @defaultValue true */
    undirected?: boolean;
    /** Normalizes values into a 0 to 1 range when possible. @defaultValue true */
    normalized?: boolean;
};

/**
 * Calculates degree, in-degree, out-degree, and weighted variants for every
 * node in a graph. Relationships are interpreted as directed.
 */
export function calculateDegreeMetrics(
    data: GraphData,
): Record<string, GraphDegreeMetrics> {
    const metrics: Record<string, GraphDegreeMetrics> = {};

    for (const node of data.nodes) {
        metrics[node.id] = {
            degree: 0,
            inDegree: 0,
            outDegree: 0,
            weightedDegree: 0,
            weightedInDegree: 0,
            weightedOutDegree: 0,
        };
    }

    for (const link of data.links) {
        const source = metrics[link.source];
        const target = metrics[link.target];

        if (!source || !target) {
            continue;
        }

        const weight = link.weight ?? 1;

        source.degree += 1;
        source.outDegree += 1;
        source.weightedDegree += weight;
        source.weightedOutDegree += weight;

        target.degree += 1;
        target.inDegree += 1;
        target.weightedDegree += weight;
        target.weightedInDegree += weight;
    }

    return metrics;
}

/**
 * Calculates PageRank scores for all graph nodes.
 *
 * This is deterministic and synchronous. Use it on the server, in a Worker,
 * or for graph sizes that do not need UI yielding.
 */
export function calculatePageRank(
    data: GraphData,
    options: PageRankOptions = {},
): PageRankResult {
    const nodeIds = data.nodes.map((node) => node.id);
    const nodeCount = nodeIds.length;

    if (nodeCount === 0) {
        return { scores: {}, iterations: 0, converged: true };
    }

    const damping = clamp(options.damping ?? 0.85, 0, 1);
    const maxIterations = Math.max(1, Math.floor(options.maxIterations ?? 100));
    const tolerance = Math.max(0, options.tolerance ?? 0.000001);
    const outgoing = createWeightedOutgoingLinks(data, options);

    let scores = new Map(nodeIds.map((nodeId) => [nodeId, 1 / nodeCount]));
    let converged = false;
    let iterations = 0;

    for (let iteration = 0; iteration < maxIterations; iteration += 1) {
        iterations = iteration + 1;
        const nextScores = new Map(
            nodeIds.map((nodeId) => [nodeId, (1 - damping) / nodeCount]),
        );
        let danglingScore = 0;

        for (const nodeId of nodeIds) {
            const score = scores.get(nodeId) ?? 0;
            const links = outgoing.get(nodeId) ?? [];

            if (links.length === 0) {
                danglingScore += score;
                continue;
            }

            const totalWeight = links.reduce(
                (sum, link) => sum + link.weight,
                0,
            );

            for (const link of links) {
                const contribution =
                    totalWeight === 0 ? 0 : (score * link.weight) / totalWeight;

                nextScores.set(
                    link.target,
                    (nextScores.get(link.target) ?? 0) + damping * contribution,
                );
            }
        }

        const danglingContribution = (damping * danglingScore) / nodeCount;
        let difference = 0;

        for (const nodeId of nodeIds) {
            const nextScore =
                (nextScores.get(nodeId) ?? 0) + danglingContribution;
            difference += Math.abs(nextScore - (scores.get(nodeId) ?? 0));
            nextScores.set(nodeId, nextScore);
        }

        scores = nextScores;

        if (difference <= tolerance) {
            converged = true;
            break;
        }
    }

    return {
        scores: Object.fromEntries(scores),
        iterations,
        converged,
    };
}

/**
 * Calculates unweighted betweenness centrality with the Brandes algorithm.
 * Use it intentionally: its cost grows quickly on dense, large graphs.
 */
export function calculateBetweennessCentrality(
    data: GraphData,
    options: BetweennessOptions = {},
): Record<string, number> {
    const nodeIds = data.nodes.map((node) => node.id);
    const nodeIdSet = new Set(nodeIds);
    const undirected = options.undirected ?? true;
    const normalized = options.normalized ?? true;
    const adjacency = createUnweightedAdjacency(data, undirected);
    const centrality = new Map(nodeIds.map((nodeId) => [nodeId, 0]));

    for (const sourceId of nodeIds) {
        const stack: string[] = [];
        const predecessors = new Map<string, string[]>(
            nodeIds.map((nodeId) => [nodeId, []]),
        );
        const pathCount = new Map<string, number>(
            nodeIds.map((nodeId) => [nodeId, 0]),
        );
        const distance = new Map<string, number>(
            nodeIds.map((nodeId) => [nodeId, -1]),
        );

        pathCount.set(sourceId, 1);
        distance.set(sourceId, 0);

        const queue = [sourceId];

        for (let queueIndex = 0; queueIndex < queue.length; queueIndex += 1) {
            const currentId = queue[queueIndex];
            stack.push(currentId);

            for (const neighborId of adjacency.get(currentId) ?? []) {
                if (!nodeIdSet.has(neighborId)) {
                    continue;
                }

                if ((distance.get(neighborId) ?? -1) < 0) {
                    distance.set(
                        neighborId,
                        (distance.get(currentId) ?? 0) + 1,
                    );
                    queue.push(neighborId);
                }

                if (
                    distance.get(neighborId) ===
                    (distance.get(currentId) ?? 0) + 1
                ) {
                    predecessors.get(neighborId)?.push(currentId);
                    pathCount.set(
                        neighborId,
                        (pathCount.get(neighborId) ?? 0) +
                        (pathCount.get(currentId) ?? 0),
                    );
                }
            }
        }

        const dependency = new Map<string, number>(
            nodeIds.map((nodeId) => [nodeId, 0]),
        );

        while (stack.length > 0) {
            const nodeId = stack.pop()!;

            for (const predecessorId of predecessors.get(nodeId) ?? []) {
                const predecessorPaths = pathCount.get(predecessorId) ?? 0;
                const nodePaths = pathCount.get(nodeId) ?? 1;
                const contribution =
                    (predecessorPaths / nodePaths) *
                    (1 + (dependency.get(nodeId) ?? 0));

                dependency.set(
                    predecessorId,
                    (dependency.get(predecessorId) ?? 0) + contribution,
                );
            }

            if (nodeId !== sourceId) {
                centrality.set(
                    nodeId,
                    (centrality.get(nodeId) ?? 0) +
                    (dependency.get(nodeId) ?? 0),
                );
            }
        }
    }

    const divisor = undirected ? 2 : 1;
    const scale =
        normalized && nodeIds.length > 2
            ? undirected
                ? 2 / ((nodeIds.length - 1) * (nodeIds.length - 2))
                : 1 / ((nodeIds.length - 1) * (nodeIds.length - 2))
            : 1;

    return Object.fromEntries(
        [...centrality].map(([nodeId, score]) => [
            nodeId,
            (score / divisor) * scale,
        ]),
    );
}

type WeightedLink = { target: string; weight: number };

function createWeightedOutgoingLinks(
    data: GraphData,
    options: PageRankOptions,
): Map<string, WeightedLink[]> {
    const outgoing = new Map<string, WeightedLink[]>(
        data.nodes.map((node) => [node.id, []]),
    );

    for (const link of data.links) {
        const weight = options.ignoreWeights
            ? 1
            : Math.max(0, link.weight ?? 1);

        if (outgoing.has(link.source) && outgoing.has(link.target)) {
            outgoing.get(link.source)?.push({ target: link.target, weight });

            if (options.undirected) {
                outgoing.get(link.target)?.push({ target: link.source, weight });
            }
        }
    }

    return outgoing;
}

function createUnweightedAdjacency(
    data: GraphData,
    undirected: boolean,
): Map<string, Set<string>> {
    const adjacency = new Map<string, Set<string>>(
        data.nodes.map((node) => [node.id, new Set<string>()]),
    );

    for (const link of data.links) {
        adjacency.get(link.source)?.add(link.target);

        if (undirected) {
            adjacency.get(link.target)?.add(link.source);
        }
    }

    return adjacency;
}

function clamp(value: number, minimum: number, maximum: number): number {
    return Math.min(maximum, Math.max(minimum, value));
}