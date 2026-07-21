// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { GraphData } from "@orbitgraph/core";

const mocks = vi.hoisted(() => {
    const graphInstance = {
        setData: vi.fn(),
        destroy: vi.fn(),
    };

    return {
        graphInstance,
        createOrbitGraph: vi.fn(() => graphInstance),
    };
});

vi.mock("@orbitgraph/three", () => ({
    createOrbitGraph: mocks.createOrbitGraph,
}));

import { OrbitGraph } from "../src/OrbitGraph";

const data: GraphData = {
    nodes: [
        {
            id: "team",
            label: "Product Team",
        },
    ],
    links: [],
};

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

beforeEach(() => {
    mocks.createOrbitGraph.mockReturnValue(mocks.graphInstance);
});

describe("OrbitGraph React component", () => {
    it("creates the graph instance and provides graph data", () => {
        render(
            <OrbitGraph
                data={data}
                style={{ width: "800px", height: "600px" }}
            />,
        );

        expect(mocks.createOrbitGraph).toHaveBeenCalledTimes(1);
        expect(mocks.graphInstance.setData).toHaveBeenCalledWith(data);
    });

    it("calls onReady after mounting", () => {
        const onReady = vi.fn();

        render(<OrbitGraph data={data} onReady={onReady} />);

        expect(onReady).toHaveBeenCalledWith(mocks.graphInstance);
    });

    it("destroys the graph instance when unmounted", () => {
        const view = render(<OrbitGraph data={data} />);

        view.unmount();

        expect(mocks.graphInstance.destroy).toHaveBeenCalledTimes(1);
    });

    it("updates graph data when the data prop changes", () => {
        const view = render(<OrbitGraph data={data} />);

        const nextData: GraphData = {
            nodes: [
                ...data.nodes,
                {
                    id: "service",
                    label: "Notification Service",
                },
            ],
            links: [],
        };

        view.rerender(<OrbitGraph data={nextData} />);

        expect(mocks.graphInstance.setData).toHaveBeenLastCalledWith(
            nextData,
        );
    });
});