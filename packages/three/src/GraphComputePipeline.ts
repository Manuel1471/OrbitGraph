import type { GraphData, GraphLayout } from "@orbitgraph/core";

export type PackedGraph = {
    nodeIds: string[];
    linkIds: string[];
    positions: Float32Array;
    edges: Uint32Array;
    weights: Float32Array;
    types: Uint32Array;
    typeNames: string[];
};

export type GraphComputeResult = PackedGraph & { clusters: Uint32Array };

/** Packs object graphs into transferable arrays for worker analytics and layouts. */
export function packGraph(data: GraphData): PackedGraph {
    const nodeIds = data.nodes.map((node) => node.id), index = new Map(nodeIds.map((id, value) => [id, value]));
    const typeNames = [...new Set(data.nodes.map((node) => node.type ?? "untyped"))], typeIndex = new Map(typeNames.map((type, value) => [type, value]));
    const positions = new Float32Array(data.nodes.length * 3), edges = new Uint32Array(data.links.length * 2), weights = new Float32Array(data.links.length), types = new Uint32Array(data.nodes.length);
    data.nodes.forEach((node, value) => { positions[value * 3] = Number(node.data?.x ?? 0); positions[value * 3 + 1] = Number(node.data?.y ?? 0); positions[value * 3 + 2] = Number(node.data?.z ?? 0); types[value] = typeIndex.get(node.type ?? "untyped") ?? 0; });
    data.links.forEach((link, value) => { edges[value * 2] = index.get(link.source) ?? 0; edges[value * 2 + 1] = index.get(link.target) ?? 0; weights[value] = link.weight ?? 1; });
    return { nodeIds, linkIds: data.links.map((link, value) => link.id ?? `link-${value}`), positions, edges, weights, types, typeNames };
}

/** Worker client for transferable layout, clustering, and graph transformation. */
export class GraphComputePipeline {
    private worker: Worker | null = null; private request = 0;
    async compute(data: GraphData, layout: GraphLayout = "force", signal?: AbortSignal): Promise<GraphComputeResult> {
        if (typeof Worker === "undefined") return computePackedGraph(packGraph(data), layout);
        this.worker ??= createComputeWorker();
        const id = ++this.request, packed = packGraph(data);
        return new Promise((resolve, reject) => {
            const listener = (event: MessageEvent<{ id: number; result?: GraphComputeResult; error?: string }>) => {
                if (event.data.id !== id) return; this.worker?.removeEventListener("message", listener); signal?.removeEventListener("abort", abort);
                event.data.result ? resolve(event.data.result) : reject(new Error(event.data.error ?? "Graph computation failed."));
            };
            const abort = () => {
                this.worker?.postMessage({ type: "cancel", id });
                this.worker?.removeEventListener("message", listener);
                signal?.removeEventListener("abort", abort);
                reject(new DOMException("Graph computation cancelled.", "AbortError"));
            };
            if (signal?.aborted) { abort(); return; }
            signal?.addEventListener("abort", abort, { once: true });
            this.worker!.addEventListener("message", listener);
            this.worker!.postMessage({ type: "compute", id, packed, layout }, [packed.positions.buffer, packed.edges.buffer, packed.weights.buffer, packed.types.buffer]);
        });
    }
    dispose(): void { this.worker?.terminate(); this.worker = null; }
}

