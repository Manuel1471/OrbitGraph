import type { GraphDataSource, GraphStyleRule, OrbitGraphPlugin } from "@orbitgraph/core";
/** Runtime registry for app-installed OrbitGraph plugins. */
export class GraphPluginRegistry {
    private plugins = new Map<string, () => void>(); private sources = new Map<string, GraphDataSource>(); private rules: GraphStyleRule[] = [];
    use(plugin: OrbitGraphPlugin): void { if (this.plugins.has(plugin.name)) return; const dispose = plugin.setup?.({ addStyleRule: (rule) => this.rules.push(rule), addDataSource: (name, source) => this.sources.set(name, source) }); this.plugins.set(plugin.name, dispose ?? (() => {})); }
    /** Loads an ESM plugin dynamically. The host controls URL allowlists and CSP. */
    async install(entry: string): Promise<OrbitGraphPlugin> { const module = await import(/* @vite-ignore */ entry) as { default?: OrbitGraphPlugin; plugin?: OrbitGraphPlugin }; const plugin = module.default ?? module.plugin; if (!plugin) throw new Error(`Plugin module "${entry}" does not export a plugin.`); this.use(plugin); return plugin; }
    uninstall(name: string): void { this.plugins.get(name)?.(); this.plugins.delete(name); }
    list(): string[] { return [...this.plugins.keys()]; }
    getStyleRules(): GraphStyleRule[] { return [...this.rules]; }
    getDataSource(name: string): GraphDataSource | undefined { return this.sources.get(name); }
}
