import * as THREE from "three";

import { GraphCamera } from "./GraphCamera";
import { LinkParticleRenderer } from "./LinkParticleRenderer";

/** Owns the render loop and canvas resize work for one graph instance. */
export class GraphRuntime {
    private frameId: number | null = null;
    private previousFrameTime = performance.now();

    constructor(
        private readonly renderer: THREE.WebGLRenderer,
        private readonly scene: THREE.Scene,
        private readonly camera: THREE.PerspectiveCamera,
        private readonly graphCamera: GraphCamera,
        private readonly particles: LinkParticleRenderer,
    ) {}

    start(): void {
        if (this.frameId !== null) {
            return;
        }

        this.previousFrameTime = performance.now();
        this.frameId = requestAnimationFrame(this.animate);
    }

    stop(): void {
        if (this.frameId !== null) {
            cancelAnimationFrame(this.frameId);
            this.frameId = null;
        }
    }

    resize(container: HTMLElement): void {
        const width = container.clientWidth;
        const height = container.clientHeight;

        if (!width || !height) {
            return;
        }

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    private animate = (now: number): void => {
        this.frameId = requestAnimationFrame(this.animate);

        const deltaSeconds = (now - this.previousFrameTime) / 1000;

        this.previousFrameTime = now;

        this.graphCamera.update(deltaSeconds);
        this.particles.update(now / 1000);
        this.renderer.render(this.scene, this.camera);
    };
}