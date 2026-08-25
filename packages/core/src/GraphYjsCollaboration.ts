import * as Y from "yjs";
import { Awareness, applyAwarenessUpdate, encodeAwarenessUpdate } from "y-protocols/awareness";
import type { GraphOperation } from "./types";

export type GraphYjsProvider = {
    sendUpdate(update: Uint8Array): void;
    subscribeUpdates(listener: (update: Uint8Array) => void): () => void;
    sendAwareness?(update: Uint8Array): void;
    subscribeAwareness?(listener: (update: Uint8Array) => void): () => void;
};

export type GraphYjsPresence = { name?: string; color?: string; cursor?: { x: number; y: number }; selection?: string[] };

/** Conflict-free operation log and presence backed by Yjs CRDTs. */
export class GraphYjsCollaboration {
    readonly doc: Y.Doc;
    readonly awareness: Awareness;
    private readonly operations: Y.Array<GraphOperation>;
    private readonly localOrigin = Symbol("orbitgraph-local");
    private readonly disposers: Array<() => void> = [];

    constructor(private readonly onOperations: (operations: GraphOperation[]) => void, provider?: GraphYjsProvider, doc = new Y.Doc()) {
        this.doc = doc; this.awareness = new Awareness(doc); this.operations = doc.getArray<GraphOperation>("graph-operations");
        this.operations.observe((event) => {
            if (event.transaction.origin === this.localOrigin) return;
            const inserted: GraphOperation[] = [];
            for (const delta of event.changes.delta) if (delta.insert) inserted.push(...delta.insert as GraphOperation[]);
            if (inserted.length) this.onOperations(inserted);
        });
        if (provider) this.attachProvider(provider);
    }

    applyLocalOperations(operations: GraphOperation[]): void {
        if (!operations.length) return;
        this.doc.transact(() => this.operations.push(operations), this.localOrigin);
    }

    setPresence(presence: GraphYjsPresence): void { this.awareness.setLocalStateField("user", presence); }
    getPresence(): Array<{ clientId: number; presence: GraphYjsPresence }> {
        return [...this.awareness.getStates()].flatMap(([clientId, state]) => state.user ? [{ clientId, presence: state.user as GraphYjsPresence }] : []);
    }

    encodeState(): Uint8Array { return Y.encodeStateAsUpdate(this.doc); }
    applyState(update: Uint8Array): void { Y.applyUpdate(this.doc, update, "orbitgraph-remote"); }

    attachProvider(provider: GraphYjsProvider): () => void {
        const update = (value: Uint8Array, origin: unknown) => { if (origin !== "orbitgraph-remote") provider.sendUpdate(value); };
        const awareness = ({ added, updated, removed }: { added: number[]; updated: number[]; removed: number[] }, origin: unknown) => {
            if (origin !== "orbitgraph-remote") provider.sendAwareness?.(encodeAwarenessUpdate(this.awareness, [...added, ...updated, ...removed]));
        };
        this.doc.on("update", update); this.awareness.on("update", awareness);
        const offUpdates = provider.subscribeUpdates((value) => Y.applyUpdate(this.doc, value, "orbitgraph-remote"));
        const offAwareness = provider.subscribeAwareness?.((value) => applyAwarenessUpdate(this.awareness, value, "orbitgraph-remote"));
        const dispose = () => { this.doc.off("update", update); this.awareness.off("update", awareness); offUpdates(); offAwareness?.(); };
        this.disposers.push(dispose); return dispose;
    }

    destroy(): void { this.disposers.splice(0).forEach((dispose) => dispose()); this.awareness.destroy(); this.doc.destroy(); }
}
