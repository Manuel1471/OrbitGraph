import * as THREE from "three";

import type { GraphLink, GraphNode } from "@orbitgraph/core"
import type { PhysicsNode } from "./PhysicsEngine";
import type {
    GraphLinkArrowMap,
    GraphLinkLineMap,
    GraphNodeMap,
    GraphNodeMeshMap,
    LinkArrow,
} from "./graph-types";

export class GraphRenderer {
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
    ) {}

    addNode(node: PhysicsNode): void {
        this.nodes.set(node.id, node);

        const geometry = new THREE.SphereGeometry(1, 16, 16);
        const material = new THREE.MeshBasicMaterial({
            color: node.color ?? this.options.nodeColor,
        });

        const mesh = new THREE.Mesh(geometry, material);

        mesh.position.set(node.x, node.y, node.z);
        mesh.scale.setScalar(node.size ?? this.options.nodeSize);
        mesh.userData.graphNode = node;

        this.nodeMeshes.set(node.id, mesh);
        this.group.add(mesh);
    }

    updateNode(node: PhysicsNode): void {
        const mesh = this.nodeMeshes.get(node.id);

        if (!mesh) {
            this.addNode(node);
            return;
        }

        mesh.position.set(node.x, node.y, node.z);
        mesh.scale.setScalar(node.size ?? this.options.nodeSize);
        mesh.material.color.set(node.color ?? this.options.nodeColor);
    }

    removeNode(nodeId: string): void {
        const mesh = this.nodeMeshes.get(nodeId);

        if (mesh) {
            mesh.geometry.dispose();
            mesh.material.dispose();
            this.group.remove(mesh);
        }

        this.nodeMeshes.delete(nodeId);
        this.nodes.delete(nodeId);
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

        const graphLink = { ...link, id };

        const line = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(source.x, source.y, source.z),
                new THREE.Vector3(target.x, target.y, target.z),
            ]),
            new THREE.LineBasicMaterial({
                color: this.getLinkColor(graphLink),
                transparent: true,
                opacity: this.getLinkOpacity(graphLink),
            }),
        );

        line.userData.graphLink = graphLink;

        const arrow = new THREE.Mesh(
            new THREE.ConeGeometry(0.55, 1.5, 8),
            new THREE.MeshBasicMaterial({
                color: this.getLinkColor(graphLink),
            }),
        );

        arrow.userData.graphLink = graphLink;

        this.positionArrow(arrow, source, target);

        this.linkLines.set(id, line);
        this.linkArrows.set(id, arrow);

        this.group.add(line);
        this.group.add(arrow);
    }

    removeLink(linkId: string): void {
        const line = this.linkLines.get(linkId);
        const arrow = this.linkArrows.get(linkId);

        if (line) {
            line.geometry.dispose();
            line.material.dispose();
            this.group.remove(line);
        }

        if (arrow) {
            arrow.geometry.dispose();
            arrow.material.dispose();
            this.group.remove(arrow);
        }

        this.linkLines.delete(linkId);
        this.linkArrows.delete(linkId);
    }

    syncPositions(): void {
        for (const node of this.nodes.values()) {
            this.updateNode(node);
        }

        for (const [id, line] of this.linkLines) {
            const link = line.userData.graphLink as GraphLink;
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

            line.geometry.computeBoundingSphere();

            const arrow = this.linkArrows.get(id);

            if (arrow) {
                this.positionArrow(arrow, source, target);
            }
        }
    }

    setVisibleNodeIds(nodeIds: Set<string>, minimumWeight: number): void {
        for (const [nodeId, mesh] of this.nodeMeshes) {
            mesh.visible = nodeIds.has(nodeId);
        }

        for (const [id, line] of this.linkLines) {
            const link = line.userData.graphLink as GraphLink;

            const visible =
                nodeIds.has(link.source) &&
                nodeIds.has(link.target) &&
                (link.weight ?? 1) >= minimumWeight;

            line.visible = visible;

            const arrow = this.linkArrows.get(id);

            if (arrow) {
                arrow.visible = visible;
            }
        }
    }

    clear(): void {
        for (const nodeId of [...this.nodeMeshes.keys()]) {
            this.removeNode(nodeId);
        }

        for (const linkId of [...this.linkLines.keys()]) {
            this.removeLink(linkId);
        }
    }

    private positionArrow(
        arrow: LinkArrow,
        source: PhysicsNode,
        target: PhysicsNode,
    ): void {
        const start = new THREE.Vector3(source.x, source.y, source.z);
        const end = new THREE.Vector3(target.x, target.y, target.z);

        const direction = end.clone().sub(start).normalize();

        arrow.position.copy(start.lerp(end, 0.84));

        arrow.quaternion.setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            direction,
        );
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