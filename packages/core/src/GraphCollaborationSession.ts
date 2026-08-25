import type { GraphOperation } from "./types";

export type GraphPresence = { clientId: string; name?: string; color?: string; cursor?: { x: number; y: number }; updatedAt: number };
export type GraphCollaborationTransport = { send(message: GraphCollaborationMessage): void; subscribe(listener: (message: GraphCollaborationMessage) => void): () => void };
export type GraphCollaborationMessage = { type: "presence"; presence: GraphPresence } | { type: "operations"; clientId: string; revision: number; operations: GraphOperation[] };

/** Transport-neutral LWW collaboration session. Plug into WebSocket, SSE relay, or Yjs bridge. */
export class GraphCollaborationSession {
    private revision = 0; private presence = new Map<string, GraphPresence>(); private unsubscribe: (() => void) | null = null;
    constructor(private readonly clientId: string, private readonly transport: GraphCollaborationTransport, private readonly onOperations: (operations: GraphOperation[]) => void) { this.unsubscribe = transport.subscribe((message) => this.receive(message)); }
    publishOperations(operations: GraphOperation[]): void { this.revision += 1; this.transport.send({ type: "operations", clientId: this.clientId, revision: this.revision, operations }); }
    updatePresence(presence: Omit<GraphPresence, "clientId" | "updatedAt">): void { const value = { ...presence, clientId: this.clientId, updatedAt: Date.now() }; this.presence.set(this.clientId, value); this.transport.send({ type: "presence", presence: value }); }
    getPresence(): GraphPresence[] { return [...this.presence.values()].sort((a, b) => b.updatedAt - a.updatedAt); }
    dispose(): void { this.unsubscribe?.(); this.unsubscribe = null; }
    private receive(message: GraphCollaborationMessage): void { if (message.type === "presence") { const current = this.presence.get(message.presence.clientId); if (!current || current.updatedAt <= message.presence.updatedAt) this.presence.set(message.presence.clientId, message.presence); return; } if (message.clientId !== this.clientId && message.revision > 0) this.onOperations(message.operations); }
}
