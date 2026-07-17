import * as THREE from "three";

import type { GraphLink, GraphNode } from "@orbitgraph/core";

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

    private draggedNode: GraphNode | null = null;
    private pointerDownPosition = { x: 0, y: 0 };
    private hoveredNodeId: string | null = null;
    private hoveredLinkId: string | null = null;

    constructor(
        private readonly element: HTMLCanvasElement,
        private readonly camera: THREE.Camera,
        private readonly objects: () => THREE.Object3D[],
        private readonly callbacks: GraphInteractionCallbacks,
    ) {
        this.raycaster.params.Line!.threshold = 0.9;

        element.addEventListener("pointerdown", this.handlePointerDown);
        element.addEventListener("pointermove", this.handlePointerMove);
        element.addEventListener("pointerup", this.handlePointerUp);
    }

    dispose(): void {
        this.element.removeEventListener("pointerdown", this.handlePointerDown);
        this.element.removeEventListener("pointermove", this.handlePointerMove);
        this.element.removeEventListener("pointerup", this.handlePointerUp);
    }

    private getObject(event: PointerEvent): THREE.Object3D | undefined {
        const rect = this.element.getBoundingClientRect();

        this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.pointer, this.camera);

        return this.raycaster.intersectObjects(
            this.objects(),
            false,
        )[0]?.object;
    }

    private handlePointerDown = (event: PointerEvent): void => {
        this.pointerDownPosition = {
            x: event.clientX,
            y: event.clientY,
        };

        const object = this.getObject(event);
        const node = object?.userData.graphNode as GraphNode | undefined;

        if (!node) {
            return;
        }

        this.draggedNode = node;

        const position = object!.position;
        const direction = (this.camera as THREE.PerspectiveCamera)
            .getWorldDirection(new THREE.Vector3());

        this.dragPlane.setFromNormalAndCoplanarPoint(direction, position);

        this.callbacks.onDragStart?.(node);
    };

    private handlePointerMove = (event: PointerEvent): void => {
        if (this.draggedNode) {
            const rect = this.element.getBoundingClientRect();

            this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            this.raycaster.setFromCamera(this.pointer, this.camera);

            const position = this.raycaster.ray.intersectPlane(
                this.dragPlane,
                this.dragPoint,
            );

            if (position) {
                this.callbacks.onDragMove?.(
                    this.draggedNode,
                    position.clone(),
                );
            }

            return;
        }

        const object = this.getObject(event);

        const node = object?.userData.graphNode as GraphNode | undefined;
        const link = object?.userData.graphLink as GraphLink | undefined;

        const nextNodeId = node?.id ?? null;
        const nextLinkId = link?.id ?? null;

        if (
            nextNodeId === this.hoveredNodeId &&
            nextLinkId === this.hoveredLinkId
        ) {
            return;
        }

        this.hoveredNodeId = nextNodeId;
        this.hoveredLinkId = nextLinkId;

        this.element.style.cursor = node || link ? "pointer" : "grab";

        this.callbacks.onNodeHover?.(node ?? null, event);
        this.callbacks.onLinkHover?.(link ?? null, event);
    };

    private handlePointerUp = (event: PointerEvent): void => {
        const node = this.draggedNode;

        this.draggedNode = null;

        if (node) {
            this.callbacks.onDragEnd?.(node);
        }

        const movedDistance = Math.hypot(
            event.clientX - this.pointerDownPosition.x,
            event.clientY - this.pointerDownPosition.y,
        );

        if (node && movedDistance > 5) {
            return;
        }

        const object = this.getObject(event);

        const clickedNode = object?.userData.graphNode as GraphNode | undefined;
        const clickedLink = object?.userData.graphLink as GraphLink | undefined;

        if (clickedNode) {
            this.callbacks.onNodeClick?.(clickedNode, event);
            return;
        }

        if (clickedLink) {
            this.callbacks.onLinkClick?.(clickedLink, event);
        }
    };
}