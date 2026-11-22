/**
 * Browser bridge for manual app usage.
 *
 * Opens the interview app in a real Chromium/Chrome window (system Chrome via
 * CDP). While the user uses the app, we stream every console message, page
 * error, failed request, and 4xx/5xx response into a log file, and take a
 * fresh screenshot every ~2s so we can see the actual UI state.
 *
 * Log:        /tmp/opencode/browser.log        (tail -f to watch live)
 * Screenshot: /tmp/opencode/screens/screen.png (latest)
 * Stamped:    /tmp/opencode/screens/screen-*.png
 *
 * Usage:
 *   node scripts/browser-bridge.mjs [URL]   (URL defaults to http://localhost:3000/)
 */
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const URL_TO_OPEN = process.argv[2] ?? "http://localhost:3000/";
const LOG_FILE = "/tmp/opencode/browser.log";
const SCREENS_DIR = "/tmp/opencode/screens";
fs.mkdirSync(SCREENS_DIR, { recursive: true });
fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });

const log = (line) => {
  const ts = new Date().toISOString().slice(11, 19);
  const text = `[${ts}] ${line}`;
  fs.appendFileSync(LOG_FILE, text + "\n");
};

const browser = await chromium.launch({
  channel: "chrome",
  headless: false,
  args: ["--no-sandbox", "--window-size=1680,1010"],
});

const context = await browser.newContext({
  viewport: { width: 1680, height: 1010 },
  ignoreHTTPSErrors: true,
});
const page = await context.newPage();

page.on("console", (msg) => {
  const text = msg.text().slice(0, 500);
  log(`[console.${msg.type()}] ${text}`);
});
page.on("pageerror", (err) => {
  log(`[pageerror] ${err.message}`);
});
page.on("requestfailed", (req) => {
  const failure = req.failure()?.errorText ?? "?";
  log(`[requestfailed] ${req.method()} ${req.url()} (${failure})`);
});
page.on("response", (res) => {
  if (res.status() >= 400) log(`[response.${res.status()}] ${res.url()}`);
});
page.on("dialog", async (dialog) => {
  log(`[dialog.${dialog.type()}] ${dialog.message()}`);
  await dialog.dismiss().catch(() => {});
});

log(`[bridge] opening ${URL_TO_OPEN}`);

try {
  await page.goto(URL_TO_OPEN, { waitUntil: "domcontentloaded", timeout: 30000 });
} catch (error) {
  log(`[bridge] goto failed: ${error.message}`);
}

log(`[bridge] ready. title="${await page.title()}"`);

let shot = 0;
const snap = async () => {
  shot += 1;
  const stamp = new Date().toISOString().replace(/[:.]/g, "").slice(0, 12);
  try {
    const file = path.join(SCREENS_DIR, `screen-${String(shot).padStart(3, "0")}.png`);
    await page.screenshot({ path: file });
    fs.writeFileSync(path.join(SCREENS_DIR, "screen.png"), fs.readFileSync(file));
    log(`[screenshot] ${file}`);
  } catch (error) {
    log(`[screenshot-fail] ${error.message}`);
  }
};

setTimeout(snap, 1000).unref();
setInterval(snap, 2500).unref();

process.on("SIGTERM", () => {
  log("[bridge] terminated");
  process.exit(0);
});
process.on("exit", () => {
  try {
    void browser.close();
  } catch {}
});
