import type {
    GraphData,
    GraphFilterState,
    GraphNode,
    VisibleGraphData,
} from "@orbitgraph/core";

/** Applies search, node-type, and relationship-weight filters to graph data. */
export class GraphFilter {
    private searchQuery = "";
    private selectedTypes = new Set<string>();
    private minimumLinkWeight = 0;

    search(query: string): void {
        this.searchQuery = query.trim().toLowerCase();
    }

    toggleType(type: string): void {
        if (this.selectedTypes.has(type)) {
            this.selectedTypes.delete(type);
        } else {
            this.selectedTypes.add(type);
        }
    }

    setTypes(types: string[]): void {
        this.selectedTypes = new Set(types);
    }

    getSelectedTypes(): string[] {
        return [...this.selectedTypes];
    }

    setMinimumLinkWeight(weight: number): void {
        this.minimumLinkWeight = Math.max(0, Math.min(1, weight));
    }

    getMinimumLinkWeight(): number {
        return this.minimumLinkWeight;
    }

    /** Returns a JSON-serializable snapshot of the active filter settings. */
    getState(): GraphFilterState {
        return {
            searchQuery: this.searchQuery,
            selectedTypes: this.getSelectedTypes(),
            minimumLinkWeight: this.minimumLinkWeight,
        };
    }

    /** Restores filter settings produced by `getState()`. */
    setState(state: GraphFilterState): void {
        this.search(state.searchQuery);
        this.setTypes(state.selectedTypes);
        this.setMinimumLinkWeight(state.minimumLinkWeight);
    }

    clear(): void {
        this.searchQuery = "";
        this.selectedTypes.clear();
        this.minimumLinkWeight = 0;
    }

    getVisibleData(data: GraphData): VisibleGraphData {
        const nodes = data.nodes.filter((node) => this.matchesNode(node));
        const visibleNodeIds = new Set(nodes.map((node) => node.id));

        const links = data.links.filter((link) => {
            return (
                visibleNodeIds.has(link.source) &&
                visibleNodeIds.has(link.target) &&
                (link.weight ?? 1) >= this.minimumLinkWeight
            );
        });

        return { nodes, links };
    }

    private matchesNode(node: GraphNode): boolean {
        const typeMatches =
            this.selectedTypes.size === 0 ||
            (node.type !== undefined && this.selectedTypes.has(node.type));

        if (!typeMatches) {
            return false;
        }

        if (!this.searchQuery) {
            return true;
        }

        const searchableText = [
            node.id,
            node.label,
            node.type,
            JSON.stringify(node.data ?? {}),
        ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

        return searchableText.includes(this.searchQuery);
    }
}