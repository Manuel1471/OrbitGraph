export type GraphMobileControlsOptions = {
    /**
     * Displays the touch-friendly overlay. `"auto"` only displays it for
     * coarse-pointer devices such as phones and tablets. @defaultValue "auto"
     */
    enabled?: boolean | "auto";

    /** Corner used to place the control overlay. @defaultValue "bottom-right" */
    position?: "bottom-left" | "bottom-right";

    /** Shows zoom in and zoom out buttons. @defaultValue true */
    showZoomButtons?: boolean;

    /** Shows a button that resets the camera to the visible graph. @defaultValue true */
    showResetButton?: boolean;

    /** Accessible label applied to the control group. */
    ariaLabel?: string;
};

type GraphMobileControlsCallbacks = {
    onZoomIn: () => void;
    onZoomOut: () => void;
    onReset: () => void;
};

/**
 * Small, touch-friendly camera controls intended for phones and tablets.
 *
 * It deliberately owns no graph state. Applications can keep using native
 * OrbitControls gestures: one finger rotates; two fingers pan and pinch-zoom.
 */
export class GraphMobileControls {
    private readonly root: HTMLDivElement | null;
    private readonly previousContainerPosition: string | null;

    constructor(
        private readonly container: HTMLElement,
        private readonly callbacks: GraphMobileControlsCallbacks,
        options: GraphMobileControlsOptions = {},
    ) {
        const enabled = options.enabled ?? "auto";

        if (enabled === false || (enabled === "auto" && !this.hasCoarsePointer())) {
            this.root = null;
            this.previousContainerPosition = null;
            return;
        }

        this.previousContainerPosition = container.style.position;

        if (window.getComputedStyle(container).position === "static") {
            container.style.position = "relative";
        }

        const root = document.createElement("div");
        root.setAttribute("role", "group");
        root.setAttribute(
            "aria-label",
            options.ariaLabel ?? "Graph camera controls",
        );
        root.style.cssText = this.getRootStyles(
            options.position ?? "bottom-right",
        );

        const showZoomButtons = options.showZoomButtons ?? true;
        const showResetButton = options.showResetButton ?? true;

        if (showZoomButtons) {
            root.append(
                this.createButton("Zoom in", "+", this.callbacks.onZoomIn),
                this.createButton("Zoom out", "−", this.callbacks.onZoomOut),
            );
        }

        if (showResetButton) {
            root.append(
                this.createButton("Reset camera", "⌖", this.callbacks.onReset),
            );
        }

        this.root = root;
        container.append(root);
    }

    dispose(): void {
        this.root?.remove();

        if (this.previousContainerPosition !== null) {
            this.container.style.position = this.previousContainerPosition;
        }
    }

    private createButton(
        label: string,
        content: string,
        onClick: () => void,
    ): HTMLButtonElement {
        const button = document.createElement("button");

        button.type = "button";
        button.textContent = content;
        button.title = label;
        button.setAttribute("aria-label", label);
        button.style.cssText = [
            "display:grid",
            "place-items:center",
            "width:48px",
            "height:48px",
            "margin:0",
            "padding:0",
            "border:1px solid rgba(148, 163, 184, 0.32)",
            "border-radius:12px",
            "background:rgba(2, 6, 23, 0.88)",
            "box-shadow:0 8px 24px rgba(2, 6, 23, 0.35)",
            "color:#f8fafc",
            "font:600 26px/1 system-ui, sans-serif",
            "cursor:pointer",
            "touch-action:manipulation",
            "-webkit-tap-highlight-color:transparent",
        ].join(";");

        // Do not let OrbitControls interpret a tap on an overlay button as a
        // graph gesture.
        button.addEventListener("pointerdown", (event) => event.stopPropagation());
        button.addEventListener("click", onClick);

        return button;
    }

    private getRootStyles(
        position: NonNullable<GraphMobileControlsOptions["position"]>,
    ): string {
        const horizontal = position === "bottom-left" ? "left:16px" : "right:16px";

        return [
            "position:absolute",
            "z-index:10",
            "bottom:max(16px, env(safe-area-inset-bottom))",
            horizontal,
            "display:flex",
            "flex-direction:column",
            "gap:8px",
            "pointer-events:auto",
        ].join(";");
    }

    private hasCoarsePointer(): boolean {
        return window.matchMedia?.("(pointer: coarse)").matches ?? false;
    }
}