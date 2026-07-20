import type {
    GraphData,
    GraphDirection,
    GraphExpansionOptions,
    GraphExplorationHistoryState,
    GraphExplorerState,
    GraphInitialView,
    GraphLink,
    GraphNode,
    GraphNodeExplorationState,
    GraphPathOptions,
} from "@orbitgraph/core";

type PathFocus = {
    nodeIds: Set<string>;
    linkIds: Set<string>;
};

type ExplorationSnapshot = GraphExplorerState;

/**
 * Holds the complete source graph and computes the smaller subset that is
 * mounted in the renderer and physics simulation.
 */
export class GraphExplorer {
    private data: GraphData = { nodes: [], links: [] };
    private initialView: GraphInitialView;
    private activeView: GraphInitialView;

    /** One node can contain several pages of an expansion. */
    private readonly expansions = new Map<string, GraphExpansionOptions[]>();
    private pathFocus: PathFocus | null = null;

    private history: ExplorationSnapshot[] = [];
    private historyIndex = -1;

    constructor(initialView: GraphInitialView = { mode: "all" }) {
        this.initialView = this.cloneView(initialView);
        this.activeView = this.cloneView(initialView);
        this.resetHistory();
    }

    setData(data: GraphData): void {
        this.data = data;
        this.activeView = this.cloneView(this.initialView);
        this.expansions.clear();
        this.pathFocus = null;
        this.resetHistory();
    }

    updateData(data: GraphData): void {
        this.data = data;
    }

    setInitialView(view: GraphInitialView): void {
        this.initialView = this.cloneView(view);
        this.activeView = this.cloneView(view);
        this.expansions.clear();
        this.pathFocus = null;
        this.resetHistory();
    }

    /** Restores the configured initial view and removes transient exploration. */
    reset(): void {
        this.activeView = this.cloneView(this.initialView);
        this.expansions.clear();
        this.pathFocus = null;
        this.commit();
    }

    showAll(): void {
        this.activeView = { mode: "all" };
        this.expansions.clear();
        this.pathFocus = null;
        this.commit();
    }

    /**
     * Reveals a neighborhood. `limit` and `offset` page only direct neighbors
     * of `nodeId`; extra depth is calculated from the selected page.
     */
    expandNode(nodeId: string, options: GraphExpansionOptions = {}): void {
        if (!this.getNode(nodeId)) {
            return;
        }

        this.pathFocus = null;

        const expansion: GraphExpansionOptions = {
            depth: 1,
            direction: "both",
            ...options,
            relationshipTypes: options.relationshipTypes?.slice(),
        };

        const pages = this.expansions.get(nodeId) ?? [];
        const pageIndex = pages.findIndex((page) =>
            this.isSamePage(page, expansion),
        );

        if (pageIndex === -1) {
            pages.push(expansion);
        } else {
            pages[pageIndex] = expansion;
        }

        this.expansions.set(nodeId, pages);
        this.commit();
    }

    collapseNode(nodeId: string): void {
        if (this.expansions.delete(nodeId)) {
            this.commit();
        }
    }

    /** Shows only the shortest route between two nodes. */
    focusPath(
        sourceId: string,
        targetId: string,
        options: GraphPathOptions = {},
    ): boolean {
        const path = this.findShortestPath(
            sourceId,
            targetId,
            options.direction ?? "both",
        );

        if (!path) {
            return false;
        }

        this.pathFocus = path;
        this.expansions.clear();
        this.commit();

        return true;
    }

    goBack(): boolean {
        if (this.historyIndex <= 0) {
            return false;
        }

        this.historyIndex -= 1;
        this.restore(this.history[this.historyIndex]);
        return true;
    }

    goForward(): boolean {
        if (this.historyIndex >= this.history.length - 1) {
            return false;
        }

        this.historyIndex += 1;
        this.restore(this.history[this.historyIndex]);
        return true;
    }

    getHistoryState(): GraphExplorationHistoryState {
        return {
            canGoBack: this.historyIndex > 0,
            canGoForward: this.historyIndex < this.history.length - 1,
            index: this.historyIndex,
            length: this.history.length,
        };
    }

    /** Returns a JSON-serializable snapshot of the current exploration. */
    getState(): GraphExplorerState {
        return this.snapshot();
    }

    /**
     * Restores a snapshot produced by `getState()`.
     *
     * Undo and redo history are intentionally reset because the snapshot
     * represents a new exploration session.
     */
    setState(state: GraphExplorerState): void {
        this.restore(state);
        this.resetHistory();
    }

