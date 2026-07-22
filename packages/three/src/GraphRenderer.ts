import * as THREE from "three";

import type { GraphLink } from "@orbitgraph/core";

import type { PhysicsNode } from "./PhysicsEngine";
import type {
    GraphLinkArrowMap,
    GraphLinkLineMap,
    GraphNodeMap,
    GraphNodeMeshMap,
    LinkArrow,
} from "./graph-types";

const MAX_NODES_WITH_DETAILED_LINKS = 1_000;

type StoredLink = GraphLink & {
    id: string;
};

export class GraphRenderer {
    private readonly nodeGeometry = new THREE.SphereGeometry(1, 8, 8);
    private readonly arrowGeometry = new THREE.ConeGeometry(0.45, 1.25, 6);

    private readonly nodeMaterials = new Map<string, THREE.MeshBasicMaterial>();
    private readonly arrowMaterials = new Map<string, THREE.MeshBasicMaterial>();

    private readonly storedLinks = new Map<string, StoredLink>();

    private readonly sourcePosition = new THREE.Vector3();
    private readonly targetPosition = new THREE.Vector3();
    private readonly direction = new THREE.Vector3();
    private readonly arrowUp = new THREE.Vector3(0, 1, 0);
    private readonly linkColor = new THREE.Color();

    private readonly batchedLinkGeometry: THREE.BufferGeometry;
    private readonly batchedLinkMaterial: THREE.LineBasicMaterial;
    private readonly batchedLinks: THREE.LineSegments;

    /*
     * A single reusable visual indicator for keyboard focus.
     * It does not create a new Three.js object for every focused node.
     */
    private readonly keyboardFocusGeometry = new THREE.SphereGeometry(
        1.35,
        12,
        12,
    );

    private readonly keyboardFocusMaterial = new THREE.MeshBasicMaterial({
        color: "#f8fafc",
        transparent: true,
        opacity: 0.9,
        wireframe: true,
        depthTest: false,
    });

    private readonly keyboardFocusMesh = new THREE.Mesh(
        this.keyboardFocusGeometry,
        this.keyboardFocusMaterial,
    );

    private keyboardFocusedNodeId: string | null = null;

    private visibleNodeIds = new Set<string>();
    private minimumLinkWeight = 0;
    private batchedVisibleLinks: StoredLink[] = [];
    private batchNeedsRebuild = true;

    private useBatchedLinks = false;
    private showLinkArrows = true;

    constructor(
        private readonly group: THREE.Group,
        private readonly nodeMeshes: GraphNodeMeshMap,
        private readonly linkLines: GraphLinkLineMap,
        private readonly linkArrows: GraphLinkArrowMap,
        private readonly nodes: GraphNodeMap,
        private readonly options: {
            nodeColor: string;
            linkColor: string;
            linkOpacity: number;
            nodeSize: number;
        },
    ) {
        this.batchedLinkGeometry = new THREE.BufferGeometry();

        this.batchedLinkMaterial = new THREE.LineBasicMaterial({
            transparent: true,
            opacity: options.linkOpacity,
            vertexColors: true,
        });

        this.batchedLinks = new THREE.LineSegments(
            this.batchedLinkGeometry,
            this.batchedLinkMaterial,
        );

        /*
         * No raycast is performed against the large batched-link object.
         * Nodes remain interactive while detailed links are disabled.
         */
        this.batchedLinks.raycast = () => {};

        this.batchedLinks.frustumCulled = false;
        this.batchedLinks.visible = false;

        this.keyboardFocusMesh.visible = false;
        this.keyboardFocusMesh.renderOrder = 2;

        /*
         * The focus indicator is visual only and must never intercept clicks.
         */
        this.keyboardFocusMesh.raycast = () => {};

        this.group.add(this.batchedLinks);
        this.group.add(this.keyboardFocusMesh);
    }

