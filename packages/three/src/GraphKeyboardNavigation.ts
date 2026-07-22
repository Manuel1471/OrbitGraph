import type {
    GraphAccessibilityOptions,
    GraphNode,
} from "@orbitgraph/core";

export type GraphKeyboardNavigationCallbacks = {
    onFocusChange: (node: GraphNode | null) => void;
    onActivate: (node: GraphNode) => void;
    onExpand: (node: GraphNode) => void;
    onCollapse: (node: GraphNode) => void;
    onFocusCamera: (node: GraphNode) => void;
    onClear: () => void;
};

export class GraphKeyboardNavigation {
    private focusedNodeId: string | null = null;

    private readonly enabled: boolean;
    private readonly ariaLabel: string;

    private readonly previousTabIndex: number;
    private readonly previousRole: string | null;
    private readonly previousAriaLabel: string | null;
    private readonly previousAriaDescription: string | null;

    constructor(
        private readonly element: HTMLCanvasElement,
        private readonly getNodes: () => GraphNode[],
        private readonly callbacks: GraphKeyboardNavigationCallbacks,
        options: GraphAccessibilityOptions = {},
    ) {
        this.enabled = options.keyboardNavigation ?? true;
        this.ariaLabel =
            options.ariaLabel ?? "Interactive relationship graph";

        this.previousTabIndex = element.tabIndex;
        this.previousRole = element.getAttribute("role");
        this.previousAriaLabel = element.getAttribute("aria-label");
        this.previousAriaDescription =
            element.getAttribute("aria-description");

        this.configureElement();

        if (this.enabled) {
            this.element.addEventListener("keydown", this.handleKeyDown);
        }
    }

    getFocusedNodeId(): string | null {
        return this.focusedNodeId;
    }

    setFocusedNodeId(nodeId: string | null): void {
        if (nodeId !== null && !this.findNode(nodeId)) {
            return;
        }

        if (this.focusedNodeId === nodeId) {
            return;
        }

        this.focusedNodeId = nodeId;

        const node = nodeId ? this.findNode(nodeId) ?? null : null;

        this.updateAriaLabel(node);
        this.callbacks.onFocusChange(node);
    }

    clearFocus(): void {
        this.setFocusedNodeId(null);
    }

    refresh(): void {
        if (
            this.focusedNodeId &&
            !this.findNode(this.focusedNodeId)
        ) {
            this.clearFocus();
        }
    }

    focusNextNode(): void {
        this.moveFocus(1);
    }

    focusPreviousNode(): void {
        this.moveFocus(-1);
    }

    dispose(): void {
        this.element.removeEventListener("keydown", this.handleKeyDown);

        this.element.tabIndex = this.previousTabIndex;
        this.restoreAttribute("role", this.previousRole);
        this.restoreAttribute("aria-label", this.previousAriaLabel);
        this.restoreAttribute(
            "aria-description",
            this.previousAriaDescription,
        );
    }

    private configureElement(): void {
        this.element.tabIndex = 0;
        this.element.setAttribute("role", "application");
        this.element.setAttribute("aria-label", this.ariaLabel);
        this.element.setAttribute(
            "aria-description",
            [
                "Use arrow keys to move between visible nodes.",
                "Press Enter to select a node.",
                "Press E to expand, C to collapse, F to focus the camera,",
                "and Escape to clear the current focus.",
            ].join(" "),
        );
    }

    private handleKeyDown = (event: KeyboardEvent): void => {
        if (!this.enabled || this.isEditableElement(event.target)) {
            return;
        }

        switch (event.code) {
            case "ArrowRight":
            case "ArrowDown":
                this.focusNextNode();
                break;

            case "ArrowLeft":
            case "ArrowUp":
                this.focusPreviousNode();
                break;

            case "Enter":
            case "Space":
                this.runForFocusedNode((node) => {
                    this.callbacks.onActivate(node);
                });
                break;

            case "KeyE":
                this.runForFocusedNode((node) => {
                    this.callbacks.onExpand(node);
                });
                break;

            case "KeyC":
                this.runForFocusedNode((node) => {
                    this.callbacks.onCollapse(node);
                });
                break;

            case "KeyF":
                this.runForFocusedNode((node) => {
                    this.callbacks.onFocusCamera(node);
                });
                break;

            case "Escape":
                this.clearFocus();
                this.callbacks.onClear();
                break;

            default:
                return;
        }

        /*
         * Prevent GraphCamera from interpreting E as vertical movement while
         * keyboard navigation owns the canvas interaction.
         */
        event.preventDefault();
        event.stopPropagation();
    };

    private moveFocus(direction: 1 | -1): void {
        const nodes = this.getNodes();

        if (nodes.length === 0) {
            this.clearFocus();
            return;
        }

        const currentIndex = this.focusedNodeId
            ? nodes.findIndex((node) => node.id === this.focusedNodeId)
            : -1;

        const nextIndex =
            currentIndex === -1
                ? direction === 1
                    ? 0
                    : nodes.length - 1
                : (currentIndex + direction + nodes.length) % nodes.length;

        this.setFocusedNodeId(nodes[nextIndex].id);
    }

    private runForFocusedNode(
        callback: (node: GraphNode) => void,
    ): void {
        if (!this.focusedNodeId) {
            return;
        }

        const node = this.findNode(this.focusedNodeId);

        if (node) {
            callback(node);
        }
    }

    private findNode(nodeId: string): GraphNode | undefined {
        return this.getNodes().find((node) => node.id === nodeId);
    }

    private updateAriaLabel(node: GraphNode | null): void {
        if (!node) {
            this.element.setAttribute("aria-label", this.ariaLabel);
            return;
        }

        this.element.setAttribute(
            "aria-label",
            `${this.ariaLabel}. Keyboard focus: ${node.label ?? node.id}.`,
        );
    }

    private restoreAttribute(
        name: string,
        value: string | null,
    ): void {
        if (value === null) {
            this.element.removeAttribute(name);
            return;
        }

        this.element.setAttribute(name, value);
    }

    private isEditableElement(target: EventTarget | null): boolean {
        return (
            target instanceof HTMLInputElement ||
            target instanceof HTMLTextAreaElement ||
            target instanceof HTMLSelectElement ||
            (target instanceof HTMLElement && target.isContentEditable)
        );
    }
}