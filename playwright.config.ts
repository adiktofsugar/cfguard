import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
    testDir: "./__tests__",
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: 1,
    reporter: "line",
    use: {
        baseURL: "http://localhost:8787",
        trace: "on-first-retry",
    },

    projects: [
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] },
        },
    ],

    webServer: {
        command: "npm run dev",
        port: 8787,
        reuseExistingServer: !process.env.CI,
    },
});
