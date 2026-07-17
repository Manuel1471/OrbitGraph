import * as THREE from "three";

import type { GraphNode } from "@orbitgraph/core"
import type {
    GraphNodeMap,
    GraphNodeMeshMap,
} from "./graph-types";

export class NodeLabelRenderer {
    private sprite: THREE.Sprite | null = null;
    private nodeId: string | null = null;

    constructor(
        private readonly scene: THREE.Scene,
        private readonly nodes: GraphNodeMap,
        private readonly nodeMeshes: GraphNodeMeshMap,
    ) {}

    show(node: GraphNode): void {
        const mesh = this.nodeMeshes.get(node.id);

        if (!mesh || this.nodeId === node.id) {
            return;
        }

        this.hide();

        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        if (!context) {
            return;
        }

        const text = node.label ?? node.id;

        context.font = "600 28px Arial";

        const width = Math.ceil(context.measureText(text).width) + 44;

        canvas.width = width;
        canvas.height = 54;

        context.font = "600 28px Arial";
        context.fillStyle = "rgba(2, 6, 23, 0.92)";
        context.fillRect(0, 0, width, 54);

        context.fillStyle = "#f8fafc";
        context.textBaseline = "middle";
        context.fillText(text, 22, 27);

        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;

        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthTest: false,
        });

        this.sprite = new THREE.Sprite(material);
        this.sprite.scale.set(width / 18, 3, 1);

        this.nodeId = node.id;

        this.scene.add(this.sprite);
        this.updatePosition();
    }

    hide(): void {
        if (!this.sprite) {
            return;
        }

        this.sprite.material.map?.dispose();
        this.sprite.material.dispose();

        this.scene.remove(this.sprite);

        this.sprite = null;
        this.nodeId = null;
    }

    updatePosition(): void {
        if (!this.sprite || !this.nodeId) {
            return;
        }

        const node = this.nodes.get(this.nodeId);
        const mesh = this.nodeMeshes.get(this.nodeId);

        if (!node || !mesh) {
            this.hide();
            return;
        }

        this.sprite.position.copy(mesh.position);
        this.sprite.position.y += (node.size ?? 0.65) + 2.2;
    }
}