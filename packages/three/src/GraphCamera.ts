import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import type { OrbitGraphCameraOptions } from "@orbitgraph/core";

import type { PhysicsNode } from "./PhysicsEngine";

export class GraphCamera {
    private readonly pressedKeys = new Set<string>();
    private readonly movementDirection = new THREE.Vector3();
    private readonly horizontalForward = new THREE.Vector3();
    private readonly horizontalRight = new THREE.Vector3();
    private readonly worldUp = new THREE.Vector3(0, 1, 0);

    private readonly movementSpeed: number;
    private readonly boostMultiplier: number;
    private readonly keyboardNavigation: boolean;

    private readonly previousTouchAction: string;

    private readonly minDistance: number;
    private readonly maxDistance: number;

    constructor(
        private readonly camera: THREE.PerspectiveCamera,
        private readonly controls: OrbitControls,
        private readonly element: HTMLElement,
        options: OrbitGraphCameraOptions = {},
    ) {

        this.movementSpeed = options.movementSpeed ?? 18;
        this.boostMultiplier = options.boostMultiplier ?? 2.5;
        this.keyboardNavigation = options.keyboardNavigation ?? true;

        this.previousTouchAction = this.element.style.touchAction;

        this.configureControls(options);

        this.minDistance = options.minDistance ?? 2;
        this.maxDistance = options.maxDistance ?? 1000;

        this.controls.minDistance = this.minDistance;
        this.controls.maxDistance = this.maxDistance;

        window.addEventListener("keydown", this.handleKeyDown);
        window.addEventListener("keyup", this.handleKeyUp);
        window.addEventListener("blur", this.clearPressedKeys);

        this.element.addEventListener("contextmenu", this.preventContextMenu);
    }

    /**
     * Updates camera damping and optional desktop keyboard movement.
     * Call this once per animation frame.
     */
    update(deltaSeconds: number): void {
        this.controls.update();

        if (!this.keyboardNavigation || this.pressedKeys.size === 0) {
            return;
        }

        this.movementDirection.set(0, 0, 0);

        this.camera.getWorldDirection(this.horizontalForward);
        this.horizontalForward.y = 0;

        if (this.horizontalForward.lengthSq() > 0) {
            this.horizontalForward.normalize();
        }

        this.horizontalRight
            .crossVectors(this.horizontalForward, this.worldUp)
            .normalize();

        if (this.isPressed("KeyW")) {
            this.movementDirection.add(this.horizontalForward);
        }

        if (this.isPressed("KeyS")) {
            this.movementDirection.sub(this.horizontalForward);
        }

        if (this.isPressed("KeyD")) {
            this.movementDirection.add(this.horizontalRight);
        }

        if (this.isPressed("KeyA")) {
            this.movementDirection.sub(this.horizontalRight);
        }

        if (this.isPressed("KeyE")) {
            this.movementDirection.add(this.worldUp);
        }

        if (this.isPressed("KeyQ")) {
            this.movementDirection.sub(this.worldUp);
        }

        if (this.movementDirection.lengthSq() === 0) {
            return;
        }

        const speed =
            this.movementSpeed *
            (this.isPressed("ShiftLeft") || this.isPressed("ShiftRight")
                ? this.boostMultiplier
                : 1);

        this.movementDirection
            .normalize()
            .multiplyScalar(speed * Math.min(deltaSeconds, 0.1));

        /*
         * Move the camera and its orbit target together so orientation remains
         * stable while navigating through the graph.
         */
        this.camera.position.add(this.movementDirection);
        this.controls.target.add(this.movementDirection);

        this.controls.update();
    }

    focusNode(node: PhysicsNode): void {
        const position = new THREE.Vector3(node.x, node.y, node.z);

        const direction = this.camera.position
            .clone()
            .sub(this.controls.target)
            .normalize();

        this.controls.target.copy(position);

        this.camera.position.copy(
            position.clone().add(direction.multiplyScalar(24)),
        );

        this.controls.update();
    }