    getNodeExplorationState(nodeId: string): GraphNodeExplorationState {
        const node = this.getNode(nodeId);

        if (!node) {
            return {
                nodeId,
                expanded: false,
                visibleNeighbors: 0,
                hiddenNeighbors: 0,
                canExpand: false,
            };
        }

        const visibleIds = new Set(
            this.getVisibleData().nodes.map((item) => item.id),
        );
        const neighborIds = new Set(
            this.getNodeLinks(nodeId)
                .map((link) => this.getOtherNodeId(nodeId, link))
                .filter((id): id is string => id !== null),
        );

        let visibleNeighbors = 0;

        for (const neighborId of neighborIds) {
            if (visibleIds.has(neighborId)) {
                visibleNeighbors += 1;
            }
        }

        return {
            nodeId,
            expanded: this.expansions.has(nodeId),
            visibleNeighbors,
            hiddenNeighbors: neighborIds.size - visibleNeighbors,
            canExpand: neighborIds.size > visibleNeighbors,
        };
    }

    getVisibleData(): GraphData {
        if (this.pathFocus) {
            return {
                nodes: this.data.nodes.filter((node) =>
                    this.pathFocus!.nodeIds.has(node.id),
                ),
                links: this.data.links.filter((link) =>
                    this.pathFocus!.linkIds.has(this.getLinkId(link)),
                ),
            };
        }

        const visibleNodeIds = this.getInitialNodeIds();

        for (const [nodeId, pages] of this.expansions) {
            for (const options of pages) {
                this.addNeighborhood(visibleNodeIds, nodeId, options);
            }
        }

        return {
            nodes: this.data.nodes.filter((node) => visibleNodeIds.has(node.id)),
            links: this.data.links.filter(
                (link) =>
                    visibleNodeIds.has(link.source) &&
                    visibleNodeIds.has(link.target),
            ),
        };
    }

    private getInitialNodeIds(): Set<string> {
        const visibleNodeIds = new Set<string>();

        switch (this.activeView.mode) {
            case "all":
                for (const node of this.data.nodes) {
                    visibleNodeIds.add(node.id);
                }
                break;
            case "node":
                if (this.getNode(this.activeView.nodeId)) {
                    visibleNodeIds.add(this.activeView.nodeId);
                }
                break;
            case "neighborhood":
                this.addNeighborhood(visibleNodeIds, this.activeView.nodeId, {
                    depth: this.activeView.depth ?? 1,
                    direction: this.activeView.direction ?? "both",
                    relationshipTypes: this.activeView.relationshipTypes,
                });
                break;
            case "type": {
                const maxNodes =
                    this.activeView.maxNodes ?? Number.POSITIVE_INFINITY;

                for (const node of this.data.nodes) {
                    if (node.type === this.activeView.nodeType) {
                        visibleNodeIds.add(node.id);

                        if (visibleNodeIds.size >= maxNodes) {
                            break;
                        }
                    }
                }
                break;
            }
        }

        return visibleNodeIds;
    }

    private addNeighborhood(
        visibleNodeIds: Set<string>,
        nodeId: string,
        options: GraphExpansionOptions,
    ): void {
        if (!this.getNode(nodeId)) {
            return;
        }

        const depth = Math.max(0, options.depth ?? 1);
        const direction = options.direction ?? "both";
        const visibleTypes = options.relationshipTypes
            ? new Set(options.relationshipTypes)
            : null;

        visibleNodeIds.add(nodeId);

        const directNeighbors = this.getNeighborEdges(
            nodeId,
            direction,
            visibleTypes,
        );
        const offset = Math.max(0, options.offset ?? 0);
        const page = directNeighbors.slice(
            offset,
            options.limit === undefined
                ? undefined
                : offset + Math.max(0, options.limit),
        );

        let frontier = new Set<string>();

        for (const { neighborId } of page) {
            visibleNodeIds.add(neighborId);
            frontier.add(neighborId);
        }

        for (let level = 1; level < depth && frontier.size > 0; level += 1) {
            const nextFrontier = new Set<string>();

            for (const currentNodeId of frontier) {
                for (const { neighborId } of this.getNeighborEdges(
                    currentNodeId,
                    direction,
                    visibleTypes,
                )) {
                    if (visibleNodeIds.has(neighborId)) {
                        continue;
                    }

                    visibleNodeIds.add(neighborId);
                    nextFrontier.add(neighborId);
                }
            }

            frontier = nextFrontier;
        }
    }

    private findShortestPath(
        sourceId: string,
        targetId: string,
        direction: GraphDirection,
    ): PathFocus | null {
        if (!this.getNode(sourceId) || !this.getNode(targetId)) {
            return null;
        }

        if (sourceId === targetId) {
            return { nodeIds: new Set([sourceId]), linkIds: new Set() };
        }

        const queue = [sourceId];
        const previous = new Map<string, { nodeId: string; linkId: string }>();
        const visited = new Set([sourceId]);

        while (queue.length > 0) {
            const current = queue.shift()!;

            for (const { neighborId, link } of this.getNeighborEdges(
                current,
                direction,
            )) {
                if (visited.has(neighborId)) {
                    continue;
                }

                visited.add(neighborId);
                previous.set(neighborId, {
                    nodeId: current,
                    linkId: this.getLinkId(link),
                });

                if (neighborId === targetId) {
                    const nodeIds = new Set<string>([targetId]);
                    const linkIds = new Set<string>();
                    let cursor = targetId;

                    while (cursor !== sourceId) {
                        const step = previous.get(cursor)!;
                        nodeIds.add(step.nodeId);
                        linkIds.add(step.linkId);
                        cursor = step.nodeId;
                    }

                    return { nodeIds, linkIds };
                }

                queue.push(neighborId);
            }
        }

        return null;
    }

