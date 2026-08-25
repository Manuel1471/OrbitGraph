import type { GraphTheme } from "./types";
/** Built-in themes suitable for application defaults or system color-scheme switching. */
export const graphThemes: Record<"dark" | "light" | "midnight", GraphTheme> = {
    dark: { name: "dark", backgroundColor: "#111827", nodeColor: "#22d3ee", linkColor: "#64748b", variables: { foreground: "#f8fafc", muted: "#94a3b8" } },
    light: { name: "light", backgroundColor: "#f8fafc", nodeColor: "#0284c7", linkColor: "#64748b", variables: { foreground: "#0f172a", muted: "#475569" } },
    midnight: { name: "midnight", backgroundColor: "#050816", nodeColor: "#a78bfa", linkColor: "#6366f1", variables: { foreground: "#e2e8f0", muted: "#94a3b8" } },
};
