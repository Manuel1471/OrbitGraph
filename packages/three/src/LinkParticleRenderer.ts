import * as THREE from "three";
import type { GraphLink, LinkFlowOptions } from "@orbitgraph/core";
import type { GraphNodeMap } from "./graph-types";

type ParticleLink = { link: GraphLink; offset: number; speed: number };

export class LinkParticleRenderer {
    private readonly geometry = new THREE.CylinderGeometry(0.55, 0.55, 3.2, 6);
    private readonly material = new THREE.MeshBasicMaterial({ color: "#67e8f9", transparent: true, opacity: 0.95, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending });
    private readonly mesh: THREE.InstancedMesh;
    private readonly position = new THREE.Vector3();
    private readonly start = new THREE.Vector3();
    private readonly end = new THREE.Vector3();
    private readonly direction = new THREE.Vector3();
    private readonly scale = new THREE.Vector3();
    private readonly matrix = new THREE.Matrix4();
    private readonly rotation = new THREE.Quaternion();
    private readonly up = new THREE.Vector3(0, 1, 0);
    private links: ParticleLink[] = [];
    private readonly maxParticles: number;
    private readonly particleSize: number;
    private readonly particleSpeed: number;
    private enabled: boolean;

    constructor(private readonly scene: THREE.Scene, private readonly nodes: GraphNodeMap, options: LinkFlowOptions = {}) {
        this.maxParticles = options.maxParticles ?? 140;
        this.particleSize = options.particleSize ?? 0.035;
        this.particleSpeed = options.particleSpeed ?? 0.12;
        this.enabled = options.enabled ?? false;
        this.mesh = new THREE.InstancedMesh(this.geometry, this.material, this.maxParticles);
        this.mesh.frustumCulled = false;
        this.mesh.renderOrder = 100;
        this.mesh.count = 0;
        this.scene.add(this.mesh);
    }

    setLinks(links: GraphLink[]): void {
        this.links = links.slice(0, this.maxParticles).map((link, index) => ({ link, offset: (index * 0.61803398875) % 1, speed: this.particleSpeed * (0.65 + (link.weight ?? 0.6) * 0.7) }));
        this.mesh.count = this.enabled ? this.links.length : 0;
    }

    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
        this.mesh.count = enabled ? this.links.length : 0;
    }

    update(time: number): void {
        if (!this.enabled) return;
        for (let index = 0; index < this.links.length; index += 1) {
            const particle = this.links[index];
            const source = this.nodes.get(particle.link.source);
            const target = this.nodes.get(particle.link.target);
            if (!source || !target) continue;
            const progress = (particle.offset + time * particle.speed) % 1;
            this.start.set(source.x, source.y, source.z);
            this.end.set(target.x, target.y, target.z);
            this.position.lerpVectors(this.start, this.end, progress);
            this.direction.subVectors(this.end, this.start).normalize();
            this.rotation.setFromUnitVectors(this.up, this.direction);
            const pulse = 0.8 + Math.sin(progress * Math.PI) * 0.45;
            this.scale.set(this.particleSize * pulse, this.particleSize * 1.8 * pulse, this.particleSize * pulse);
            this.matrix.compose(this.position, this.rotation, this.scale);
            this.mesh.setMatrixAt(index, this.matrix);
        }
        this.mesh.instanceMatrix.needsUpdate = true;
    }

    clear(): void { this.links = []; this.mesh.count = 0; }
    dispose(): void { this.clear(); this.scene.remove(this.mesh); this.geometry.dispose(); this.material.dispose(); }
}