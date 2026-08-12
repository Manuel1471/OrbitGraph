import type { GraphData } from "@orbitgraph/core";
/** Snapshot history for reversible graph editing; capped to protect memory. */
export class GraphHistory {
    private entries: GraphData[] = []; private index = -1;
    push(data: GraphData): void { this.entries = this.entries.slice(0, this.index + 1); this.entries.push(structuredClone(data)); this.entries = this.entries.slice(-100); this.index = this.entries.length - 1; }
    undo(): GraphData | null { if (this.index <= 0) return null; this.index -= 1; return structuredClone(this.entries[this.index]); }
    redo(): GraphData | null { if (this.index >= this.entries.length - 1) return null; this.index += 1; return structuredClone(this.entries[this.index]); }
}
