import type { GraphData, GraphOperation } from "./types";

export type GraphValidationResult = { valid: boolean; errors: string[] };
/** Validates editing operations before an application persists or broadcasts them. */
export function validateGraphOperations(data: GraphData, operations: GraphOperation[]): GraphValidationResult {
    const nodeIds = new Set(data.nodes.map((node) => node.id)); const linkIds = new Set(data.links.map((link) => link.id).filter((id): id is string => Boolean(id))); const errors: string[] = [];
    for (const operation of operations) { if (operation.type === "add-node") { if (!operation.node.id.trim()) errors.push("Nodes require an id."); else if (nodeIds.has(operation.node.id)) errors.push(`Node "${operation.node.id}" already exists.`); else nodeIds.add(operation.node.id); } else if (operation.type === "add-link") { const id = operation.link.id; if (!nodeIds.has(operation.link.source) || !nodeIds.has(operation.link.target)) errors.push("Links must reference existing nodes."); if (id && linkIds.has(id)) errors.push(`Link "${id}" already exists.`); if (id) linkIds.add(id); } else if (operation.type === "update-node" && !nodeIds.has(operation.nodeId)) errors.push(`Node "${operation.nodeId}" does not exist.`); else if (operation.type === "remove-node") nodeIds.delete(operation.nodeId); }
    return { valid: errors.length === 0, errors };
}
