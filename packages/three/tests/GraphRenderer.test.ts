import * as THREE from "three";
import { describe, expect, it } from "vitest";

import { GraphRenderer } from "../src/GraphRenderer";
import type {
    GraphLinkArrowMap,
    GraphLinkLineMap,
    GraphNodeMap,
    GraphNodeMeshMap,
} from "../src/graph-types";

const createRenderer = () => {
    const group = new THREE.Group();
    const nodes: GraphNodeMap = new Map();
    const nodeMeshes: GraphNodeMeshMap = new Map();
    const linkLines: GraphLinkLineMap = new Map();
    const linkArrows: GraphLinkArrowMap = new Map();

    const renderer = new GraphRenderer(
        group,
        nodeMeshes,
        linkLines,
        linkArrows,
        nodes,
        {
            nodeColor: "#22d3ee",
            nodeSize: 0.65,
            linkColor: "#6366f1",
            linkOpacity: 0.55,
        },
    );

    return { renderer, group, nodes, nodeMeshes, linkLines, linkArrows };
};

const instances = (group: THREE.Group) => group.children.find((child) => child instanceof THREE.InstancedMesh) as THREE.InstancedMesh;
const instanceScale = (mesh: THREE.InstancedMesh, index: number) => { const matrix = new THREE.Matrix4(); mesh.getMatrixAt(index, matrix); return new THREE.Vector3().setFromMatrixScale(matrix); };

describe("GraphRenderer", () => {
    it("creates and removes an instanced node", () => {
        const { renderer, group } = createRenderer();

        renderer.addNode({ id: "manuel", x: 1, y: 2, z: 3 });
        expect(instances(group).count).toBe(1);

        renderer.removeNode("manuel");
        expect(instances(group).count).toBe(0);
    });

    it("creates a line and an arrow for a relation", () => {
        const { renderer, linkLines, linkArrows } = createRenderer();

        renderer.addNode({ id: "api", x: 0, y: 0, z: 0 });
        renderer.addNode({ id: "db", x: 10, y: 0, z: 0 });
        renderer.addLink({
            id: "api-db",
            source: "api",
            target: "db",
            type: "stores-data-in",
        });

        expect(linkLines.has("api-db")).toBe(true);
        expect(linkArrows.has("api-db")).toBe(true);
    });

    it("hides nodes and links outside visible IDs", () => {
        const { renderer, group, linkLines } = createRenderer();

        renderer.addNode({ id: "api", x: 0, y: 0, z: 0 });
        renderer.addNode({ id: "db", x: 10, y: 0, z: 0 });
        renderer.addLink({
            id: "api-db",
            source: "api",
            target: "db",
            weight: 0.8,
        });

        renderer.setVisibleNodeIds(new Set(["api"]), 0);

        expect(instanceScale(instances(group), 0).length()).toBeGreaterThan(0);
        expect(instances(group).count).toBe(1);
        expect(linkLines.get("api-db")?.visible).toBe(false);
    });

    it("applies and clears transient analytics presentation styles", () => {
        const { renderer, group } = createRenderer();

        renderer.addNode({
            id: "hub",
            x: 0,
            y: 0,
            z: 0,
            color: "#22d3ee",
        });

        const mesh = instances(group), color = new THREE.Color(); mesh.getColorAt(0, color); const baseColor = color.getHex();

        renderer.setNodePresentationStyles({
            hub: { color: "#facc15" },
        });

        mesh.getColorAt(0, color); expect(color.getHexString()).toBe("facc15");

        renderer.clearNodePresentationStyles();

        mesh.getColorAt(0, color); expect(color.getHex()).toBe(baseColor);
    });
});
