import type { GraphDataSource, GraphStyleRule, OrbitGraphPlugin } from "@orbitgraph/core";
/** Runtime registry for app-installed OrbitGraph plugins. */
export class GraphPluginRegistry {
    private plugins = new Set<string>(); private sources = new Map<string, GraphDataSource>(); private rules: GraphStyleRule[] = [];
    use(plugin: OrbitGraphPlugin): void { if (this.plugins.has(plugin.name)) return; this.plugins.add(plugin.name); plugin.setup?.({ addStyleRule: (rule) => this.rules.push(rule), addDataSource: (name, source) => this.sources.set(name, source) }); }
    getStyleRules(): GraphStyleRule[] { return [...this.rules]; }
    getDataSource(name: string): GraphDataSource | undefined { return this.sources.get(name); }
}
