import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { GraphRenderer } from "../src/GraphRenderer";
describe("GraphRenderer node instancing", () => {
    it("renders nodes through one InstancedMesh", () => { const group = new THREE.Group(); const renderer = new GraphRenderer(group, new Map(), new Map(), new Map(), new Map(), { nodeColor: "#fff", linkColor: "#fff", linkOpacity: .5, nodeSize: 1 }); renderer.addNode({ id: "a", x: 0, y: 0, z: 0 }); renderer.addNode({ id: "b", x: 1, y: 0, z: 0 }); const instances = group.children.find((child) => child instanceof THREE.InstancedMesh) as THREE.InstancedMesh; expect(instances.count).toBe(2); });
});
