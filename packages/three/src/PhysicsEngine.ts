import * as d3 from "d3-force-3d";

import type {
    GraphLayout,
    GraphLayoutOptions,
    GraphLink,
    GraphNode,
    OrbitGraphPhysicsOptions,
} from "@orbitgraph/core";

import { GraphLayoutEngine } from "./GraphLayoutEngine";
import type {
    PhysicsWorkerRequest,
    PhysicsWorkerResponse,
    WorkerPhysicsLink,
    WorkerPhysicsNode,
} from "./PhysicsWorkerProtocol";

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

/**
 * Positions active graph nodes using either a D3 force simulation or one of
 * OrbitGraph's deterministic layouts. Force simulation runs in a module
 * Worker when supported and falls back to the main thread when necessary.
 */
export class PhysicsEngine {
    private simulation: any = null;
    private nodes: PhysicsNode[] = [];
    private links: PhysicsLink[] = [];
    private onTick: (() => void) | null = null;
    private worker: Worker | null = null;
    private runId = 0;
    private usingWorker = false;

    private layout: GraphLayout = "force";
    private layoutOptions: GraphLayoutOptions = {};

    private readonly layoutEngine = new GraphLayoutEngine();
    private readonly workerEnabled: boolean;
    private readonly tickRate: number;

    constructor(options: OrbitGraphPhysicsOptions = {}) {
        this.workerEnabled = options.worker ?? true;
        this.tickRate = Math.max(1, options.tickRate ?? 60);
    }

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
        this.onTick = onTick;
        this.layout = layout;
        this.layoutOptions = { ...layoutOptions };
        this.runId += 1;

