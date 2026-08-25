import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";
export default defineConfig({ resolve: { alias: { "@orbitgraph/core": fileURLToPath(new URL("../../packages/core/src/index.ts", import.meta.url)), "@orbitgraph/three": fileURLToPath(new URL("../../packages/three/src/index.ts", import.meta.url)) } } });
