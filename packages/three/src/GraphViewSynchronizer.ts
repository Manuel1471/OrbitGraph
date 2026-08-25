import type {
    GraphLayout,
    GraphLayoutOptions,
    GraphLink,
    VisibleGraphData,
} from "@orbitgraph/core";

import { GraphDataStore } from "./GraphDataStore";
import { GraphExplorer } from "./GraphExplorer";
import { GraphFilter } from "./GraphFilter";
import { GraphRenderer } from "./GraphRenderer";
import { LinkParticleRenderer } from "./LinkParticleRenderer";
import { NodeLabelRenderer } from "./NodeLabelRenderer";
import {
    PhysicsEngine,
    type PhysicsLink,
    type PhysicsNode,
} from "./PhysicsEngine";

type GraphViewSynchronizerOptions = {
    layout: GraphLayout;
    layoutOptions: GraphLayoutOptions;
    onVisibleDataChange?: (data: VisibleGraphData) => void;
    /** Called after active node positions or relationships change. */
    onGraphPositionChange?: (
        nodes: readonly PhysicsNode[],
        links: readonly PhysicsLink[],
    ) => void;
};

/**
 * Turns the explored and filtered data subset into active Three.js objects
 * and a matching physics simulation.
 */
export class GraphViewSynchronizer {
    private physicsNodes: PhysicsNode[] = [];
    private physicsLinks: PhysicsLink[] = [];
    private layout: GraphLayout;
    private layoutOptions: GraphLayoutOptions;

    constructor(
        private readonly dataStore: GraphDataStore,
        private readonly explorer: GraphExplorer,
        private readonly filter: GraphFilter,
        private readonly physics: PhysicsEngine,
        private readonly renderer: GraphRenderer,
        private readonly labels: NodeLabelRenderer,
        private readonly particles: LinkParticleRenderer,
        private readonly options: GraphViewSynchronizerOptions,
    ) {
        this.layout = options.layout;
        this.layoutOptions = options.layoutOptions;
    }

    refresh(overrideData?: VisibleGraphData): VisibleGraphData {
        const explored = this.explorer.getVisibleData();
        const visible = overrideData ?? this.filter.getVisibleData(explored);

        this.clear();

        this.physicsNodes = visible.nodes.map((node, index) =>
            this.dataStore.getOrCreatePhysicsNode(node, index),
        );

        for (const node of this.physicsNodes) {
            this.renderer.addNode(node);
        }

        this.renderer.setVisibleNodeIds(
            new Set(visible.nodes.map((node) => node.id)),
            this.filter.getMinimumLinkWeight(),
        );

        const activeLinks = this.consolidateParallelLinks(visible.links);

        for (const link of activeLinks) {
            this.renderer.addLink(link);
        }

        this.physicsLinks = activeLinks.map((link) => ({
            id: link.id!,
            source: link.source,
            target: link.target,
            graphLink: link,
        }));

        this.labels.setVisibleNodes(visible.nodes);
        this.particles.setLinks(activeLinks);

        if (this.physicsNodes.length > 0) {
            this.physics.start(
                this.physicsNodes,
                this.physicsLinks,
                () => {
                    this.renderer.syncPositions();
                    this.labels.updatePosition();
                    this.emitGraphPositionChange();
                },
                this.layout,
                this.layoutOptions,
            );

            this.renderer.syncPositions();
            this.labels.updatePosition();
        }

        this.emitGraphPositionChange();
        this.options.onVisibleDataChange?.(visible);

        return visible;
    }

    /**
     * Keeps every distinct connection. Only parallel links with equal
     * endpoints and type become one visual/physics edge, carrying its count
     * and combined weight in data. Source data and visible callbacks remain
     * untouched, so callers never lose their original relationships.
     */
    private consolidateParallelLinks(links: VisibleGraphData["links"]): GraphLink[] {
        const groups = new Map<string, GraphLink[]>();
        for (const link of links) {
            const key = `${link.source}\u0000${link.type ?? "related"}\u0000${link.target}`;
            const group = groups.get(key);
            if (group) group.push(link); else groups.set(key, [link]);
        }

        return [...groups.values()].map((group) => {
            if (group.length === 1) return group[0];
            const first = group[0];
            const totalWeight = group.reduce((sum, link) => sum + (link.weight ?? 1), 0);
            return {
                ...first,
                id: `aggregate:${first.source}:${first.type ?? "related"}:${first.target}`,
                // Physics expects the semantic link strength range, so keep an average.
                weight: totalWeight / group.length,
                data: {
                    ...first.data,
                    aggregateCount: group.length,
                    aggregateWeight: totalWeight,
                    aggregatedLinkIds: group
                        .map((link) => link.id)
                        .filter((id): id is string => typeof id === "string"),
                },
            };
        });
    }

    setLayout(layout: GraphLayout, options: GraphLayoutOptions): void {
        this.layout = layout;
        this.layoutOptions = options;
        this.physics.setLayout(layout, options);
        this.renderer.syncPositions();
        this.labels.updatePosition();
        this.emitGraphPositionChange();
    }

    getPhysicsNodes(): readonly PhysicsNode[] {
        return this.physicsNodes;
    }

    getPhysicsLinks(): readonly PhysicsLink[] {
        return this.physicsLinks;
    }

    unpinNode(nodeId: string): void {
        const node = this.physicsNodes.find((item) => item.id === nodeId);

        if (node) {
            this.physics.unpin(node);
        }
    }

    clear(): void {
        this.physics.stop();
        this.labels.setVisibleNodes([]);
        this.labels.hide();
        this.particles.clear();
        this.renderer.clear();
        this.physicsNodes = [];
        this.physicsLinks = [];
        this.emitGraphPositionChange();
    }

    private emitGraphPositionChange(): void {
        this.options.onGraphPositionChange?.(this.physicsNodes, this.physicsLinks);
    }
}