    addNode(node: PhysicsNode): void {
        this.nodes.set(node.id, node);

        const mesh = new THREE.Mesh(
            this.nodeGeometry,
            this.getNodeMaterial(node.color ?? this.options.nodeColor),
        );

        mesh.position.set(node.x, node.y, node.z);
        mesh.scale.setScalar(node.size ?? this.options.nodeSize);
        mesh.userData.graphNode = node;

        this.nodeMeshes.set(node.id, mesh);
        this.group.add(mesh);

        if (
            !this.useBatchedLinks &&
            this.nodes.size > MAX_NODES_WITH_DETAILED_LINKS
        ) {
            this.enableBatchedLinks();
        }

        this.syncKeyboardFocus();
    }

    updateNode(node: PhysicsNode): void {
        const mesh = this.nodeMeshes.get(node.id);

        if (!mesh) {
            this.addNode(node);
            return;
        }

        mesh.position.set(node.x, node.y, node.z);
        mesh.scale.setScalar(node.size ?? this.options.nodeSize);

        mesh.material = this.getNodeMaterial(
            node.color ?? this.options.nodeColor,
        );
    }

    removeNode(nodeId: string): void {
        const mesh = this.nodeMeshes.get(nodeId);

        if (mesh) {
            this.group.remove(mesh);
        }

        this.nodeMeshes.delete(nodeId);
        this.nodes.delete(nodeId);

        if (this.useBatchedLinks) {
            this.batchNeedsRebuild = true;
        }

        this.syncKeyboardFocus();
    }

    addLink(link: GraphLink): void {
        const source = this.nodes.get(link.source);
        const target = this.nodes.get(link.target);

        if (!source || !target) {
            return;
        }

        const id =
            link.id ??
            `${link.source}__${link.type ?? "related"}__${link.target}`;

        const graphLink: StoredLink = { ...link, id };

        this.storedLinks.set(id, graphLink);

        if (this.useBatchedLinks) {
            this.batchNeedsRebuild = true;
            return;
        }

        this.addDetailedLink(graphLink);
    }

    removeLink(linkId: string): void {
        this.storedLinks.delete(linkId);

        if (this.useBatchedLinks) {
            this.batchNeedsRebuild = true;
            return;
        }

        this.removeDetailedLinkVisual(linkId);
    }

    syncPositions(): void {
        for (const node of this.nodes.values()) {
            this.updateNode(node);
        }

        if (this.useBatchedLinks) {
            if (this.batchNeedsRebuild) {
                this.rebuildBatchedLinks();
            } else {
                this.syncBatchedLinkPositions();
            }

            this.syncKeyboardFocus();
            return;
        }

        for (const [id, line] of this.linkLines) {
            const link = line.userData.graphLink as StoredLink;
            const source = this.nodes.get(link.source);
            const target = this.nodes.get(link.target);

            if (!source || !target) {
                continue;
            }

            const positions = line.geometry.getAttribute(
                "position",
            ) as THREE.BufferAttribute;

            positions.setXYZ(0, source.x, source.y, source.z);
            positions.setXYZ(1, target.x, target.y, target.z);
            positions.needsUpdate = true;

            const arrow = this.linkArrows.get(id);

            if (arrow?.visible && this.showLinkArrows) {
                this.positionArrow(arrow, source, target);
            }
        }

        this.syncKeyboardFocus();
    }

    setVisibleNodeIds(nodeIds: Set<string>, minimumWeight: number): void {
        this.visibleNodeIds = new Set(nodeIds);
        this.minimumLinkWeight = minimumWeight;

        for (const [nodeId, mesh] of this.nodeMeshes) {
            mesh.visible = nodeIds.has(nodeId);
        }

        this.syncKeyboardFocus();

        if (this.useBatchedLinks) {
            this.batchNeedsRebuild = true;
            this.rebuildBatchedLinks();
            return;
        }

        this.showLinkArrows =
            nodeIds.size <= MAX_NODES_WITH_DETAILED_LINKS;

        for (const [id, line] of this.linkLines) {
            const link = line.userData.graphLink as StoredLink;
            const visible = this.isLinkVisible(link);

            line.visible = visible;

            const arrow = this.linkArrows.get(id);

            if (arrow) {
                arrow.visible = visible && this.showLinkArrows;
            }
        }
    }

