import { afterEach, describe, expect, it, vi } from "vitest";

import { PhysicsEngine, type PhysicsLink, type PhysicsNode } from "../src/PhysicsEngine";

const workers: FakeWorker[] = [];

class FakeWorker {
    onmessage: ((event: MessageEvent) => void) | null = null;
    onerror: (() => void) | null = null;
    readonly postMessage = vi.fn();
    readonly terminate = vi.fn();

    constructor() {
        workers.push(this);
    }
}

describe("PhysicsEngine worker runtime", () => {
    afterEach(() => {
        workers.length = 0;
        vi.unstubAllGlobals();
    });

    it("starts a worker and applies transferred position updates", () => {
        vi.stubGlobal("Worker", FakeWorker);

        const nodes: PhysicsNode[] = [
            { id: "source", x: 0, y: 0, z: 0 },
            { id: "target", x: 1, y: 1, z: 1 },
        ];
        const links: PhysicsLink[] = [
            {
                id: "source-target",
                source: "source",
                target: "target",
                graphLink: { source: "source", target: "target", weight: 1 },
            },
        ];
        const onTick = vi.fn();
        const engine = new PhysicsEngine({ worker: true });

        engine.start(nodes, links, onTick);

        expect(workers).toHaveLength(1);
        expect(workers[0].postMessage).toHaveBeenCalledWith(
            expect.objectContaining({ type: "start", nodes: expect.any(Array) }),
        );

        workers[0].onmessage?.({
            data: {
                type: "tick",
                runId: 1,
                positions: new Float32Array([4, 5, 6, 7, 8, 9]),
            },
        } as MessageEvent);

        expect(nodes[0]).toMatchObject({ x: 4, y: 5, z: 6 });
        expect(nodes[1]).toMatchObject({ x: 7, y: 8, z: 9 });
        expect(onTick).toHaveBeenCalledOnce();

        engine.dispose();
        expect(workers[0].terminate).toHaveBeenCalledOnce();
    });
});