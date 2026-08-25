import { generateScenario } from "./generateScenario";

const cancelled = new Set<number>();
const scope = self as unknown as DedicatedWorkerGlobalScope;

scope.onmessage = async (event: MessageEvent<{ type: "generate" | "cancel"; id: number; count?: number }>) => {
    const request = event.data;
    if (request.type === "cancel") { cancelled.add(request.id); return; }
    cancelled.delete(request.id);
    try {
        const data = await generateScenario(request.count ?? 1_000, 41, {
            isCancelled: () => cancelled.has(request.id),
            onProgress: (progress) => scope.postMessage({ type: "progress", id: request.id, progress }),
        });
        cancelled.delete(request.id);
        scope.postMessage(data ? { type: "complete", id: request.id, data } : { type: "cancelled", id: request.id });
    } catch (error) {
        cancelled.delete(request.id);
        scope.postMessage({ type: "error", id: request.id, message: error instanceof Error ? error.message : String(error) });
    }
};
