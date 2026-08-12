import type { GraphData, GraphLink, GraphNode, JSONValue } from "./types";

/** Imports the common node-link JSON shape used by Cytoscape and D3 examples. */
export function importJSON(data: GraphData): GraphData {
    return { nodes: data.nodes.map((node) => ({ ...node })), links: data.links.map((link) => ({ ...link })) };
}

/** Parses a CSV node list. `id`, `label`, `type`, `size`, and `color` are recognised columns. */
export function importCSVNodes(csv: string): GraphNode[] {
    const [header = "", ...rows] = csv.trim().split(/\r?\n/);
    const keys = parseCSVLine(header);
    return rows.filter(Boolean).map((row) => {
        const record = Object.fromEntries(parseCSVLine(row).map((value, index) => [keys[index], value]));
        const { id, label, type, size, color, ...data } = record;
        if (!id) throw new Error("CSV nodes require an id column.");
        return { id, ...(label ? { label } : {}), ...(type ? { type } : {}), ...(size ? { size: Number(size) } : {}), ...(color ? { color } : {}), data: data as Record<string, JSONValue> };
    });
}

/** Parses a CSV link list. `source`, `target`, `id`, `type`, and `weight` are recognised columns. */
export function importCSVLinks(csv: string): GraphLink[] {
    const [header = "", ...rows] = csv.trim().split(/\r?\n/);
    const keys = parseCSVLine(header);
    return rows.filter(Boolean).map((row) => {
        const record = Object.fromEntries(parseCSVLine(row).map((value, index) => [keys[index], value]));
        const { id, source, target, type, weight, color, ...data } = record;
        if (!source || !target) throw new Error("CSV links require source and target columns.");
        return { ...(id ? { id } : {}), source, target, ...(type ? { type } : {}), ...(weight ? { weight: Number(weight) } : {}), ...(color ? { color } : {}), data: data as Record<string, JSONValue> };
    });
}

/** Converts Cytoscape's `{ elements: { nodes, edges } }` format. */
export function importCytoscape(input: { elements: { nodes: Array<{ data: Record<string, JSONValue> }>; edges: Array<{ data: Record<string, JSONValue> }> } }): GraphData {
    return {
        nodes: input.elements.nodes.map(({ data }) => ({ id: String(data.id), label: typeof data.label === "string" ? data.label : undefined, type: typeof data.type === "string" ? data.type : undefined, data })),
        links: input.elements.edges.map(({ data }) => ({ id: typeof data.id === "string" ? data.id : undefined, source: String(data.source), target: String(data.target), type: typeof data.type === "string" ? data.type : undefined, data })),
    };
}

/** Converts JSON-LD resources with `@id` values into a graph. IRI-valued properties become links. */
export function importJSONLD(resources: Array<Record<string, JSONValue>>): GraphData {
    const nodes: GraphNode[] = resources.filter((item) => typeof item["@id"] === "string").map((item) => ({ id: String(item["@id"]), label: typeof item.name === "string" ? item.name : undefined, type: typeof item["@type"] === "string" ? item["@type"] : undefined, data: item }));
    const nodeIds = new Set(nodes.map((node) => node.id)); const links: GraphLink[] = [];
    for (const resource of resources) {
        const source = resource["@id"]; if (typeof source !== "string") continue;
        for (const [type, value] of Object.entries(resource)) for (const target of (Array.isArray(value) ? value : [value])) {
            if (type.startsWith("@")) continue;
            const targetId = typeof target === "string" ? target : typeof target === "object" && target && "@id" in target ? String((target as Record<string, JSONValue>)["@id"]) : undefined;
            if (targetId && nodeIds.has(targetId)) links.push({ id: `${source}:${type}:${targetId}`, source, target: targetId, type });
        }
    }
    return { nodes, links };
}

/** Converts a plain-object projection of a Neo4j result. */
export function importNeo4j(result: { records: Array<{ nodes?: Array<{ elementId?: string; identity?: unknown; labels?: string[]; properties?: Record<string, JSONValue> }>; relationships?: Array<{ elementId?: string; identity?: unknown; startNodeElementId?: string; endNodeElementId?: string; type?: string; properties?: Record<string, JSONValue> }> }> }): GraphData {
    const nodes = new Map<string, GraphNode>(); const links: GraphLink[] = [];
    result.records.forEach((record) => record.nodes?.forEach((node) => { const id = node.elementId ?? String(node.identity); nodes.set(id, { id, label: typeof node.properties?.name === "string" ? node.properties.name : id, type: node.labels?.[0], data: node.properties }); }));
    result.records.forEach((record) => record.relationships?.forEach((link) => links.push({ id: link.elementId ?? String(link.identity), source: link.startNodeElementId ?? "", target: link.endNodeElementId ?? "", type: link.type, data: link.properties })));
    return { nodes: [...nodes.values()], links: links.filter((link) => link.source && link.target) };
}

function parseCSVLine(line: string): string[] {
    return line.match(/(?:[^,"]+|"(?:[^"]|"")*")+/g)?.map((value) => value.replace(/^"|"$/g, "").replace(/""/g, '"').trim()) ?? [];
}
