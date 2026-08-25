import { describe, expect, it } from "vitest";
import { validateGraphOperations } from "../src/GraphEditor";
describe("GraphEditor", () => { it("rejects duplicate nodes and dangling links", () => { const data = { nodes: [{ id: "a" }], links: [] }; expect(validateGraphOperations(data, [{ type: "add-node", node: { id: "a" } }]).valid).toBe(false); expect(validateGraphOperations(data, [{ type: "add-link", link: { source: "a", target: "missing" } }]).valid).toBe(false); }); });
