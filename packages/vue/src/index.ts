import { defineComponent, h, onBeforeUnmount, onMounted, ref, shallowRef, watch, type PropType } from "vue";
import type { GraphData, GraphDiagnostic, GraphLoadingState, GraphNode, GraphSelection, OrbitGraphOptions, VisibleGraphData } from "@orbitgraph/core";
import { createOrbitGraph, type OrbitGraph as OrbitGraphInstance } from "@orbitgraph/three";

export type OrbitGraphVueExposed = { readonly graph: OrbitGraphInstance | undefined; getGraph(): OrbitGraphInstance };

/** Vue 3 wrapper with the complete OrbitGraph event surface and imperative instance access. */
export const OrbitGraph = defineComponent({
    name: "OrbitGraph", inheritAttrs: false,
    props: { data: { type: Object as PropType<GraphData>, required: true }, options: { type: Object as PropType<OrbitGraphOptions>, default: () => ({}) } },
    emits: {
        ready: (_graph: OrbitGraphInstance) => true,
        "selection-change": (_value: GraphSelection) => true,
        "visible-data-change": (_value: VisibleGraphData) => true,
        "loading-change": (_value: GraphLoadingState) => true,
        diagnostic: (_value: GraphDiagnostic) => true,
        "keyboard-focus-change": (_value: GraphNode | null) => true,
        "node-click": (_value: Parameters<NonNullable<OrbitGraphOptions["onNodeClick"]>>[0]) => true,
        "link-click": (_value: Parameters<NonNullable<OrbitGraphOptions["onLinkClick"]>>[0]) => true,
        "node-hover": (_value: Parameters<NonNullable<OrbitGraphOptions["onNodeHover"]>>[0]) => true,
        "link-hover": (_value: Parameters<NonNullable<OrbitGraphOptions["onLinkHover"]>>[0]) => true,
    },
    setup(props, { emit, expose, attrs }) {
        const host = ref<HTMLElement>(), graph = shallowRef<OrbitGraphInstance>();
        const mount = () => {
            if (!host.value) return;
            graph.value?.destroy();
            graph.value = createOrbitGraph(host.value, {
                ...props.options,
                onSelectionChange: (value) => emit("selection-change", value), onVisibleDataChange: (value) => emit("visible-data-change", value),
                onLoadingChange: (value) => emit("loading-change", value), onDiagnostic: (value) => emit("diagnostic", value),
                onKeyboardFocusChange: (value) => emit("keyboard-focus-change", value), onNodeClick: (value) => emit("node-click", value),
                onLinkClick: (value) => emit("link-click", value), onNodeHover: (value) => emit("node-hover", value), onLinkHover: (value) => emit("link-hover", value),
            });
            graph.value.setData(props.data); emit("ready", graph.value);
        };
        onMounted(mount); watch(() => props.data, (data) => graph.value?.setData(data)); watch(() => props.options, mount);
        onBeforeUnmount(() => { graph.value?.destroy(); graph.value = undefined; });
        expose({ get graph() { return graph.value; }, getGraph: () => { if (!graph.value) throw new Error("OrbitGraph is not mounted."); return graph.value; } } satisfies OrbitGraphVueExposed);
        return () => h("div", { ...attrs, ref: host, style: [{ width: "100%", height: "100%" }, attrs.style] });
    },
});
export type { OrbitGraphInstance };
