import type { GraphData } from "./types";

/** Options for deterministic label-propagation community detection. */
export type CommunityDetectionOptions = {
    /** Maximum label-propagation passes. @defaultValue 50 */
    maxIterations?: number;
    /** Uses relationship weights when choosing a community label. @defaultValue true */
    weighted?: boolean;
};

/** A connected cluster inferred from graph relationships. */
export type GraphCommunity = {
    /** Stable identifier for this detected community. */
    id: string;
    /** Node identifiers that belong to the community. */
    nodeIds: string[];
    /** Number of nodes in the community. */
    size: number;
};

/** Result returned by community detection. */
export type CommunityDetectionResult = {
    /** Communities ordered by size, then identifier. */
    communities: GraphCommunity[];
    /** Community identifier assigned to every graph node. */
    membership: Record<string, string>;
    /** Number of propagation passes executed. */
    iterations: number;
    /** Whether a pass completed without any label change. */
    converged: boolean;
};

type Neighbor = {
    nodeId: string;
    weight: number;
};

/**
 * Detects communities with a deterministic, undirected label-propagation
 * algorithm. It is a useful fast default, not a replacement for specialized
 * clustering algorithms on very large or highly connected graphs.
 */
export function detectCommunities(
    data: GraphData,
    options: CommunityDetectionOptions = {},
): CommunityDetectionResult {
    const nodeIds = data.nodes.map((node) => node.id).sort();
    const maxIterations = Math.max(1, Math.floor(options.maxIterations ?? 50));
    const adjacency = createAdjacency(data, options.weighted ?? true);
    let labels = new Map(nodeIds.map((nodeId) => [nodeId, nodeId]));
    let iterations = 0;
    let converged = nodeIds.length === 0;

    for (let iteration = 0; iteration < maxIterations; iteration += 1) {
        iterations = iteration + 1;
        const nextLabels = new Map(labels);
        let changed = false;

        for (const nodeId of nodeIds) {
            const nextLabel = chooseLabel(
                nodeId,
                adjacency.get(nodeId) ?? [],
                labels,
            );

            if (nextLabel !== labels.get(nodeId)) {
                nextLabels.set(nodeId, nextLabel);
                changed = true;
            }
        }

        labels = nextLabels;

        if (!changed) {
            converged = true;
            break;
        }
    }

    return createResult(labels, iterations, converged);
}

/**
 * Asynchronously detects communities, yielding between propagation passes so
 * a browser can update its UI. For very large or dense graphs, call this from
 * your own Worker to move the computation completely off the main thread.
 */
export async function detectCommunitiesAsync(
    data: GraphData,
    options: CommunityDetectionOptions = {},
): Promise<CommunityDetectionResult> {
    const nodeIds = data.nodes.map((node) => node.id).sort();
    const maxIterations = Math.max(1, Math.floor(options.maxIterations ?? 50));
    const adjacency = createAdjacency(data, options.weighted ?? true);
    let labels = new Map(nodeIds.map((nodeId) => [nodeId, nodeId]));
    let iterations = 0;
    let converged = nodeIds.length === 0;

    for (let iteration = 0; iteration < maxIterations; iteration += 1) {
        iterations = iteration + 1;
        const nextLabels = new Map(labels);
        let changed = false;

        for (const nodeId of nodeIds) {
            const nextLabel = chooseLabel(
                nodeId,
                adjacency.get(nodeId) ?? [],
                labels,
            );

            if (nextLabel !== labels.get(nodeId)) {
                nextLabels.set(nodeId, nextLabel);
                changed = true;
            }
        }

        labels = nextLabels;

        if (!changed) {
            converged = true;
            break;
        }

        await yieldToBrowser();
    }

    return createResult(labels, iterations, converged);
}

function createAdjacency(
    data: GraphData,
    weighted: boolean,
): Map<string, Neighbor[]> {
    const adjacency = new Map<string, Neighbor[]>(
        data.nodes.map((node) => [node.id, []]),
    );

    for (const link of data.links) {
        if (!adjacency.has(link.source) || !adjacency.has(link.target)) {
            continue;
        }

        const weight = weighted ? Math.max(0, link.weight ?? 1) : 1;

        adjacency.get(link.source)?.push({ nodeId: link.target, weight });
        adjacency.get(link.target)?.push({ nodeId: link.source, weight });
    }

    return adjacency;
}

function chooseLabel(
    nodeId: string,
    neighbors: Neighbor[],
    labels: Map<string, string>,
): string {
    if (neighbors.length === 0) {
        return labels.get(nodeId) ?? nodeId;
    }

    const scores = new Map<string, number>();

    for (const neighbor of neighbors) {
        const label = labels.get(neighbor.nodeId);

        if (!label) {
            continue;
        }

        scores.set(label, (scores.get(label) ?? 0) + neighbor.weight);
    }

    let selectedLabel = labels.get(nodeId) ?? nodeId;
    let selectedScore = -1;

    for (const [label, score] of scores) {
        if (
            score > selectedScore ||
            (score === selectedScore && label < selectedLabel)
        ) {
            selectedLabel = label;
            selectedScore = score;
        }
    }

    return selectedLabel;
}

function createResult(
    labels: Map<string, string>,
    iterations: number,
    converged: boolean,
): CommunityDetectionResult {
    const groups = new Map<string, string[]>();

    for (const [nodeId, label] of labels) {
        const nodes = groups.get(label) ?? [];
        nodes.push(nodeId);
        groups.set(label, nodes);
    }

    const communities = [...groups]
        .map(([id, nodeIds]) => ({
            id,
            nodeIds: [...nodeIds].sort(),
            size: nodeIds.length,
        }))
        .sort((left, right) => right.size - left.size || left.id.localeCompare(right.id));

    return {
        communities,
        membership: Object.fromEntries(labels),
        iterations,
        converged,
    };
}

function yieldToBrowser(): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, 0);
    });
}