    /** Moves the camera closer to or farther from its current target. */
    zoomBy(scale: number): void {
        const offset = this.camera.position.clone().sub(this.controls.target);
        const currentDistance = offset.length();

        if (currentDistance === 0) {
            return;
        }

        const distance = THREE.MathUtils.clamp(
            currentDistance * scale,
            this.minDistance,
            this.maxDistance,
        );

        this.camera.position.copy(
            this.controls.target.clone().add(offset.normalize().multiplyScalar(distance)),
        );
        this.controls.update();
    }

    reset(nodes: PhysicsNode[]): void {
        if (nodes.length === 0) {
            return;
        }

        const bounds = new THREE.Box3();

        for (const node of nodes) {
            bounds.expandByPoint(
                new THREE.Vector3(node.x, node.y, node.z),
            );
        }

        const center = bounds.getCenter(new THREE.Vector3());

        const graphSize = Math.max(
            bounds.getSize(new THREE.Vector3()).length(),
            24,
        );

        const distance =
            graphSize /
            (2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2))) *
            1.35;

        this.controls.target.copy(center);

        this.camera.position.copy(
            center.add(
                new THREE.Vector3(0.7, 0.55, 1)
                    .normalize()
                    .multiplyScalar(distance),
            ),
        );

        this.controls.update();
    }

    dispose(): void {
        window.removeEventListener("keydown", this.handleKeyDown);
        window.removeEventListener("keyup", this.handleKeyUp);
        window.removeEventListener("blur", this.clearPressedKeys);

        this.element.removeEventListener(
            "contextmenu",
            this.preventContextMenu,
        );

        this.element.style.touchAction = this.previousTouchAction;
        this.pressedKeys.clear();
    }

    private configureControls(options: OrbitGraphCameraOptions): void {
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.08;

        this.controls.enablePan = true;
        this.controls.screenSpacePanning = true;

        this.controls.rotateSpeed = 0.65;
        this.controls.panSpeed = 0.9;
        this.controls.zoomSpeed = 0.9;

        this.controls.minDistance = options.minDistance ?? 2;
        this.controls.maxDistance = options.maxDistance ?? 1_000;

        /*
         * Desktop:
         * - Left mouse: orbit
         * - Right mouse: pan
         * - Wheel: zoom
         */
        this.controls.mouseButtons = {
            LEFT: THREE.MOUSE.ROTATE,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.PAN,
        };

        /*
         * Touch:
         * - One finger: orbit
         * - Two fingers: pan and pinch-to-zoom
         */
        this.controls.touches = {
            ONE: THREE.TOUCH.ROTATE,
            TWO: THREE.TOUCH.DOLLY_PAN,
        };

        /*
         * Prevent browser scroll, browser zoom, and navigation gestures while
         * the user is interacting with the graph canvas.
         */
        this.element.style.touchAction = "none";
    }

    private handleKeyDown = (event: KeyboardEvent): void => {
        if (!this.keyboardNavigation || this.isEditableElement(event.target)) {
            return;
        }

        const movementKeys = new Set([
            "KeyW",
            "KeyA",
            "KeyS",
            "KeyD",
            "KeyQ",
            "KeyE",
            "ShiftLeft",
            "ShiftRight",
        ]);

        if (!movementKeys.has(event.code)) {
            return;
        }

        event.preventDefault();
        this.pressedKeys.add(event.code);
    };

    private handleKeyUp = (event: KeyboardEvent): void => {
        this.pressedKeys.delete(event.code);
    };

    private clearPressedKeys = (): void => {
        this.pressedKeys.clear();
    };

    private preventContextMenu = (event: MouseEvent): void => {
        event.preventDefault();
    };

    private isPressed(code: string): boolean {
        return this.pressedKeys.has(code);
    }

    private isEditableElement(target: EventTarget | null): boolean {
        return (
            target instanceof HTMLInputElement ||
            target instanceof HTMLTextAreaElement ||
            target instanceof HTMLSelectElement ||
            (target instanceof HTMLElement && target.isContentEditable)
        );
    }
}