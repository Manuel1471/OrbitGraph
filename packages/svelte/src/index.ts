import type { GraphData, GraphDiagnostic, GraphLoadingState, GraphNode, GraphSelection, OrbitGraphOptions, VisibleGraphData } from "@orbitgraph/core";
import { createOrbitGraph, type OrbitGraph } from "@orbitgraph/three";

export type OrbitGraphActionEvents = {
    onSelectionChange?: (value: GraphSelection) => void; onVisibleDataChange?: (value: VisibleGraphData) => void;
    onLoadingChange?: (value: GraphLoadingState) => void; onDiagnostic?: (value: GraphDiagnostic) => void;
    onKeyboardFocusChange?: (value: GraphNode | null) => void; onNodeClick?: OrbitGraphOptions["onNodeClick"];
    onLinkClick?: OrbitGraphOptions["onLinkClick"]; onNodeHover?: OrbitGraphOptions["onNodeHover"]; onLinkHover?: OrbitGraphOptions["onLinkHover"];
};
export type OrbitGraphActionOptions = OrbitGraphActionEvents & { data: GraphData; options?: OrbitGraphOptions; onReady?: (graph: OrbitGraph) => void };
export type OrbitGraphController = { readonly graph: OrbitGraph; update(value: OrbitGraphActionOptions): void; destroy(): void };

/** Creates the reactive controller used by the action, useful with runes and custom Svelte components. */
export function createOrbitGraphController(node: HTMLElement, initial: OrbitGraphActionOptions): OrbitGraphController {
    let value = initial;
    const create = (next: OrbitGraphActionOptions) => {
        const graph = createOrbitGraph(node, {
            ...next.options,
            onSelectionChange: (event) => next.onSelectionChange?.(event), onVisibleDataChange: (event) => next.onVisibleDataChange?.(event),
            onLoadingChange: (event) => next.onLoadingChange?.(event), onDiagnostic: (event) => next.onDiagnostic?.(event),
            onKeyboardFocusChange: (event) => next.onKeyboardFocusChange?.(event), onNodeClick: (event) => next.onNodeClick?.(event),
            onLinkClick: (event) => next.onLinkClick?.(event), onNodeHover: (event) => next.onNodeHover?.(event), onLinkHover: (event) => next.onLinkHover?.(event),
        });
        graph.setData(next.data); next.onReady?.(graph); return graph;
    };
    let current = create(initial);
    return {
        get graph() { return current; },
        update(next) { if (next.options !== value.options) { current.destroy(); current = create(next); } else { current.setData(next.data); next.onReady?.(current); } value = next; },
        destroy() { current.destroy(); },
    };
}

/** Svelte action with complete callbacks, reactive updates, full instance access, and cleanup. */
export function orbitGraph(node: HTMLElement, value: OrbitGraphActionOptions) {
    const controller = createOrbitGraphController(node, value);
    return { update: (next: OrbitGraphActionOptions) => controller.update(next), destroy: () => controller.destroy() };
}
export type { OrbitGraph };
