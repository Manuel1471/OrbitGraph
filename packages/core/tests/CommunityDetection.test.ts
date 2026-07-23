import { describe, expect, it } from "vitest";

import {
    detectCommunities,
    detectCommunitiesAsync,
} from "../src/CommunityDetection";
import type { GraphData } from "../src/types";

const clusteredData: GraphData = {
    nodes: [
        { id: "a" },
        { id: "b" },
        { id: "c" },
        { id: "d" },
        { id: "e" },
        { id: "f" },
    ],
    links: [
        { source: "a", target: "b" },
        { source: "b", target: "c" },
        { source: "c", target: "a" },
        { source: "d", target: "e" },
        { source: "e", target: "f" },
        { source: "f", target: "d" },
    ],
};

describe("CommunityDetection", () => {
    it("groups disconnected dense clusters", () => {
        const result = detectCommunities(clusteredData);

        expect(result.converged).toBe(true);
        expect(result.communities).toHaveLength(2);
        expect(result.membership.a).toBe(result.membership.b);
        expect(result.membership.b).toBe(result.membership.c);
        expect(result.membership.d).toBe(result.membership.e);
        expect(result.membership.e).toBe(result.membership.f);
        expect(result.membership.a).not.toBe(result.membership.d);
    });

    it("offers an asynchronous variant with the same result", async () => {
        const syncResult = detectCommunities(clusteredData);
        const asyncResult = await detectCommunitiesAsync(clusteredData);

        expect(asyncResult).toMatchObject({
            membership: syncResult.membership,
            communities: syncResult.communities,
            converged: true,
        });
    });
});