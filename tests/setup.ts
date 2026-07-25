import { vi } from "vitest";

class ResizeObserverMock {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
}

globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
globalThis.requestAnimationFrame = vi.fn(() => 1);
globalThis.cancelAnimationFrame = vi.fn();

// React 18+ uses this flag to verify that stateful updates are wrapped in act().
(
    globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT?: boolean;
    }
).IS_REACT_ACT_ENVIRONMENT = true;