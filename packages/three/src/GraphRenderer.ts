import * as THREE from "three";

import type { GraphLink, GraphNode } from "@orbitgraph/core";

import type { PhysicsNode } from "./PhysicsEngine";
import type {
    GraphLinkArrowMap,
    GraphLinkLineMap,
    GraphNodeMap,
    GraphNodeMeshMap,
    LinkArrow,
} from "./graph-types";

const MAX_NODES_WITH_DETAILED_LINKS = 1_000;
const MAX_PRESENTATION_GLOWS = 250;
const MAX_INSTANCED_NODES = 200_000;

/**
 * A transient visual override. It never mutates the source GraphNode data.
 * `scale` is a multiplier of the node's configured size and `glow` is clamped
 * between 0 and 1.
 */
export type GraphNodePresentationStyle = {
    color?: string;
    scale?: number;
    glow?: number;
};

export type GraphNodePresentationStyles = Record<
    string,
    GraphNodePresentationStyle
>;

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
    private readonly cullingFrustum = new THREE.Frustum();
    private readonly cullingMatrix = new THREE.Matrix4();
    private readonly cullingSphere = new THREE.Sphere();
    private readonly cullingPosition = new THREE.Vector3();
    private readonly nodeInstanceMaterial = new THREE.MeshBasicMaterial({ vertexColors: true });
    private readonly nodeInstances = new THREE.InstancedMesh(this.nodeGeometry, this.nodeInstanceMaterial, MAX_INSTANCED_NODES);
    private readonly nodeInstanceMatrix = new THREE.Matrix4();
    private readonly nodeInstanceScale = new THREE.Vector3();
    private readonly nodeInstanceColor = new THREE.Color();
    private readonly nodeInstanceQuaternion = new THREE.Quaternion();
    private readonly nodeInstanceById = new Map<string, number>();
    private readonly nodeIdByInstance: string[] = [];

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

    /*
     * Instancing keeps analytic halos inexpensive. At most 250 of the most
     * emphatic visible nodes are drawn, even if a style map covers thousands.
     */
    private readonly presentationGlowGeometry = new THREE.SphereGeometry(
        1.25,
        12,
        12,
    );

    private readonly presentationGlowMaterial = new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0.22,
        vertexColors: true,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
    });

    private readonly presentationGlows = new THREE.InstancedMesh(
        this.presentationGlowGeometry,
        this.presentationGlowMaterial,
        MAX_PRESENTATION_GLOWS,
    );

    private readonly presentationGlowMatrix = new THREE.Matrix4();
    private readonly presentationGlowScale = new THREE.Vector3();
    private readonly presentationGlowColor = new THREE.Color();
    private readonly presentationStyles = new Map<
        string,
        GraphNodePresentationStyle
    >();

    private keyboardFocusedNodeId: string | null = null;

    private visibleNodeIds = new Set<string>();
    private readonly frustumVisibleNodeIds = new Set<string>();
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

        this.presentationGlows.count = 0;
        this.presentationGlows.frustumCulled = false;
        this.presentationGlows.renderOrder = 1;
        this.presentationGlows.raycast = () => {};

        this.group.add(this.batchedLinks);
        this.nodeInstances.count = 0;
        this.nodeInstances.frustumCulled = false;
        this.nodeInstances.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.nodeInstances.userData.orbitGraphNodeInstances = true;
        this.group.add(this.nodeInstances);
        this.group.add(this.presentationGlows);
        this.group.add(this.keyboardFocusMesh);
    }

    addNode(node: PhysicsNode): void {
        this.nodes.set(node.id, node);
        if (this.nodeInstanceById.size >= MAX_INSTANCED_NODES) throw new Error(`OrbitGraph supports at most ${MAX_INSTANCED_NODES.toLocaleString()} active node instances.`);
        const index = this.nodeIdByInstance.length;
        this.nodeInstanceById.set(node.id, index);
        this.nodeIdByInstance.push(node.id);
        this.nodeInstances.count = this.nodeIdByInstance.length;
        this.updateNodeInstance(node);

        if (
            !this.useBatchedLinks &&
            this.nodes.size > MAX_NODES_WITH_DETAILED_LINKS
        ) {
            this.enableBatchedLinks();
        }

        this.syncKeyboardFocus();
        this.syncPresentationGlows();
    }

    updateNode(node: PhysicsNode): void {
        if (!this.nodeInstanceById.has(node.id)) {
            if (this.isNodeInstanceVisible(node.id)) this.rebuildNodeInstances();
            return;
        }
        this.updateNodeInstance(node);
    }

    removeNode(nodeId: string): void {
        this.nodeInstanceById.delete(nodeId);
        this.nodeMeshes.delete(nodeId);
        this.nodes.delete(nodeId);
        this.rebuildNodeInstances();

        if (this.useBatchedLinks) {
            this.batchNeedsRebuild = true;
        }

        this.syncKeyboardFocus();
        this.syncPresentationGlows();
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
            this.syncPresentationGlows();
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
        this.syncPresentationGlows();
    }

    setVisibleNodeIds(nodeIds: Set<string>, minimumWeight: number): void {
        this.visibleNodeIds = new Set(nodeIds);
        this.minimumLinkWeight = minimumWeight;

        this.rebuildNodeInstances();

        this.syncKeyboardFocus();
        this.syncPresentationGlows();

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
     * Performs explicit camera culling for nodes and links. A link remains
     * visible when either endpoint is in (or near) the viewport, preserving
     * useful context at the screen boundary.
     */
    updateFrustumCulling(camera: THREE.Camera, margin = 1.2): void {
        camera.updateMatrixWorld();
        const frustum = this.cullingFrustum.setFromProjectionMatrix(
            this.cullingMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse),
        );
        const nextVisible = new Set<string>();
        for (const [id, node] of this.nodes) {
            const radius = Math.max((node.size ?? this.options.nodeSize) * margin, 0.8);
            this.cullingPosition.set(node.x, node.y, node.z);
            this.cullingSphere.set(this.cullingPosition, radius);
            if (frustum.intersectsSphere(this.cullingSphere)) nextVisible.add(id);
        }
        const changed = nextVisible.size !== this.frustumVisibleNodeIds.size || [...nextVisible].some((id) => !this.frustumVisibleNodeIds.has(id));
        if (!changed) return;
        this.frustumVisibleNodeIds.clear(); nextVisible.forEach((id) => this.frustumVisibleNodeIds.add(id));
        this.rebuildNodeInstances();
        if (this.useBatchedLinks) { this.batchNeedsRebuild = true; this.rebuildBatchedLinks(); }
        else for (const [id, line] of this.linkLines) {
            const link = line.userData.graphLink as StoredLink;
            const visible = this.isLinkVisible(link) && (nextVisible.has(link.source) || nextVisible.has(link.target));
            line.visible = visible;
            const arrow = this.linkArrows.get(id); if (arrow) arrow.visible = visible && this.showLinkArrows;
        }
    }

    /**
     * Displays a visual focus ring around a node selected through the keyboard.
     */
    setKeyboardFocus(nodeId: string | null): void {
        this.keyboardFocusedNodeId = nodeId;
        this.syncKeyboardFocus();
    }

    /** Resolves an InstancedMesh raycast back to the public graph node. */
    resolveNodeHit(hit: THREE.Intersection<THREE.Object3D>): { node: GraphNode; position: THREE.Vector3 } | null {
        if (hit.object !== this.nodeInstances || hit.instanceId === undefined) return null;
        const id = this.nodeIdByInstance[hit.instanceId], node = id ? this.nodes.get(id) : undefined;
        return node ? { node, position: new THREE.Vector3(node.x, node.y, node.z) } : null;
    }

    /** Replaces all transient node overrides used by analytics or application UI. */
    setNodePresentationStyles(styles: GraphNodePresentationStyles): void {
        this.presentationStyles.clear();

        for (const [nodeId, style] of Object.entries(styles)) {
            this.presentationStyles.set(nodeId, {
                color: style.color,
                scale: THREE.MathUtils.clamp(style.scale ?? 1, 0.25, 4),
                glow: THREE.MathUtils.clamp(style.glow ?? 0, 0, 1),
            });
        }

        for (const node of this.nodes.values()) {
            this.updateNode(node);
        }

        this.syncKeyboardFocus();
        this.syncPresentationGlows();
    }

    /** Restores colors and sizes from the underlying GraphNode records. */
    clearNodePresentationStyles(): void {
        if (this.presentationStyles.size === 0) {
            return;
        }

        this.presentationStyles.clear();

        for (const node of this.nodes.values()) {
            this.updateNode(node);
        }

        this.syncKeyboardFocus();
        this.syncPresentationGlows();
    }

    clear(): void {
        this.nodeInstanceById.clear(); this.nodeIdByInstance.length = 0; this.nodeInstances.count = 0;
        this.nodeInstances.instanceMatrix.needsUpdate = true;
        this.nodeMeshes.clear(); this.nodes.clear();

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
        this.presentationGlows.count = 0;

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
        if (!node || !this.isNodeInstanceVisible(node.id)) {
            this.keyboardFocusMesh.visible = false;
            return;
        }

        this.keyboardFocusMesh.position.set(node.x, node.y, node.z);
        this.keyboardFocusMesh.scale.setScalar((node.size ?? this.options.nodeSize) * (this.presentationStyles.get(node.id)?.scale ?? 1));
        this.keyboardFocusMesh.visible = true;
    }

    private syncPresentationGlows(): void {
        const activeStyles = [...this.presentationStyles.entries()]
            .filter(([nodeId, style]) => {
                return this.isNodeInstanceVisible(nodeId) && (style.glow ?? 0) > 0;
            })
            .sort(([, left], [, right]) => (right.glow ?? 0) - (left.glow ?? 0))
            .slice(0, MAX_PRESENTATION_GLOWS);

        for (let index = 0; index < activeStyles.length; index += 1) {
            const [nodeId, style] = activeStyles[index];
            const node = this.nodes.get(nodeId);
            if (!node) {
                continue;
            }

            const glow = style.glow ?? 0;
            const size = (node.size ?? this.options.nodeSize) * (style.scale ?? 1) * (1.25 + glow * 0.65);

            this.presentationGlowScale.setScalar(size);
            this.presentationGlowMatrix.compose(
                this.cullingPosition.set(node.x, node.y, node.z),
                new THREE.Quaternion(),
                this.presentationGlowScale,
            );
            this.presentationGlows.setMatrixAt(
                index,
                this.presentationGlowMatrix,
            );

            this.presentationGlowColor.set(
                style.color ?? node.color ?? this.options.nodeColor,
            );
            this.presentationGlows.setColorAt(
                index,
                this.presentationGlowColor,
            );
        }

        this.presentationGlows.count = activeStyles.length;
        this.presentationGlows.instanceMatrix.needsUpdate = true;

        if (this.presentationGlows.instanceColor) {
            this.presentationGlows.instanceColor.needsUpdate = true;
        }
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
            (link) => this.isLinkVisible(link) && (this.frustumVisibleNodeIds.size === 0 || this.frustumVisibleNodeIds.has(link.source) || this.frustumVisibleNodeIds.has(link.target)),
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

    private isNodeInstanceVisible(nodeId: string): boolean {
        return (this.visibleNodeIds.size === 0 || this.visibleNodeIds.has(nodeId)) &&
            (this.frustumVisibleNodeIds.size === 0 || this.frustumVisibleNodeIds.has(nodeId));
    }

    private updateNodeInstance(node: PhysicsNode): void {
        const index = this.nodeInstanceById.get(node.id);
        if (index === undefined) return;
        const style = this.presentationStyles.get(node.id);
        const size = this.isNodeInstanceVisible(node.id)
            ? (node.size ?? this.options.nodeSize) * (style?.scale ?? 1)
            : 0;
        this.nodeInstanceScale.setScalar(size);
        this.cullingPosition.set(node.x, node.y, node.z);
        this.nodeInstanceMatrix.compose(this.cullingPosition, this.nodeInstanceQuaternion, this.nodeInstanceScale);
        this.nodeInstances.setMatrixAt(index, this.nodeInstanceMatrix);
        this.nodeInstanceColor.set(style?.color ?? node.color ?? this.options.nodeColor);
        this.nodeInstances.setColorAt(index, this.nodeInstanceColor);
        this.nodeInstances.instanceMatrix.needsUpdate = true;
        if (this.nodeInstances.instanceColor) this.nodeInstances.instanceColor.needsUpdate = true;
    }

    /** Compacts active instances so culled nodes are not included in the GPU draw call. */
    private rebuildNodeInstances(): void {
        this.nodeInstanceById.clear(); this.nodeIdByInstance.length = 0;
        for (const node of this.nodes.values()) {
            if (!this.isNodeInstanceVisible(node.id)) continue;
            const index = this.nodeIdByInstance.length;
            if (index >= MAX_INSTANCED_NODES) break;
            this.nodeInstanceById.set(node.id, index); this.nodeIdByInstance.push(node.id);
        }
        this.nodeInstances.count = this.nodeIdByInstance.length;
        for (const id of this.nodeIdByInstance) { const node = this.nodes.get(id); if (node) this.updateNodeInstance(node); }
        this.nodeInstances.instanceMatrix.needsUpdate = true;
        if (this.nodeInstances.instanceColor) this.nodeInstances.instanceColor.needsUpdate = true;
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
