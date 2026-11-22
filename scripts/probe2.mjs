import { chromium } from "playwright-core";
import fs from "node:fs";

const log = (l) => fs.appendFileSync("/tmp/opencode/probe2.log", `[${new Date().toISOString().slice(11, 19)}] ${l}\n`);
fs.rmSync("/tmp/opencode/probe2.log", { force: true });

const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--no-sandbox"] });
const ctx = await browser.newContext({ viewport: { width: 1680, height: 1010 } });
const page = await ctx.newPage();

page.on("pageerror", (e) => log(`[pageerror] ${e.message}`));
page.on("console", (m) => log(`[console.${m.type()}] ${m.text().slice(0, 300)}`));

// Probe IndexedDB right after interview page loads
await page.goto("http://localhost:3000/new?mode=ai", { waitUntil: "domcontentloaded" });
log("[nav] /new");
await page.click('button:has-text("Start interview")');
log("[click] start");

await page.waitForURL(/\/interview\//, { timeout: 15000 });
log(`[nav] ${page.url()}`);

await page.waitForTimeout(5000);

const dbInfo = await page.evaluate(async () => {
  const open = (name) =>
    new Promise((res, rej) => {
      const r = indexedDB.open(name);
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  const out = {
    bodyText: document.body.innerText.slice(0, 300),
  };
  try {
    const db = await open("system-design-interview");
    out.stores = [...db.objectStoreNames];
    const rows = await new Promise((res, rej) => {
      const t = db.transaction("sessions").objectStore("sessions");
      const rq = t.getAll();
      rq.onsuccess = () => res(rq.result);
      rq.onerror = () => rej(rq.error);
    });
    out.sessionIds = rows.map((r) => r.id);
  } catch (e) {
    out.indexedDBError = String(e);
  }
  return out;
});
log(`[db] ${JSON.stringify(dbInfo)}`);

await browser.close();
process.exit(0);
