import { GraphRenderer } from "./GraphRenderer";
import type {
    GraphNodePresentationStyle,
    GraphNodePresentationStyles,
} from "./GraphRenderer";

export type {
    GraphNodePresentationStyle,
    GraphNodePresentationStyles,
};

/**
 * Controls temporary visual emphasis independently from graph data and
 * analytics. Applications can use it for metric overlays, search results,
 * or domain-specific highlights without changing GraphNode records.
 */
export class GraphPresentationController {
    constructor(private readonly renderer: GraphRenderer) {}

    /**
     * Replaces the active node style overlay.
     *
     * Styles only affect currently rendered nodes. They are retained while the
     * view refreshes so an expanded or filtered view keeps its visualization.
     */
    setNodeStyles(styles: GraphNodePresentationStyles): void {
        this.renderer.setNodePresentationStyles(styles);
    }

    /** Restores every node to its source color and configured base size. */
    clearNodeStyles(): void {
        this.renderer.clearNodePresentationStyles();
    }

}