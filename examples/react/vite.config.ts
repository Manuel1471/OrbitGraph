import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
    plugins: [react()],
    resolve: { alias: { "@orbitgraph/core": fileURLToPath(new URL("../../packages/core/src/index.ts", import.meta.url)), "@orbitgraph/three": fileURLToPath(new URL("../../packages/three/src/index.ts", import.meta.url)) } },
});
