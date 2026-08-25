import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
    testDir: "./tests/e2e", fullyParallel: true, retries: process.env.CI ? 2 : 0,
    webServer: { command: "npm run dev:benchmark -- --host 127.0.0.1", url: "http://127.0.0.1:5173", reuseExistingServer: !process.env.CI },
    use: { baseURL: "http://127.0.0.1:5173", trace: "retain-on-failure" },
    projects: [
        { name: "chromium", use: { ...devices["Desktop Chrome"] } },
        { name: "firefox", use: { ...devices["Desktop Firefox"] } },
        { name: "webkit", use: { ...devices["Desktop Safari"] } },
    ],
});
