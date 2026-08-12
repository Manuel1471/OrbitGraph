import type { GraphNode, GraphSelection, GraphUIRenderers } from "@orbitgraph/core";

/** Mounts optional application-rendered tooltip and detail content without prescribing a UI framework. */
export class GraphUIController {
    private tooltip: HTMLDivElement | null = null;
    private details: HTMLDivElement | null = null;
    private semantic: HTMLUListElement | null = null;

    constructor(private readonly container: HTMLElement, private readonly renderers?: GraphUIRenderers, semanticView = false) {
        if (renderers?.renderTooltip) this.tooltip = this.createRoot("orbitgraph-tooltip", "tooltip");
        if (renderers?.renderDetails) this.details = this.createRoot("orbitgraph-details", "region");
        if (semanticView) { this.semantic = document.createElement("ul"); this.semantic.className = "orbitgraph-semantic-view"; this.semantic.setAttribute("aria-label", "Visible graph nodes"); container.appendChild(this.semantic); }
    }

    update(selection: GraphSelection): void {
        this.render(this.tooltip, this.renderers?.renderTooltip?.(selection) ?? null);
        this.render(this.details, this.renderers?.renderDetails?.(selection) ?? null);
    }

    dispose(): void { this.tooltip?.remove(); this.details?.remove(); this.semantic?.remove(); }

    setSemanticNodes(nodes: GraphNode[]): void {
        if (!this.semantic) return;
        this.semantic.replaceChildren(...nodes.map((node) => { const item = document.createElement("li"); item.textContent = `${node.label ?? node.id}${node.type ? ` (${node.type})` : ""}`; return item; }));
    }

    private createRoot(className: string, role: string): HTMLDivElement {
        const root = document.createElement("div");
        root.className = className;
        root.setAttribute("role", role);
        this.container.appendChild(root);
        return root;
    }

    private render(root: HTMLDivElement | null, content: HTMLElement | null): void {
        if (!root) return;
        root.replaceChildren(...(content ? [content] : []));
        root.hidden = !content;
    }
}
