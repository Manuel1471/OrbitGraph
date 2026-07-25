/** Serializable node data sent between the main thread and the physics worker. */
export type WorkerPhysicsNode = {
    id: string;
    x: number;
    y: number;
    z: number;
    size?: number;
    fx?: number | null;
    fy?: number | null;
    fz?: number | null;
};

/** Serializable relationship data required by the force simulation. */
export type WorkerPhysicsLink = {
    id: string;
    source: string;
    target: string;
    weight?: number;
};

export type PhysicsWorkerRequest =
    | {
    type: "start" | "update";
    runId: number;
    nodes: WorkerPhysicsNode[];
    links: WorkerPhysicsLink[];
    tickRate: number;
}
    | { type: "reheat"; runId: number; amount: number }
    | { type: "start-drag"; runId: number; nodeId: string }
    | {
    type: "drag";
    runId: number;
    nodeId: string;
    x: number;
    y: number;
    z: number;
}
    | { type: "end-drag"; runId: number }
    | { type: "unpin"; runId: number; nodeId: string }
    | { type: "stop"; runId: number };

export type PhysicsWorkerResponse =
    | {
    type: "tick";
    runId: number;
    positions: Float32Array;
}
    | {
    type: "error";
    runId: number;
    message: string;
};