    /**
     * Displays a visual focus ring around a node selected through the keyboard.
     */
    setKeyboardFocus(nodeId: string | null): void {
        this.keyboardFocusedNodeId = nodeId;
        this.syncKeyboardFocus();
    }

    clear(): void {
        for (const nodeId of [...this.nodeMeshes.keys()]) {
            this.removeNode(nodeId);
        }

        this.removeAllDetailedLinkVisuals();

        this.storedLinks.clear();
        this.batchedVisibleLinks = [];
        this.batchedLinkGeometry.setDrawRange(0, 0);
        this.batchedLinks.visible = false;

        /*
         * Keep the focused id. If that node remains in the next active view,
         * syncPositions() restores its indicator automatically.
         */
        this.keyboardFocusMesh.visible = false;

        this.useBatchedLinks = false;
        this.showLinkArrows = true;
        this.batchNeedsRebuild = true;
    }

    private syncKeyboardFocus(): void {
        if (!this.keyboardFocusedNodeId) {
            this.keyboardFocusMesh.visible = false;
            return;
        }

        const node = this.nodes.get(this.keyboardFocusedNodeId);
        const nodeMesh = this.nodeMeshes.get(this.keyboardFocusedNodeId);

        if (!node || !nodeMesh || !nodeMesh.visible) {
            this.keyboardFocusMesh.visible = false;
            return;
        }

        const nodeSize = node.size ?? this.options.nodeSize;

        this.keyboardFocusMesh.position.copy(nodeMesh.position);
        this.keyboardFocusMesh.scale.setScalar(nodeSize);
        this.keyboardFocusMesh.visible = true;
    }

    private enableBatchedLinks(): void {
        this.useBatchedLinks = true;
        this.showLinkArrows = false;

        this.removeAllDetailedLinkVisuals();

        this.batchNeedsRebuild = true;
    }

