import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import type { PhysicsNode } from "./PhysicsEngine";

export class GraphCamera {
    constructor(
        private readonly camera: THREE.PerspectiveCamera,
        private readonly controls: OrbitControls,
    ) {}

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
}