import * as d3 from "d3-force-3d";

import type {
    GraphLayout,
    GraphLayoutOptions,
    GraphLink,
    GraphNode,
} from "@orbitgraph/core";

import { GraphLayoutEngine } from "./GraphLayoutEngine";

const MAX_NODES_WITH_COLLISION = 1_000;

export type PhysicsNode = GraphNode & {
    x: number;
    y: number;
    z: number;
    vx?: number;
    vy?: number;
    vz?: number;
    fx?: number | null;
    fy?: number | null;
    fz?: number | null;
};

export type PhysicsLink = {
    id: string;
    source: string | PhysicsNode;
    target: string | PhysicsNode;
    graphLink: GraphLink;
};

export class PhysicsEngine {
    private simulation: any = null;
    private nodes: PhysicsNode[] = [];
    private links: PhysicsLink[] = [];

    private layout: GraphLayout = "force";
    private layoutOptions: GraphLayoutOptions = {};
    private readonly layoutEngine = new GraphLayoutEngine();

    start(
        nodes: PhysicsNode[],
        links: PhysicsLink[],
        onTick: () => void,
        layout: GraphLayout = "force",
        layoutOptions: GraphLayoutOptions = {},
    ): void {
        this.stop();

        this.nodes = nodes;
        this.links = links;
        this.layout = layout;
        this.layoutOptions = layoutOptions;

        if (layout !== "force") {
            this.applyLayoutPositions();
        }

        const simulation = d3
            .forceSimulation(nodes, 3)
            .force(
                "link",
                d3
                    .forceLink(links)
                    .id((node: PhysicsNode) => node.id)
                    .distance((link: PhysicsLink) => {
                        return 10 + (1 - (link.graphLink.weight ?? 0.5)) * 26;
                    })
                    .strength((link: PhysicsLink) => {
                        const base = 0.25 + (link.graphLink.weight ?? 0.5) * 0.55;
                        return layout === "force" ? base : Math.min(base, 0.25);
                    }),
            )
            .force(
                "charge",
                d3.forceManyBody().strength(layout === "force" ? -80 : -18),
            )
            .force("center", d3.forceCenter(0, 0, 0))
            .alpha(1)
            .alphaDecay(layout === "force" ? 0.025 : 0.045)
            .alphaMin(0.02)
            .on("tick", onTick);

        this.configureLayoutForces(simulation);

        if (nodes.length <= MAX_NODES_WITH_COLLISION) {
            simulation.force(
                "collision",
                d3.forceCollide().radius((node: PhysicsNode) => {
                    return (node.size ?? 0.65) * 2.2;
                }),
            );
        }

        this.simulation = simulation;
    }

    setLayout(layout: GraphLayout, options: GraphLayoutOptions = {}): void {
        this.layout = layout;
        this.layoutOptions = options;

        if (!this.simulation) {
            return;
        }

        if (layout !== "force") {
            this.applyLayoutPositions();
        }

        this.configureLayoutForces(this.simulation);
        this.reheat(1);
    }

    addNode(node: PhysicsNode): void {
        this.nodes.push(node);
        this.sync();
    }

    removeNode(nodeId: string): void {
        this.nodes = this.nodes.filter((node) => node.id !== nodeId);

        this.links = this.links.filter((link) => {
            const sourceId = typeof link.source === "string" ? link.source : link.source.id;
            const targetId = typeof link.target === "string" ? link.target : link.target.id;

            return sourceId !== nodeId && targetId !== nodeId;
        });

        this.sync();
    }

    addLink(link: PhysicsLink): void {
        this.links.push(link);
        this.sync();
    }

    removeLink(linkId: string): void {
        this.links = this.links.filter((link) => link.id !== linkId);
        this.sync();
    }

    updateLink(link: PhysicsLink): void {
        const index = this.links.findIndex((currentLink) => currentLink.id === link.id);

        if (index !== -1) {
            this.links[index] = link;
            this.sync();
        }
    }

    reheat(amount = 0.6): void {
        this.simulation?.alpha(amount).restart();
    }

    startDrag(node: PhysicsNode): void {
        this.simulation?.alphaTarget(0.3).restart();
        node.fx = node.x;
        node.fy = node.y;
        node.fz = node.z;
    }

    drag(node: PhysicsNode, x: number, y: number, z: number): void {
        node.fx = x;
        node.fy = y;
        node.fz = z;
    }

    endDrag(): void {
        this.simulation?.alphaTarget(0);
    }

    unpin(node: PhysicsNode): void {
        node.fx = null;
        node.fy = null;
        node.fz = null;
        this.reheat();
    }

    stop(): void {
        this.simulation?.stop();
        this.simulation = null;
        this.nodes = [];
        this.links = [];
    }

    private sync(): void {
        if (!this.simulation) {
            return;
        }

        this.simulation.nodes(this.nodes);
        this.simulation.force("link")?.links(this.links);

        const collisionForce = this.simulation.force("collision");

        if (this.nodes.length <= MAX_NODES_WITH_COLLISION && !collisionForce) {
            this.simulation.force(
                "collision",
                d3.forceCollide().radius((node: PhysicsNode) => {
                    return (node.size ?? 0.65) * 2.2;
                }),
            );
        }

        if (this.nodes.length > MAX_NODES_WITH_COLLISION && collisionForce) {
            this.simulation.force("collision", null);
        }

        this.configureLayoutForces(this.simulation);
        this.reheat(0.75);
    }

    private applyLayoutPositions(): void {
        const positions = this.layoutEngine.getPositions(
            this.nodes,
            this.links.map((link) => link.graphLink),
            this.layout,
            this.layoutOptions,
        );

        for (const node of this.nodes) {
            const position = positions.get(node.id);

            if (!position || node.fx !== undefined && node.fx !== null) {
                continue;
            }

            node.x = position.x;
            node.y = position.y;
            node.z = position.z;
            node.vx = 0;
            node.vy = 0;
            node.vz = 0;
        }
    }

    private configureLayoutForces(simulation: any): void {
        if (this.layout === "force") {
            simulation.force("layout-x", null);
            simulation.force("layout-y", null);
            simulation.force("layout-z", null);
            return;
        }

        const positions = this.layoutEngine.getPositions(
            this.nodes,
            this.links.map((link) => link.graphLink),
            this.layout,
            this.layoutOptions,
        );

        const strength = this.layout === "hierarchical" ? 0.82 : 0.72;

        simulation.force(
            "layout-x",
            d3.forceX((node: PhysicsNode) => positions.get(node.id)?.x ?? 0).strength(strength),
        );
        simulation.force(
            "layout-y",
            d3.forceY((node: PhysicsNode) => positions.get(node.id)?.y ?? 0).strength(strength),
        );
        simulation.force(
            "layout-z",
            d3.forceZ((node: PhysicsNode) => positions.get(node.id)?.z ?? 0).strength(strength),
        );
    }
}