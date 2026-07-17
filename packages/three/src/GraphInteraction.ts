import * as THREE from "three";

import type { GraphLink, GraphNode } from "@orbitgraph/core";

const DRAG_START_DISTANCE = 5;
const HOVER_CHECK_INTERVAL_MS = 80;

export type ResolvedNodeHit = {
    node: GraphNode;
    position: THREE.Vector3;
};

export type GraphInteractionCallbacks = {
    onNodeClick?: (node: GraphNode, event: PointerEvent) => void;
    onLinkClick?: (link: GraphLink, event: PointerEvent) => void;
    onNodeHover?: (node: GraphNode | null, event: PointerEvent) => void;
    onLinkHover?: (link: GraphLink | null, event: PointerEvent) => void;
    onDragStart?: (node: GraphNode) => void;
    onDragMove?: (
        node: GraphNode,
        position: THREE.Vector3,
    ) => void;
    onDragEnd?: (node: GraphNode) => void;
};

export class GraphInteraction {
    private readonly raycaster = new THREE.Raycaster();
    private readonly pointer = new THREE.Vector2();
    private readonly dragPlane = new THREE.Plane();
    private readonly dragPoint = new THREE.Vector3();

    private pendingDragNode: GraphNode | null = null;
    private pendingDragPosition: THREE.Vector3 | null = null;
    private draggedNode: GraphNode | null = null;

    private pointerDownPosition = { x: 0, y: 0 };
    private hoveredNodeId: string | null = null;
    private hoveredLinkId: string | null = null;
    private lastHoverCheck = 0;

    constructor(
        private readonly element: HTMLCanvasElement,
        private readonly camera: THREE.Camera,
        private readonly objects: () => THREE.Object3D[],
        private readonly callbacks: GraphInteractionCallbacks,
        private readonly resolveNodeHit?: (
            hit: THREE.Intersection<THREE.Object3D>,
        ) => ResolvedNodeHit | null,
    ) {
        this.raycaster.params.Line!.threshold = 0.9;

        element.addEventListener("pointerdown", this.handlePointerDown);
        element.addEventListener("pointermove", this.handlePointerMove);
        element.addEventListener("pointerup", this.handlePointerUp);
        element.addEventListener("pointercancel", this.handlePointerCancel);
    }

    dispose(): void {
        this.element.removeEventListener("pointerdown", this.handlePointerDown);
        this.element.removeEventListener("pointermove", this.handlePointerMove);
        this.element.removeEventListener("pointerup", this.handlePointerUp);
        this.element.removeEventListener("pointercancel", this.handlePointerCancel);
    }

    private getHit(
        event: PointerEvent,
    ): THREE.Intersection<THREE.Object3D> | undefined {
        const rect = this.element.getBoundingClientRect();

        this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.pointer, this.camera);

        return this.raycaster.intersectObjects(
            this.objects(),
            false,
        )[0];
    }

    private getNodeHit(
        hit: THREE.Intersection<THREE.Object3D> | undefined,
    ): ResolvedNodeHit | null {
        if (!hit) {
            return null;
        }

        const resolvedNode = this.resolveNodeHit?.(hit);

        if (resolvedNode) {
            return resolvedNode;
        }

        const node = hit.object.userData.graphNode as GraphNode | undefined;

        if (!node) {
            return null;
        }

        return {
            node,
            position: hit.object.position.clone(),
        };
    }

    private handlePointerDown = (event: PointerEvent): void => {
        this.pointerDownPosition = {
            x: event.clientX,
            y: event.clientY,
        };

        const nodeHit = this.getNodeHit(this.getHit(event));

        if (!nodeHit) {
            return;
        }

        this.pendingDragNode = nodeHit.node;
        this.pendingDragPosition = nodeHit.position;
    };

    private handlePointerMove = (event: PointerEvent): void => {
        if (this.pendingDragNode) {
            const movedDistance = Math.hypot(
                event.clientX - this.pointerDownPosition.x,
                event.clientY - this.pointerDownPosition.y,
            );

            if (movedDistance >= DRAG_START_DISTANCE) {
                this.startDragging();
            }
        }

        if (this.draggedNode) {
            this.moveDraggedNode(event);
            return;
        }

        const now = performance.now();

        if (now - this.lastHoverCheck < HOVER_CHECK_INTERVAL_MS) {
            return;
        }

        this.lastHoverCheck = now;

        const hit = this.getHit(event);
        const nodeHit = this.getNodeHit(hit);
        const link = hit?.object.userData.graphLink as GraphLink | undefined;

        const nextNodeId = nodeHit?.node.id ?? null;
        const nextLinkId = link?.id ?? null;

        if (
            nextNodeId === this.hoveredNodeId &&
            nextLinkId === this.hoveredLinkId
        ) {
            return;
        }

        this.hoveredNodeId = nextNodeId;
        this.hoveredLinkId = nextLinkId;

        this.element.style.cursor =
            nodeHit || link ? "pointer" : "grab";

        this.callbacks.onNodeHover?.(nodeHit?.node ?? null, event);
        this.callbacks.onLinkHover?.(link ?? null, event);
    };

    private handlePointerUp = (event: PointerEvent): void => {
        const draggedNode = this.draggedNode;
        const clickedNode = this.pendingDragNode;

        this.pendingDragNode = null;
        this.pendingDragPosition = null;
        this.draggedNode = null;

        if (draggedNode) {
            this.callbacks.onDragEnd?.(draggedNode);
            return;
        }

        if (clickedNode) {
            this.callbacks.onNodeClick?.(clickedNode, event);
            return;
        }

        const hit = this.getHit(event);
        const clickedLink = hit?.object.userData.graphLink as
            | GraphLink
            | undefined;

        if (clickedLink) {
            this.callbacks.onLinkClick?.(clickedLink, event);
        }
    };

    private handlePointerCancel = (): void => {
        if (this.draggedNode) {
            this.callbacks.onDragEnd?.(this.draggedNode);
        }

        this.pendingDragNode = null;
        this.pendingDragPosition = null;
        this.draggedNode = null;
    };

    private startDragging(): void {
        const node = this.pendingDragNode;
        const position = this.pendingDragPosition;

        if (!node || !position) {
            return;
        }

        this.draggedNode = node;
        this.pendingDragNode = null;
        this.pendingDragPosition = null;

        const direction = this.camera.getWorldDirection(
            new THREE.Vector3(),
        );

        this.dragPlane.setFromNormalAndCoplanarPoint(
            direction,
            position,
        );

        this.callbacks.onDragStart?.(node);
    }

    private moveDraggedNode(event: PointerEvent): void {
        const rect = this.element.getBoundingClientRect();

        this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.pointer, this.camera);

        const position = this.raycaster.ray.intersectPlane(
            this.dragPlane,
            this.dragPoint,
        );

        if (position && this.draggedNode) {
            this.callbacks.onDragMove?.(
                this.draggedNode,
                position.clone(),
            );
        }
    }
}