    private addDetailedLink(link: StoredLink): void {
        const source = this.nodes.get(link.source);
        const target = this.nodes.get(link.target);

        if (!source || !target) {
            return;
        }

        const color = this.getLinkColor(link);

        const line = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(source.x, source.y, source.z),
                new THREE.Vector3(target.x, target.y, target.z),
            ]),
            new THREE.LineBasicMaterial({
                color,
                transparent: true,
                opacity: this.getLinkOpacity(link),
            }),
        );

        line.frustumCulled = false;
        line.userData.graphLink = link;

        const arrow = new THREE.Mesh(
            this.arrowGeometry,
            this.getArrowMaterial(color),
        );

        arrow.userData.graphLink = link;

        if (this.showLinkArrows) {
            this.positionArrow(arrow, source, target);
        }

        this.linkLines.set(link.id, line);
        this.linkArrows.set(link.id, arrow);

        this.group.add(line);
        this.group.add(arrow);
    }

    private removeDetailedLinkVisual(linkId: string): void {
        const line = this.linkLines.get(linkId);
        const arrow = this.linkArrows.get(linkId);

        if (line) {
            line.geometry.dispose();
            (line.material as THREE.Material).dispose();
            this.group.remove(line);
        }

        if (arrow) {
            this.group.remove(arrow);
        }

        this.linkLines.delete(linkId);
        this.linkArrows.delete(linkId);
    }

    private removeAllDetailedLinkVisuals(): void {
        for (const linkId of [...this.linkLines.keys()]) {
            this.removeDetailedLinkVisual(linkId);
        }
    }

    private rebuildBatchedLinks(): void {
        if (!this.useBatchedLinks) {
            return;
        }

        this.batchedVisibleLinks = [...this.storedLinks.values()].filter(
            (link) => this.isLinkVisible(link),
        );

        const vertexCount = this.batchedVisibleLinks.length * 2;
        const floatCount = Math.max(vertexCount * 3, 3);

        const currentPositions =
            this.batchedLinkGeometry.getAttribute("position");

        const currentColors =
            this.batchedLinkGeometry.getAttribute("color");

        if (
            !currentPositions ||
            currentPositions.array.length !== floatCount
        ) {
            this.batchedLinkGeometry.setAttribute(
                "position",
                new THREE.Float32BufferAttribute(floatCount, 3),
            );
        }

        if (!currentColors || currentColors.array.length !== floatCount) {
            this.batchedLinkGeometry.setAttribute(
                "color",
                new THREE.Float32BufferAttribute(floatCount, 3),
            );
        }

        this.syncBatchedLinkPositions();
        this.syncBatchedLinkColors();

        this.batchedLinkGeometry.setDrawRange(0, vertexCount);
        this.batchedLinks.visible = vertexCount > 0;
        this.batchNeedsRebuild = false;
    }

    private syncBatchedLinkPositions(): void {
        const positions = this.batchedLinkGeometry.getAttribute(
            "position",
        ) as THREE.BufferAttribute;

        for (
            let index = 0;
            index < this.batchedVisibleLinks.length;
            index += 1
        ) {
            const link = this.batchedVisibleLinks[index];
            const source = this.nodes.get(link.source);
            const target = this.nodes.get(link.target);

            if (!source || !target) {
                continue;
            }

            const vertexIndex = index * 2;

            positions.setXYZ(vertexIndex, source.x, source.y, source.z);
            positions.setXYZ(
                vertexIndex + 1,
                target.x,
                target.y,
                target.z,
            );
        }

        positions.needsUpdate = true;
    }

    private syncBatchedLinkColors(): void {
        const colors = this.batchedLinkGeometry.getAttribute(
            "color",
        ) as THREE.BufferAttribute;

        for (
            let index = 0;
            index < this.batchedVisibleLinks.length;
            index += 1
        ) {
            const link = this.batchedVisibleLinks[index];
            const vertexIndex = index * 2;
            const intensity = 0.35 + (link.weight ?? 0.6) * 0.65;

            this.linkColor
                .set(this.getLinkColor(link))
                .multiplyScalar(intensity);

            colors.setXYZ(
                vertexIndex,
                this.linkColor.r,
                this.linkColor.g,
                this.linkColor.b,
            );

            colors.setXYZ(
                vertexIndex + 1,
                this.linkColor.r,
                this.linkColor.g,
                this.linkColor.b,
            );
        }

        colors.needsUpdate = true;
    }

    private isLinkVisible(link: StoredLink): boolean {
        return (
            this.visibleNodeIds.has(link.source) &&
            this.visibleNodeIds.has(link.target) &&
            (link.weight ?? 1) >= this.minimumLinkWeight
        );
    }

    private positionArrow(
        arrow: LinkArrow,
        source: PhysicsNode,
        target: PhysicsNode,
    ): void {
        this.sourcePosition.set(source.x, source.y, source.z);
        this.targetPosition.set(target.x, target.y, target.z);

        this.direction
            .subVectors(this.targetPosition, this.sourcePosition)
            .normalize();

        arrow.position.lerpVectors(
            this.sourcePosition,
            this.targetPosition,
            0.84,
        );

        arrow.quaternion.setFromUnitVectors(this.arrowUp, this.direction);
    }

    private getNodeMaterial(color: string): THREE.MeshBasicMaterial {
        const existingMaterial = this.nodeMaterials.get(color);

        if (existingMaterial) {
            return existingMaterial;
        }

        const material = new THREE.MeshBasicMaterial({ color });

        this.nodeMaterials.set(color, material);

        return material;
    }

    private getArrowMaterial(color: string): THREE.MeshBasicMaterial {
        const existingMaterial = this.arrowMaterials.get(color);

        if (existingMaterial) {
            return existingMaterial;
        }

        const material = new THREE.MeshBasicMaterial({ color });

        this.arrowMaterials.set(color, material);

        return material;
    }

    private getLinkOpacity(link: GraphLink): number {
        const weight = THREE.MathUtils.clamp(link.weight ?? 0.6, 0, 1);

        return this.options.linkOpacity * (0.35 + weight * 0.65);
    }

    private getLinkColor(link: GraphLink): string {
        if (link.color) {
            return link.color;
        }

        const colors: Record<string, string> = {
            owns: "#facc15",
            uses: "#38bdf8",
            emits: "#fb7185",
            "stores-data-in": "#f472b6",
            "runs-on": "#34d399",
        };

        return colors[link.type ?? ""] ?? this.options.linkColor;
    }
}