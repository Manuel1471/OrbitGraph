import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "node",
        include: [
            "packages/**/tests/**/*.test.ts",
            "packages/**/tests/**/*.test.tsx",
            "examples/**/src/**/*.test.ts",
            "examples/**/src/**/*.test.tsx",
        ],
        setupFiles: ["./tests/setup.ts"],
    },
});
