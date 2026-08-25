import { describe, expect, it, vi } from "vitest";
import { GraphYjsCollaboration } from "../src";
describe("GraphYjsCollaboration", () => {
    it("merges concurrent operation logs without replaying local writes", () => {
        const leftApplied = vi.fn(), rightApplied = vi.fn(); const left = new GraphYjsCollaboration(leftApplied), right = new GraphYjsCollaboration(rightApplied);
        left.applyLocalOperations([{ type: "add-node", node: { id: "a" } }]); right.applyState(left.encodeState());
        expect(leftApplied).not.toHaveBeenCalled(); expect(rightApplied).toHaveBeenCalledWith([{ type: "add-node", node: { id: "a" } }]); left.destroy(); right.destroy();
    });
    it("publishes collaborative presence", () => { const session = new GraphYjsCollaboration(() => {}); session.setPresence({ name: "Ada", cursor: { x: 1, y: 2 } }); expect(session.getPresence()[0]?.presence.name).toBe("Ada"); session.destroy(); });
});
