import type { GraphData, GraphNode } from "@orbitgraph/core";

export async function generateScenario(count: number, seed: number, options: { isCancelled?: () => boolean; onProgress?: (value: number) => void } = {}): Promise<GraphData | null> {
    let state = seed; const next = () => ((state = (state * 1664525 + 1013904223) >>> 0) / 4294967296);
    const nodes: GraphNode[] = [], links: GraphData["links"] = [];
    const palette = ["#22d3ee", "#a78bfa", "#34d399", "#f59e0b", "#fb7185", "#60a5fa"];
    for (let index = 0; index < count; index += 1) {
        if (options.isCancelled?.()) return null;
        nodes.push({
            id: `node-${index}`,
            label: `Entity ${index + 1}`,
            type: `group-${index % 6}`,
            color: palette[index % palette.length],
            size: index % 97 === 0 ? 1.5 : 0.62,
            data: {
                time: index,
                longitude: -110 + (index % 45),
                latitude: 15 + (index % 30),
                tier: index % 97 === 0 ? "hub" : "standard",
            },
        });
        if (index > 0) for (let edge = 0; edge < (index % 33 === 0 ? 4 : 2); edge += 1) links.push({ id: `node-${index}-${edge}`, source: `node-${index}`, target: `node-${Math.floor(next() * index)}`, weight: .25 + next() * .75, type: "relates" });
        if (index % 500 === 0) { options.onProgress?.(index / count * 100); await new Promise<void>((done) => setTimeout(done)); }
    }
    options.onProgress?.(100); return { nodes, links };
}
