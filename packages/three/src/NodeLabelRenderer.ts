import * as THREE from "three";

import type {
    GraphLabelsOptions,
    GraphNode,
} from "@orbitgraph/core";
import type { GraphNodeMap } from "./graph-types";

type LabelSprite = {
    sprite: THREE.Sprite;
    nodeId: string;
};

const DEFAULT_OPTIONS: Required<
    Pick<GraphLabelsOptions, "mode" | "maxVisible" | "showNodeType" | "fontScale">
> = {
    mode: "hover",
    maxVisible: 80,
    showNodeType: false,
    fontScale: 1,
};

/**
 * Renders hover and persistent node labels as camera-facing sprites.
 *
 * Persistent labels are created only when their visible set changes, then
 * reused while the simulation moves nodes. This keeps label modes usable for
 * normal graph views without recreating canvases on every animation frame.
 */
export class NodeLabelRenderer {
    private hoverLabel: LabelSprite | null = null;
    private selectedNodeId: string | null = null;
    private visibleNodes: GraphNode[] = [];
    private persistentLabels = new Map<string, LabelSprite>();
    private options: Required<
        Pick<
            GraphLabelsOptions,
            "mode" | "maxVisible" | "showNodeType" | "fontScale"
        >
    > &
        Pick<GraphLabelsOptions, "importantNodeIds"> = {
        ...DEFAULT_OPTIONS,
    };

    constructor(
        private readonly scene: THREE.Scene,
        private readonly nodes: GraphNodeMap,
    ) {}

    /** Updates label behaviour and refreshes the persistent label set. */
    setOptions(options: GraphLabelsOptions = {}): void {
        this.options = {
            ...DEFAULT_OPTIONS,
            ...options,
            maxVisible: Math.max(0, Math.floor(options.maxVisible ?? 80)),
            fontScale: Math.max(0.6, options.fontScale ?? 1),
        };

        this.refreshPersistentLabels();
    }

    /** Supplies the currently rendered graph subset used by label modes. */
    setVisibleNodes(nodes: GraphNode[]): void {
        this.visibleNodes = nodes;
        this.refreshPersistentLabels();
    }

    /** Updates the node that remains labelled in `selected` mode. */
    setSelectedNode(node: GraphNode | null): void {
        this.selectedNodeId = node?.id ?? null;
        this.refreshPersistentLabels();
    }

    /** Shows a temporary hover label. */
    show(node: GraphNode): void {
        if (this.hoverLabel?.nodeId === node.id) {
            return;
        }

        this.hide();
        this.hoverLabel = this.createLabel(node);
    }

    /** Hides only the temporary hover label. */
    hide(): void {
        if (!this.hoverLabel) {
            return;
        }

        this.disposeLabel(this.hoverLabel);
        this.hoverLabel = null;
    }

    /** Removes every rendered label and releases its GPU resources. */
    clear(): void {
        this.hide();

        for (const label of this.persistentLabels.values()) {
            this.disposeLabel(label);
        }

        this.persistentLabels.clear();
    }

    /** Repositions existing labels after physics or layout updates. */
    updatePosition(): void {
        if (this.hoverLabel) {
            this.updateLabelPosition(this.hoverLabel);
        }

        for (const label of this.persistentLabels.values()) {
            this.updateLabelPosition(label);
        }
    }

    private refreshPersistentLabels(): void {
        const nextNodes = this.getPersistentNodes();
        const nextNodeIds = new Set(nextNodes.map((node) => node.id));

        for (const [nodeId, label] of this.persistentLabels) {
            if (nextNodeIds.has(nodeId)) {
                continue;
            }

            this.disposeLabel(label);
            this.persistentLabels.delete(nodeId);
        }

        for (const node of nextNodes) {
            if (this.persistentLabels.has(node.id)) {
                continue;
            }

            this.persistentLabels.set(node.id, this.createLabel(node));
        }
    }

    private getPersistentNodes(): GraphNode[] {
        if (this.options.mode === "hover" || this.options.maxVisible === 0) {
            return [];
        }

        const visibleNodes = this.visibleNodes.filter((node) => this.nodes.has(node.id));

        if (this.options.mode === "selected") {
            const selectedNode = visibleNodes.find(
                (node) => node.id === this.selectedNodeId,
            );

            return selectedNode ? [selectedNode] : [];
        }

        if (this.options.mode === "all") {
            return visibleNodes.slice(0, this.options.maxVisible);
        }

        const importantNodeIds = new Set(this.options.importantNodeIds ?? []);

        return [...visibleNodes]
            .sort((left, right) => {
                const leftPriority = importantNodeIds.has(left.id) ? 1 : 0;
                const rightPriority = importantNodeIds.has(right.id) ? 1 : 0;

                if (leftPriority !== rightPriority) {
                    return rightPriority - leftPriority;
                }

                const sizeDifference = (right.size ?? 0.65) - (left.size ?? 0.65);

                if (sizeDifference !== 0) {
                    return sizeDifference;
                }

                return (left.label ?? left.id).localeCompare(right.label ?? right.id);
            })
            .slice(0, this.options.maxVisible);
    }

