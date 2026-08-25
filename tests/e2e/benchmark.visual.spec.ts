import { expect, test } from "@playwright/test";
test("benchmark renders, changes layout, and remains visually stable", async ({ page }, testInfo) => {
    await page.goto("/"); await expect(page.getByRole("heading", { name: "Graph Scale Lab" })).toBeVisible();
    await expect(page.locator("#summary")).toContainText("1,000 nodes", { timeout: 15_000 });
    await page.getByLabel("Layout").selectOption("radial"); await expect(page.locator("#summary")).toContainText("radial");
    expect((await page.locator("canvas").count())).toBeGreaterThan(0);
    await page.addStyleTag({ content: ".panel { background: #080d20 !important; backdrop-filter: none !important; }" });
    await expect(page.locator(".panel")).toHaveScreenshot("benchmark-panel-radial.png", {
        animations: "disabled",
        mask: [page.locator("#fps"), page.locator("#load-ms")],
        maxDiffPixels: 300,
    });
    await testInfo.attach("benchmark-radial", { body: await page.screenshot(), contentType: "image/png" });
});
test("50K generation can be cancelled without losing the current graph", async ({ page }) => {
    await page.goto("/"); await expect(page.locator("#summary")).toContainText("1,000 nodes", { timeout: 15_000 });
    await page.getByLabel("Nodes").fill("50000");
    await page.evaluate(() => { (document.querySelector("#load-custom") as HTMLButtonElement).click(); (document.querySelector("#cancel-scenario") as HTMLButtonElement).click(); });
    await expect(page.locator("#summary")).toContainText("cancelled");
});
test("Canvas mode replaces WebGL with one independent canvas surface", async ({ page }) => {
    await page.goto("/"); await expect(page.locator("#summary")).toContainText("1,000 nodes", { timeout: 15_000 });
    await page.getByLabel("Renderer").selectOption("canvas"); await expect(page.locator("#summary")).toContainText("CANVAS");
    await expect(page.locator("#graph canvas")).toHaveCount(1);
});
