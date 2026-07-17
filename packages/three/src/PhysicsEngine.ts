import * as d3 from "d3-force-3d";

import type { GraphLink, GraphNode } from "@orbitgraph/core"

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

    start(
        nodes: PhysicsNode[],
        links: PhysicsLink[],
        onTick: () => void,
    ): void {
        this.stop();

        this.nodes = nodes;
        this.links = links;

        this.simulation = d3
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
                        return 0.25 + (link.graphLink.weight ?? 0.5) * 0.55;
                    }),
            )
            .force("charge", d3.forceManyBody().strength(-80))
            .force(
                "collision",
                d3.forceCollide().radius((node: PhysicsNode) => {
                    return (node.size ?? 0.65) * 2.2;
                }),
            )
            .force("center", d3.forceCenter(0, 0, 0))
            .alpha(1)
            .alphaDecay(0.025)
            .on("tick", onTick);
    }

    addNode(node: PhysicsNode): void {
        this.nodes.push(node);
        this.sync();
    }

    removeNode(nodeId: string): void {
        this.nodes = this.nodes.filter((node) => node.id !== nodeId);
        this.links = this.links.filter((link) => {
            const sourceId =
                typeof link.source === "string" ? link.source : link.source.id;

            const targetId =
                typeof link.target === "string" ? link.target : link.target.id;

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
        const index = this.links.findIndex(
            (currentLink) => currentLink.id === link.id,
        );

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

        const linkForce = this.simulation.force("link");
        linkForce?.links(this.links);

        this.reheat(0.75);
    }
}