    private getNeighborEdges(
        nodeId: string,
        direction: GraphDirection,
        relationshipTypes: Set<string> | null = null,
    ): Array<{ neighborId: string; link: GraphLink }> {
        return this.getNodeLinks(nodeId)
            .filter(
                (link) =>
                    !relationshipTypes ||
                    Boolean(link.type && relationshipTypes.has(link.type)),
            )
            .map((link) => ({
                neighborId: this.getNeighborId(nodeId, link, direction),
                link,
            }))
            .filter(
                (item): item is { neighborId: string; link: GraphLink } =>
                    item.neighborId !== null,
            )
            .sort((a, b) =>
                this.getLinkId(a.link).localeCompare(this.getLinkId(b.link)),
            );
    }

    private getNeighborId(
        nodeId: string,
        link: GraphLink,
        direction: GraphDirection,
    ): string | null {
        if (direction === "outgoing") {
            return link.source === nodeId ? link.target : null;
        }

        if (direction === "incoming") {
            return link.target === nodeId ? link.source : null;
        }

        return this.getOtherNodeId(nodeId, link);
    }

    private getOtherNodeId(nodeId: string, link: GraphLink): string | null {
        if (link.source === nodeId) {
            return link.target;
        }

        if (link.target === nodeId) {
            return link.source;
        }

        return null;
    }

    private getLinkId(link: GraphLink): string {
        return (
            link.id ??
            `${link.source}__${link.type ?? "related"}__${link.target}`
        );
    }

    private getNode(nodeId: string): GraphNode | undefined {
        return this.data.nodes.find((node) => node.id === nodeId);
    }

    private getNodeLinks(nodeId: string): GraphLink[] {
        return this.data.links.filter(
            (link) => link.source === nodeId || link.target === nodeId,
        );
    }

    private isSamePage(
        a: GraphExpansionOptions,
        b: GraphExpansionOptions,
    ): boolean {
        return (
            (a.offset ?? 0) === (b.offset ?? 0) &&
            (a.direction ?? "both") === (b.direction ?? "both") &&
            (a.depth ?? 1) === (b.depth ?? 1) &&
            (a.relationshipTypes ?? []).join("\u0000") ===
            (b.relationshipTypes ?? []).join("\u0000")
        );
    }

    private resetHistory(): void {
        this.history = [this.snapshot()];
        this.historyIndex = 0;
    }

    private commit(): void {
        const next = this.snapshot();
        const current = this.history[this.historyIndex];

        if (current && JSON.stringify(current) === JSON.stringify(next)) {
            return;
        }

        this.history.splice(this.historyIndex + 1);
        this.history.push(next);
        this.historyIndex = this.history.length - 1;
    }

    private snapshot(): ExplorationSnapshot {
        return {
            initialView: this.cloneView(this.initialView),
            activeView: this.cloneView(this.activeView),
            expansions: [...this.expansions].map(([nodeId, pages]) => ({
                nodeId,
                pages: pages.map((page) => this.cloneExpansion(page)),
            })),
            path: this.pathFocus
                ? {
                    nodeIds: [...this.pathFocus.nodeIds],
                    linkIds: [...this.pathFocus.linkIds],
                }
                : null,
        };
    }

    private restore(state: GraphExplorerState): void {
        this.initialView = this.cloneView(state.initialView);
        this.activeView = this.cloneView(state.activeView);
        this.expansions.clear();

        for (const expansion of state.expansions) {
            this.expansions.set(
                expansion.nodeId,
                expansion.pages.map((page) => this.cloneExpansion(page)),
            );
        }

        this.pathFocus = state.path
            ? {
                nodeIds: new Set(state.path.nodeIds),
                linkIds: new Set(state.path.linkIds),
            }
            : null;
    }

    private cloneView(view: GraphInitialView): GraphInitialView {
        if (view.mode !== "neighborhood") {
            return { ...view };
        }

        return {
            ...view,
            relationshipTypes: view.relationshipTypes?.slice(),
        };
    }

    private cloneExpansion(
        options: GraphExpansionOptions,
    ): GraphExpansionOptions {
        return {
            ...options,
            relationshipTypes: options.relationshipTypes?.slice(),
        };
    }
}