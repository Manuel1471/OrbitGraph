import type { GraphCluster, GraphClusterNode, GraphData, GraphLink } from "./types";

/** Produces aggregate cluster nodes and consolidated inter-cluster links in O(nodes + links). */
export function aggregateClusters(data: GraphData, clusters: GraphCluster[]): GraphData {
    const membership = new Map<string, GraphCluster>();
    const collapsedClusters = clusters.filter((cluster) => cluster.collapsed);
    const collapsed = new Set(collapsedClusters.map((cluster) => cluster.id));
    for (const cluster of clusters) for (const id of cluster.nodeIds) membership.set(id, cluster);

    const nodes = data.nodes.filter((node) => {
        const cluster = membership.get(node.id);
        return !cluster || !collapsed.has(cluster.id);
    });
    const metrics = new Map(collapsedClusters.map((cluster) => [cluster.id, { internalLinks: 0, externalLinks: 0, totalWeight: 0 }]));
    const endpoint = (id: string) => {
        const cluster = membership.get(id);
        return cluster && collapsed.has(cluster.id) ? `cluster:${cluster.id}` : id;
    };
    const links = new Map<string, GraphLink>();

    for (const link of data.links) {
        const sourceCluster = membership.get(link.source);
        const targetCluster = membership.get(link.target);
        const source = endpoint(link.source), target = endpoint(link.target);
        const weight = link.weight ?? 1;
        if (sourceCluster && collapsed.has(sourceCluster.id)) {
            const value = metrics.get(sourceCluster.id)!;
            if (source === target) { value.internalLinks += 1; value.totalWeight += weight; }
            else value.externalLinks += 1;
        }
        if (targetCluster && targetCluster.id !== sourceCluster?.id && collapsed.has(targetCluster.id)) metrics.get(targetCluster.id)!.externalLinks += 1;
        if (source === target) continue;
        const id = `${source}\u0000${link.type ?? "related"}\u0000${target}`;
        const previous = links.get(id);
        links.set(id, {
            ...link, id: `aggregate:${source}:${link.type ?? "related"}:${target}`, source, target,
            weight: (previous?.weight ?? 0) + weight,
            data: { ...link.data, aggregateCount: Number(previous?.data?.aggregateCount ?? 0) + 1 },
        });
    }

    for (const cluster of collapsedClusters) {
        const clusterMetrics = metrics.get(cluster.id)!;
        const node: GraphClusterNode = {
            id: `cluster:${cluster.id}`, clusterId: cluster.id, memberCount: cluster.nodeIds.length,
            label: `${cluster.label} (${cluster.nodeIds.length})`, type: "cluster",
            size: Math.max(1, Math.sqrt(cluster.nodeIds.length)), metrics: clusterMetrics,
        };
        nodes.push(node);
    }
    return { nodes, links: [...links.values()] };
}
