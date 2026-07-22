import type {
    GraphLayout,
    GraphLayoutOptions,
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
};

/**
 * Turns the explored and filtered data subset into active Three.js objects
 * and a matching D3 physics simulation.
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

    refresh(): VisibleGraphData {
        const explored = this.explorer.getVisibleData();
        const visible = this.filter.getVisibleData(explored);

        this.clear();

        this.physicsNodes = visible.nodes.map((node, index) =>
            this.dataStore.getOrCreatePhysicsNode(node, index),
        );

        for (const node of this.physicsNodes) {
            this.renderer.addNode(node);
        }

        for (const link of visible.links) {
            this.renderer.addLink(link);
        }

        this.physicsLinks = visible.links.map((link) => ({
            id: link.id!,
            source: link.source,
            target: link.target,
            graphLink: link,
        }));

        this.particles.setLinks(visible.links);

        if (this.physicsNodes.length > 0) {
            this.physics.start(
                this.physicsNodes,
                this.physicsLinks,
                () => {
                    this.renderer.syncPositions();
                    this.labels.updatePosition();
                },
                this.layout,
                this.layoutOptions,
            );

            this.renderer.syncPositions();
        }

        this.options.onVisibleDataChange?.(visible);

        return visible;
    }

    setLayout(layout: GraphLayout, options: GraphLayoutOptions): void {
        this.layout = layout;
        this.layoutOptions = options;
        this.physics.setLayout(layout, options);
        this.renderer.syncPositions();
        this.labels.updatePosition();
    }

    getPhysicsNodes(): readonly PhysicsNode[] {
        return this.physicsNodes;
    }

    unpinNode(nodeId: string): void {
        const node = this.physicsNodes.find((item) => item.id === nodeId);

        if (node) {
            this.physics.unpin(node);
        }
    }

    clear(): void {
        this.physics.stop();
        this.labels.hide();
        this.particles.clear();
        this.renderer.clear();
        this.physicsNodes = [];
        this.physicsLinks = [];
    }
}