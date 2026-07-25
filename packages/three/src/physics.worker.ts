import * as d3 from "d3-force-3d";

import type {
    PhysicsWorkerRequest,
    PhysicsWorkerResponse,
    WorkerPhysicsLink,
    WorkerPhysicsNode,
} from "./PhysicsWorkerProtocol";

const MAX_NODES_WITH_COLLISION = 1_000;

let simulation: any = null;
let nodes: WorkerPhysicsNode[] = [];
let links: WorkerPhysicsLink[] = [];
let activeRunId = 0;
let tickIntervalMs = 1000 / 60;
let lastSentAt = 0;

/*
 * TypeScript compiles this project with DOM libraries, where `self` can be
 * inferred as Window. This narrow worker-only shape preserves the valid
 * transferable-array overload of postMessage.
 */
const workerScope = self as unknown as {
    postMessage(
        message: PhysicsWorkerResponse,
        transfer?: Transferable[],
    ): void;
    onmessage:
        | ((event: MessageEvent<PhysicsWorkerRequest>) => void)
        | null;
};

function post(message: PhysicsWorkerResponse, transfer?: Transferable[]): void {
    workerScope.postMessage(message, transfer);
}

function configureCollision(nextSimulation: any): void {
    if (nodes.length <= MAX_NODES_WITH_COLLISION) {
        nextSimulation.force(
            "collision",
            d3.forceCollide().radius((node: WorkerPhysicsNode) => {
                return (node.size ?? 0.65) * 2.2;
            }),
        );
        return;
    }

    nextSimulation.force("collision", null);
}

function createSimulation(): void {
    simulation?.stop();

    simulation = d3
        .forceSimulation(nodes, 3)
        .force(
            "link",
            d3
                .forceLink(links)
                .id((node: WorkerPhysicsNode) => node.id)
                .distance((link: { weight?: number }) => {
                    return 10 + (1 - (link.weight ?? 0.5)) * 26;
                })
                .strength((link: { weight?: number }) => {
                    return 0.25 + (link.weight ?? 0.5) * 0.55;
                }),
        )
        .force("charge", d3.forceManyBody().strength(-80))
        .force("center", d3.forceCenter(0, 0, 0))
        .alpha(1)
        .alphaDecay(0.025)
        .alphaMin(0.02)
        .on("tick", emitTick);

    configureCollision(simulation);
}

function updateSimulation(): void {
    if (!simulation) {
        createSimulation();
        return;
    }

    simulation.nodes(nodes);
    simulation.force("link")?.links(links);
    configureCollision(simulation);
    simulation.alpha(0.75).restart();
}

function emitTick(): void {
    const now = performance.now();

    if (now - lastSentAt < tickIntervalMs) {
        return;
    }

    lastSentAt = now;

    const positions = new Float32Array(nodes.length * 3);

    for (let index = 0; index < nodes.length; index += 1) {
        const node = nodes[index];
        const offset = index * 3;

        positions[offset] = node.x;
        positions[offset + 1] = node.y;
        positions[offset + 2] = node.z;
    }

    post(
        {
            type: "tick",
            runId: activeRunId,
            positions,
        },
        [positions.buffer],
    );
}

function findNode(nodeId: string): WorkerPhysicsNode | undefined {
    return nodes.find((node) => node.id === nodeId);
}

workerScope.onmessage = (event: MessageEvent<PhysicsWorkerRequest>): void => {
    const message = event.data;

    try {
        switch (message.type) {
            case "start":
                activeRunId = message.runId;
                nodes = message.nodes;
                links = message.links;
                tickIntervalMs = 1000 / Math.max(1, message.tickRate);
                lastSentAt = 0;
                createSimulation();
                break;

            case "update":
                if (message.runId !== activeRunId) break;
                nodes = message.nodes;
                links = message.links;
                tickIntervalMs = 1000 / Math.max(1, message.tickRate);
                updateSimulation();
                break;

            case "reheat":
                if (message.runId === activeRunId) {
                    simulation?.alpha(message.amount).restart();
                }
                break;

            case "start-drag": {
                if (message.runId !== activeRunId) break;
                const node = findNode(message.nodeId);
                if (node) {
                    node.fx = node.x;
                    node.fy = node.y;
                    node.fz = node.z;
                    simulation?.alphaTarget(0.3).restart();
                }
                break;
            }

            case "drag": {
                if (message.runId !== activeRunId) break;
                const node = findNode(message.nodeId);
                if (node) {
                    node.fx = message.x;
                    node.fy = message.y;
                    node.fz = message.z;
                }
                break;
            }

            case "end-drag":
                if (message.runId === activeRunId) {
                    simulation?.alphaTarget(0);
                }
                break;

            case "unpin": {
                if (message.runId !== activeRunId) break;
                const node = findNode(message.nodeId);
                if (node) {
                    node.fx = null;
                    node.fy = null;
                    node.fz = null;
                    simulation?.alpha(0.6).restart();
                }
                break;
            }

            case "stop":
                if (message.runId === activeRunId) {
                    simulation?.stop();
                    simulation = null;
                    nodes = [];
                    links = [];
                }
                break;
        }
    } catch (error) {
        post({
            type: "error",
            runId: activeRunId,
            message: error instanceof Error ? error.message : "Unknown worker error.",
        });
    }
};