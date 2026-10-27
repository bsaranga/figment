import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { defineConfig, devices } from "@playwright/test";

/**
 * HTML-in-Canvas browser harness.
 * Prefers FIGMENT_CHROME_PATH, then local Chrome for Testing / Canary installs.
 * Needs a build with the API (Canary/Dev ≥ 157) and launch flags below.
 */
function resolveChrome(): string | undefined {
  if (process.env.FIGMENT_CHROME_PATH) return process.env.FIGMENT_CHROME_PATH;

  const roots = [
    join(homedir(), "chrome-for-testing/chrome/mac_arm"),
    "/Applications/Google Chrome Canary.app/Contents/MacOS",
    "/Applications/Google Chrome Dev.app/Contents/MacOS",
  ];
  for (const root of roots) {
    if (!existsSync(root)) continue;
    if (root.includes("Google Chrome")) {
      const name = root.includes("Canary")
        ? "Google Chrome Canary"
        : "Google Chrome Dev";
      const p = join(root, name);
      if (existsSync(p)) return p;
    }
    // puppeteer browsers layout: pick newest version dir
    const versions = readdirSync(root).sort().reverse();
    for (const v of versions) {
      const candidates = [
        join(root, v, "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"),
        join(root, v, "chrome-mac/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"),
      ];
      for (const c of candidates) if (existsSync(c)) return c;
    }
  }
  return undefined;
}

const chromePath = resolveChrome();

const launchOptions = {
  ...(chromePath ? { executablePath: chromePath } : {}),
  args: [
    "--enable-blink-features=CanvasDrawElement,ElementCanvasTransform",
    "--enable-experimental-web-platform-features",
    "--no-sandbox",
  ],
};

export default defineConfig({
  testDir: "tests/browser",
  timeout: 60_000,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    ...devices["Desktop Chrome"],
    launchOptions,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "html-in-canvas",
      use: { ...devices["Desktop Chrome"], launchOptions },
    },
  ],
});
