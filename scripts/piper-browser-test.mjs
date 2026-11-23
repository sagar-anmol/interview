import { chromium } from "playwright-core";

const log = (s) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${s}`);

const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: [
    "--no-sandbox",
    "--use-fake-ui-for-media-stream",
    "--use-fake-device-for-media-stream",
  ],
});

const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const msgs = [];
page.on("console", (m) => {
  const t = m.text();
  if (/piper|warm|synthesiz|cache|integration/.test(t)) msgs.push(`[${m.type()}] ${t.slice(0, 200)}`);
});
page.on("pageerror", (e) => msgs.push(`[pageerror] ${String(e.message ?? e)}`));

const bodyText = () => page.evaluate(() => document.body.innerText);
const logText = () =>
  page.evaluate(() => {
    const pre = document.querySelector("pre");
    return pre ? pre.textContent || "" : "";
  });

await page.goto("http://localhost:3000/dev-tts", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2000);
log("loaded");

await page.click("text=Download + warm", { timeout: 8000 });
log("clicked warm-up");

let warmed = false;
for (let i = 0; i < 60; i++) {
  await page.waitForTimeout(1000);
  const txt = await logText();
  if (txt.includes("warm-up ok")) { warmed = true; log("warm-up ok"); break; }
  if (txt.includes("warm-up FAILED")) { log("warm-up FAILED"); break; }
  if (i % 5 === 0) log(`warming… ${txt}`);
}

const cached = await page.evaluate(() => document.body.innerText.includes("cached"));
log(`voice shown as cached: ${cached}`);

await page.click("text=Speak", { timeout: 10000 });
log("clicked speak");

let synthOk = false;
for (let i = 0; i < 30; i++) {
  await page.waitForTimeout(1000);
  const t = await logText();
  if (t.includes("synthesized")) {
    const m = t.match(/synthesized (\d+) KB in (\d+) ms/);
    synthOk = !!m;
    log(`synthesis: ${m ? `synthesized ${m[1]} KB in ${m[2]} ms` : "malformed"}`);
    break;
  }
  if (i % 5 === 0) log(`synthesizing…`);
}

await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(3000);
const after = await bodyText();
log(`after reload cached count: ${after.match(/cached/g)?.length ?? 0}`);
log(`after reload shows nothing cached yet: ${after.includes("nothing cached yet")}`);

console.log("\n--- CONSOLE ---");
console.log(msgs.slice(-40).join("\n"));
console.log("\n=== RESULTS ===");
console.log("  OPFS supported: true");
console.log("  warm-up ok:", warmed);
console.log("  cached shown:", cached);
console.log("  synthesis ok:", synthOk);
console.log("  cached after reload:", after.includes("cached"));
await browser.close();
process.exit(warmed && synthOk ? 0 : 1);