    private createLabel(node: GraphNode): LabelSprite {
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        if (!context) {
            throw new Error("OrbitGraph could not create a canvas context for node labels.");
        }

        const fontScale = this.options.fontScale;
        const title = node.label ?? node.id;
        const subtitle = this.options.showNodeType ? node.type : undefined;
        const titleFontSize = Math.round(24 * fontScale);
        const subtitleFontSize = Math.round(15 * fontScale);
        const horizontalPadding = Math.round(15 * fontScale);
        const verticalPadding = Math.round(10 * fontScale);

        context.font = `600 ${titleFontSize}px Inter, Arial, sans-serif`;
        const titleWidth = context.measureText(title).width;

        let subtitleWidth = 0;

        if (subtitle) {
            context.font = `500 ${subtitleFontSize}px Inter, Arial, sans-serif`;
            subtitleWidth = context.measureText(subtitle).width;
        }

        const width = Math.ceil(Math.max(titleWidth, subtitleWidth)) + horizontalPadding * 2;
        const titleHeight = Math.round(titleFontSize * 1.25);
        const subtitleHeight = subtitle ? Math.round(subtitleFontSize * 1.25) : 0;
        const height = titleHeight + subtitleHeight + verticalPadding * 2;

        canvas.width = width;
        canvas.height = height;

        context.fillStyle = "rgba(2, 6, 23, 0.9)";
        context.strokeStyle = "rgba(148, 163, 184, 0.28)";
        context.lineWidth = Math.max(1, fontScale);
        this.roundRect(context, 0.5, 0.5, width - 1, height - 1, Math.round(8 * fontScale));
        context.fill();
        context.stroke();

        context.textBaseline = "middle";
        context.font = `600 ${titleFontSize}px Inter, Arial, sans-serif`;
        context.fillStyle = "#f8fafc";
        context.fillText(title, horizontalPadding, verticalPadding + titleHeight / 2);

        if (subtitle) {
            context.font = `500 ${subtitleFontSize}px Inter, Arial, sans-serif`;
            context.fillStyle = "#94a3b8";
            context.fillText(
                subtitle,
                horizontalPadding,
                verticalPadding + titleHeight + subtitleHeight / 2,
            );
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter = THREE.LinearFilter;

        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthTest: false,
            depthWrite: false,
        });

        const sprite = new THREE.Sprite(material);
        const worldHeight = subtitle ? 3.6 * fontScale : 2.8 * fontScale;

        sprite.scale.set((width / height) * worldHeight, worldHeight, 1);

        const label = { sprite, nodeId: node.id };
        this.scene.add(sprite);
        this.updateLabelPosition(label);

        return label;
    }

    private updateLabelPosition(label: LabelSprite): void {
        const node = this.nodes.get(label.nodeId);

        if (!node) {
            return;
        }

        label.sprite.position.set(node.x, node.y, node.z);
        label.sprite.position.y += (node.size ?? 0.65) + 2.2;
    }

    private disposeLabel(label: LabelSprite): void {
        const material = label.sprite.material;

        material.map?.dispose();
        material.dispose();
        this.scene.remove(label.sprite);
    }

    private roundRect(
        context: CanvasRenderingContext2D,
        x: number,
        y: number,
        width: number,
        height: number,
        radius: number,
    ): void {
        const clampedRadius = Math.min(radius, width / 2, height / 2);

        context.beginPath();
        context.moveTo(x + clampedRadius, y);
        context.lineTo(x + width - clampedRadius, y);
        context.quadraticCurveTo(x + width, y, x + width, y + clampedRadius);
        context.lineTo(x + width, y + height - clampedRadius);
        context.quadraticCurveTo(
            x + width,
            y + height,
            x + width - clampedRadius,
            y + height,
        );
        context.lineTo(x + clampedRadius, y + height);
        context.quadraticCurveTo(x, y + height, x, y + height - clampedRadius);
        context.lineTo(x, y + clampedRadius);
        context.quadraticCurveTo(x, y, x + clampedRadius, y);
        context.closePath();
    }
}
