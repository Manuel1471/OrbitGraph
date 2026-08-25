import * as THREE from "three";

import { GraphCamera } from "./GraphCamera";
import { LinkParticleRenderer } from "./LinkParticleRenderer";

/** Owns the render loop and canvas resize work for one graph instance. */
export class GraphRuntime {
    private frameId: number | null = null;
    private previousFrameTime = performance.now();
    private frames = 0;
    private sampleStartedAt = performance.now();
    private visibleNodes = 0;
    private visibleLinks = 0;

    constructor(
        private readonly renderer: THREE.WebGLRenderer | null,
        private readonly scene: THREE.Scene,
        private readonly camera: THREE.PerspectiveCamera,
        private readonly graphCamera: GraphCamera,
        private readonly particles: LinkParticleRenderer,
        private readonly performanceOptions?: { telemetry?: boolean; onPerformanceSample?: (sample: { fps: number; visibleNodes: number; visibleLinks: number }) => void },
        private readonly renderFallback?: () => void,
    ) {}

    setVisibleCounts(nodes: number, links: number): void { this.visibleNodes = nodes; this.visibleLinks = links; }

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
        this.renderer?.setSize(width, height);
    }

    private animate = (now: number): void => {
        this.frameId = requestAnimationFrame(this.animate);

        const deltaSeconds = (now - this.previousFrameTime) / 1000;

        this.previousFrameTime = now;

        this.graphCamera.update(deltaSeconds);
        this.particles.update(now / 1000);
        if (this.renderer) this.renderer.render(this.scene, this.camera);
        else this.renderFallback?.();
        this.frames += 1;
        const elapsed = now - this.sampleStartedAt;
        if (this.performanceOptions?.telemetry && elapsed >= 1000) {
            this.performanceOptions.onPerformanceSample?.({ fps: Math.round((this.frames * 1000) / elapsed), visibleNodes: this.visibleNodes, visibleLinks: this.visibleLinks });
            this.frames = 0;
            this.sampleStartedAt = now;
        }
    };
}