        this.applyActiveLayout();
    }

    /** Changes layout without discarding the active nodes or callback. */
    setLayout(
        layout: GraphLayout,
        options: GraphLayoutOptions = {},
    ): void {
        this.layout = layout;
        this.layoutOptions = { ...options };

        if (this.nodes.length === 0) {
            return;
        }

        this.stopActiveSimulation();
        this.runId += 1;
        this.applyActiveLayout();
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
        if (this.layout !== "force") {
            return;
        }

        if (this.usingWorker) {
            this.post({ type: "reheat", runId: this.runId, amount });
            return;
        }

        this.simulation?.alpha(amount).restart();
    }

    startDrag(node: PhysicsNode): void {
        node.fx = node.x;
        node.fy = node.y;
        node.fz = node.z;

        if (this.layout !== "force") {
            return;
        }

        if (this.usingWorker) {
            this.post({
                type: "start-drag",
                runId: this.runId,
                nodeId: node.id,
            });
            return;
        }

        this.simulation?.alphaTarget(0.3).restart();
    }

    drag(node: PhysicsNode, x: number, y: number, z: number): void {
        node.x = x;
        node.y = y;
        node.z = z;
        node.fx = x;
        node.fy = y;
        node.fz = z;

        if (this.layout !== "force") {
            this.onTick?.();
            return;
        }

        if (this.usingWorker) {
            this.post({ type: "drag", runId: this.runId, nodeId: node.id, x, y, z });
            this.onTick?.();
        }
    }

    endDrag(): void {
        if (this.layout === "force" && this.usingWorker) {
            this.post({ type: "end-drag", runId: this.runId });
            return;
        }

        if (this.layout === "force") {
            this.simulation?.alphaTarget(0);
        }
    }

    unpin(node: PhysicsNode): void {
        node.fx = null;
        node.fy = null;
        node.fz = null;

        if (this.layout !== "force") {
            return;
        }

        if (this.usingWorker) {
            this.post({ type: "unpin", runId: this.runId, nodeId: node.id });
            return;
        }

        this.reheat();
    }

    stop(): void {
        this.stopActiveSimulation();
        this.nodes = [];
        this.links = [];
        this.onTick = null;
    }

    dispose(): void {
        this.stop();
        this.worker?.terminate();
        this.worker = null;
    }

    private applyActiveLayout(): void {
        if (this.nodes.length === 0) {
            return;
        }

        if (this.layout === "force") {
            this.startForceSimulation();
            return;
        }

        this.applyDeterministicLayout();
    }

    private startForceSimulation(): void {
        if (this.shouldUseWorker()) {
            this.startWorker();
            return;
        }

        this.startLocal();
    }

    private startWorker(): void {
        try {
            this.worker ??= new Worker(
                new URL("./physics.worker.ts", import.meta.url),
                { type: "module" },
            );

            this.worker.onmessage = this.handleWorkerMessage;
            this.worker.onerror = () => this.fallbackToLocal();
            this.usingWorker = true;

            this.post({
                type: "start",
                runId: this.runId,
                nodes: this.toWorkerNodes(),
                links: this.toWorkerLinks(),
                tickRate: this.tickRate,
            });
        } catch {
            this.fallbackToLocal();
        }
    }

    private startLocal(): void {
        this.simulation = d3
            .forceSimulation(this.nodes, 3)
            .force(
                "link",
                d3
                    .forceLink(this.links)
                    .id((node: PhysicsNode) => node.id)
                    .distance(
                        (link: PhysicsLink) =>
                            10 +
                            (1 - (link.graphLink.weight ?? 0.5)) * 26,
                    )
                    .strength(
                        (link: PhysicsLink) =>
                            0.25 + (link.graphLink.weight ?? 0.5) * 0.55,
                    ),
            )
            .force("charge", d3.forceManyBody().strength(-80))
            .force("center", d3.forceCenter(0, 0, 0))
            .alpha(1)
            .alphaDecay(0.025)
            .alphaMin(0.02)
            .on("tick", () => this.onTick?.());

        this.configureLocalCollision();
    }

    private applyDeterministicLayout(): void {
        const positions = this.layoutEngine.getPositions(
            this.nodes,
            this.links.map((link) => link.graphLink),
            this.layout,
            this.layoutOptions,
        );

        for (const node of this.nodes) {
            const position = positions.get(node.id);

            if (!position) {
                continue;
            }

            node.x = position.x;
            node.y = position.y;
            node.z = position.z;
            node.vx = 0;
            node.vy = 0;
            node.vz = 0;
        }

        this.onTick?.();
    }

    private sync(): void {
        if (this.layout !== "force") {
            this.applyDeterministicLayout();
            return;
        }

        if (this.usingWorker) {
            this.post({
                type: "update",
                runId: this.runId,
                nodes: this.toWorkerNodes(),
                links: this.toWorkerLinks(),
                tickRate: this.tickRate,
            });
            return;
        }

        if (!this.simulation) {
            this.startLocal();
            return;
        }

        this.simulation.nodes(this.nodes);
        this.simulation.force("link")?.links(this.links);
        this.configureLocalCollision();
        this.reheat(0.75);
    }

    private stopActiveSimulation(): void {
        this.simulation?.stop();
        this.simulation = null;

        if (this.usingWorker) {
            this.post({ type: "stop", runId: this.runId });
        }

        this.usingWorker = false;
    }

    private configureLocalCollision(): void {
        if (!this.simulation) {
            return;
        }

        if (this.nodes.length <= MAX_NODES_WITH_COLLISION) {
            this.simulation.force(
                "collision",
                d3
                    .forceCollide()
                    .radius(
                        (node: PhysicsNode) =>
                            (node.size ?? 0.65) * 2.2,
                    ),
            );
            return;
        }

        this.simulation.force("collision", null);
    }

    private shouldUseWorker(): boolean {
        return this.workerEnabled && typeof Worker !== "undefined";
    }

    private fallbackToLocal(): void {
        if (
            this.layout !== "force" ||
            this.nodes.length === 0 ||
            !this.onTick
        ) {
            return;
        }

        this.worker?.terminate();
        this.worker = null;
        this.usingWorker = false;
        this.startLocal();
    }

    private handleWorkerMessage = (
        event: MessageEvent<PhysicsWorkerResponse>,
    ): void => {
        const message = event.data;

        if (message.runId !== this.runId) {
            return;
        }

        if (message.type === "error") {
            this.fallbackToLocal();
            return;
        }

        for (let index = 0; index < this.nodes.length; index += 1) {
            const node = this.nodes[index];
            const offset = index * 3;

            node.x = message.positions[offset];
            node.y = message.positions[offset + 1];
            node.z = message.positions[offset + 2];
        }

        this.onTick?.();
    };

    private post(message: PhysicsWorkerRequest): void {
        this.worker?.postMessage(message);
    }

    private toWorkerNodes(): WorkerPhysicsNode[] {
        return this.nodes.map(({ id, x, y, z, size, fx, fy, fz }) => ({
            id,
            x,
            y,
            z,
            size,
            fx,
            fy,
            fz,
        }));
    }

    private toWorkerLinks(): WorkerPhysicsLink[] {
        return this.links.map((link) => ({
            id: link.id,
            source:
                typeof link.source === "string"
                    ? link.source
                    : link.source.id,
            target:
                typeof link.target === "string"
                    ? link.target
                    : link.target.id,
            weight: link.graphLink.weight,
        }));
    }
}