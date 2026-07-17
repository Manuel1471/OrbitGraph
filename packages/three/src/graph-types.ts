import * as THREE from "three";

import type { GraphLink } from "@orbitgraph/core"
import type { PhysicsNode } from "./PhysicsEngine";

export type NodeMesh = THREE.Mesh<
    THREE.SphereGeometry,
    THREE.MeshBasicMaterial
>;

export type LinkLine = THREE.Line<
    THREE.BufferGeometry,
    THREE.LineBasicMaterial
>;

export type LinkArrow = THREE.Mesh<
    THREE.ConeGeometry,
    THREE.MeshBasicMaterial
>;

export type GraphNodeMap = Map<string, PhysicsNode>;
export type GraphNodeMeshMap = Map<string, NodeMesh>;
export type GraphLinkLineMap = Map<string, LinkLine>;
export type GraphLinkArrowMap = Map<string, LinkArrow>;

export type RenderedLink = {
    link: GraphLink;
    line: LinkLine;
    arrow: LinkArrow;
};