function createComputeWorker(): Worker {
    const source = `
const components=(n,edges)=>{const parent=new Uint32Array(n);for(let i=0;i<n;i++)parent[i]=i;const root=(i)=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i]}return i};for(let i=0;i<edges.length;i+=2){const a=root(edges[i]),b=root(edges[i+1]);if(a!==b)parent[b]=a}const ids=new Map(),out=new Uint32Array(n);for(let i=0;i<n;i++){const r=root(i);if(!ids.has(r))ids.set(r,ids.size);out[i]=ids.get(r)}return out};
const arrange=(p,layout)=>{const n=p.nodeIds.length,cols=Math.max(1,Math.ceil(Math.sqrt(n))),tau=Math.PI*2;for(let i=0;i<n;i++){let x=0,y=0,z=0;if(layout==='radial'||layout==='concentric'){const a=i/Math.max(1,n)*tau,r=20+(layout==='concentric'?p.types[i]*25:Math.sqrt(n)*6);x=Math.cos(a)*r;y=Math.sin(a)*r}else if(layout==='sphere'){const t=(i+.5)/Math.max(1,n),a=Math.acos(1-2*t),b=Math.PI*(1+Math.sqrt(5))*i,r=Math.sqrt(n)*6;x=r*Math.sin(a)*Math.cos(b);y=r*Math.sin(a)*Math.sin(b);z=r*Math.cos(a)}else if(layout==='arc'){const a=Math.PI*(i/Math.max(1,n-1));x=Math.cos(a)*n*.8;y=Math.sin(a)*n*.8}else if(layout==='timeline'){x=i*12;y=(p.types[i]%7)*12}else if(layout==='hierarchical'||layout==='dag'||layout==='sankey'){const layer=Math.floor(Math.log2(i+1));x=layer*90;y=(i-(2**layer-1))*18}else{x=(i%cols)*12;y=Math.floor(i/cols)*12}p.positions[i*3]=x;p.positions[i*3+1]=y;p.positions[i*3+2]=z}};
self.onmessage=(event)=>{const m=event.data;if(m.type==='cancel'){self.cancelled??=new Set();self.cancelled.add(m.id);return}try{if(self.cancelled?.delete(m.id))return;const p=m.packed;arrange(p,m.layout);const clusters=components(p.nodeIds.length,p.edges),result={...p,clusters};self.postMessage({id:m.id,result},[result.positions.buffer,result.edges.buffer,result.weights.buffer,result.types.buffer,result.clusters.buffer])}catch(error){self.postMessage({id:m.id,error:String(error?.message??error)})}}`;
    const url = URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
    const worker = new Worker(url); URL.revokeObjectURL(url); return worker;
}

export function computePackedGraph(packed: PackedGraph, layout: GraphLayout): GraphComputeResult {
    const count = packed.nodeIds.length, columns = Math.max(1, Math.ceil(Math.sqrt(count))), clusters = connectedComponents(count, packed.edges);
    for (let index = 0; index < count; index += 1) {
        let x = 0, y = 0, z = 0;
        if (layout === "radial" || layout === "concentric") { const angle = index / Math.max(1, count) * Math.PI * 2, radius = 20 + (layout === "concentric" ? packed.types[index] * 25 : Math.sqrt(count) * 6); x = Math.cos(angle) * radius; y = Math.sin(angle) * radius; }
        else if (layout === "sphere") { const t = (index + 0.5) / Math.max(1, count), polar = Math.acos(1 - 2 * t), azimuth = Math.PI * (1 + Math.sqrt(5)) * index, radius = Math.sqrt(count) * 6; x = radius * Math.sin(polar) * Math.cos(azimuth); y = radius * Math.sin(polar) * Math.sin(azimuth); z = radius * Math.cos(polar); }
        else if (layout === "arc") { const angle = Math.PI * index / Math.max(1, count - 1); x = Math.cos(angle) * count * 0.8; y = Math.sin(angle) * count * 0.8; }
        else if (layout === "timeline") { x = index * 12; y = (packed.types[index] % 7) * 12; }
        else if (layout === "hierarchical" || layout === "dag" || layout === "sankey") { const layer = Math.floor(Math.log2(index + 1)); x = layer * 90; y = (index - (2 ** layer - 1)) * 18; }
        else { x = (index % columns) * 12; y = Math.floor(index / columns) * 12; }
        packed.positions[index * 3] = x; packed.positions[index * 3 + 1] = y; packed.positions[index * 3 + 2] = z;
    }
    return { ...packed, clusters };
}

function connectedComponents(count: number, edges: Uint32Array): Uint32Array {
    const parent = new Uint32Array(count); for (let index = 0; index < count; index += 1) parent[index] = index;
    const root = (value: number): number => { while (parent[value] !== value) { parent[value] = parent[parent[value]]; value = parent[value]; } return value; };
    for (let index = 0; index < edges.length; index += 2) { const source = root(edges[index]), target = root(edges[index + 1]); if (source !== target) parent[target] = source; }
    const ids = new Map<number, number>(), result = new Uint32Array(count);
    for (let index = 0; index < count; index += 1) { const component = root(index); if (!ids.has(component)) ids.set(component, ids.size); result[index] = ids.get(component)!; }
    return result;
}
