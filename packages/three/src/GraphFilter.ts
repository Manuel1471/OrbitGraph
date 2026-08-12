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
    private maximumLinkWeight: number | undefined;
    private attributes: NonNullable<GraphFilterState["attributes"]> = [];
    private hiddenNodeIds = new Set<string>();

    setHiddenNodeIds(nodeIds: Iterable<string>): void { this.hiddenNodeIds = new Set(nodeIds); }

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

    setLinkWeightRange(minimum = 0, maximum?: number): void {
        this.setMinimumLinkWeight(minimum);
        this.maximumLinkWeight = maximum === undefined ? undefined : Math.max(this.minimumLinkWeight, Math.min(1, maximum));
    }

    setAttributeFilters(attributes: NonNullable<GraphFilterState["attributes"]>): void {
        this.attributes = attributes.map((filter) => ({ ...filter }));
    }

    /** Returns a JSON-serializable snapshot of the active filter settings. */
    getState(): GraphFilterState {
        return {
            searchQuery: this.searchQuery,
            selectedTypes: this.getSelectedTypes(),
            minimumLinkWeight: this.minimumLinkWeight,
            ...(this.maximumLinkWeight === undefined ? {} : { maximumLinkWeight: this.maximumLinkWeight }),
            ...(this.attributes.length === 0 ? {} : { attributes: this.attributes.map((filter) => ({ ...filter })) }),
        };
    }

    /** Restores filter settings produced by `getState()`. */
    setState(state: GraphFilterState): void {
        this.search(state.searchQuery);
        this.setTypes(state.selectedTypes);
        this.setMinimumLinkWeight(state.minimumLinkWeight);
        this.maximumLinkWeight = state.maximumLinkWeight;
        this.setAttributeFilters(state.attributes ?? []);
    }

    clear(): void {
        this.searchQuery = "";
        this.selectedTypes.clear();
        this.minimumLinkWeight = 0;
        this.maximumLinkWeight = undefined;
        this.attributes = [];
        this.hiddenNodeIds.clear();
    }

    getVisibleData(data: GraphData): VisibleGraphData {
        const nodes = data.nodes.filter((node) => this.matchesNode(node));
        const visibleNodeIds = new Set(nodes.map((node) => node.id));

        const links = data.links.filter((link) => {
            return (
                visibleNodeIds.has(link.source) &&
                visibleNodeIds.has(link.target) &&
                (link.weight ?? 1) >= this.minimumLinkWeight
                && (this.maximumLinkWeight === undefined || (link.weight ?? 1) <= this.maximumLinkWeight)
            );
        });

        return { nodes, links };
    }

    private matchesNode(node: GraphNode): boolean {
        if (this.hiddenNodeIds.has(node.id)) return false;
        const typeMatches =
            this.selectedTypes.size === 0 ||
            (node.type !== undefined && this.selectedTypes.has(node.type));

        if (!typeMatches) {
            return false;
        }

        if (!this.attributes.every((filter) => this.matchesAttribute(node, filter))) return false;
        if (!this.searchQuery) return true;

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

    private matchesAttribute(node: GraphNode, filter: NonNullable<GraphFilterState["attributes"]>[number]): boolean {
        const value = node.data?.[filter.field];
        if (filter.operator === "exists") return value !== undefined;
        if (value === undefined || filter.value === undefined) return false;
        if (filter.operator === "contains") return String(value).toLowerCase().includes(String(filter.value).toLowerCase());
        if (filter.operator === "equals") return value === filter.value;
        if (typeof value !== "number" || typeof filter.value !== "number") return false;
        if (filter.operator === "gt") return value > filter.value;
        if (filter.operator === "gte") return value >= filter.value;
        if (filter.operator === "lt") return value < filter.value;
        return value <= filter.value;
    }
}
