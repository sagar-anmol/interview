import { chromium } from "playwright-core";
import fs from "node:fs";

const log = (l) => {
  fs.appendFileSync("/tmp/opencode/browser-probe.log", `${new Date().toISOString().slice(11, 19)} ${l}\n`);
};

fs.mkdirSync("/tmp/opencode", { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: false, args: ["--no-sandbox"] });
log(`[probe] browser version=${browser.version()}`);

browser.on("disconnected", () => log("[probe] BROWSER DISCONNECTED"));
browser.on("close", () => log("[probe] browser.on('close')"));

const ctx = await browser.newContext({ viewport: { width: 1680, height: 1010 } });
const page = await ctx.newPage();
page.on("close", () => log("[probe] page.on('close')"));
page.on("crash", () => log("[probe] page CRASH"));

await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded", timeout: 20000 });
log(`[probe] goto ok, url=${page.url()}`);

for (let i = 0; i < 30; i++) {
  await new Promise((r) => setTimeout(r, 1000));
  try {
    const shot = `/tmp/opencode/probe-${String(i).padStart(2, "0")}.png`;
    await page.screenshot({ path: shot });
    log(`[probe] screenshot ${shot} ok closed=${page.isClosed()}`);
  } catch (e) {
    log(`[probe] screenshot error: ${e.message} closed=${page.isClosed()}`);
    // Re-goto if closed.
    try {
      if (page.isClosed()) {
        log("[probe] page closed - reopening");
        await page.goto("http://localhost:3000/", { timeout: 15000 });
      }
    } catch (e2) {
      log(`[probe] regoto error: ${e2.message}`);
    }
  }
}
process.exit(0);
