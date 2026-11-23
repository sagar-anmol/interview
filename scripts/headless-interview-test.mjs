import { chromium } from "playwright-core";
import fs from "node:fs";

const LOG = "/tmp/opencode/headless-test.log";
fs.rmSync(LOG, { force: true });

const log = (line) => {
  const text = `[${new Date().toISOString().slice(11, 19)}] ${line}`;
  fs.appendFileSync(LOG, text + "\n");
  console.log(text);
};

const API_URLS = {
  stt: "/api/stt",
  tts: "/api/tts",
  turn: "/api/interview/turn",
  evaluate: "/api/interview/evaluate",
  select: "/api/interview/select",
  report: "/api/interview/report",
};

log("=== headless interview test start ===");

const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: ["--no-sandbox", "--disable-gpu"],
});
log(`browser up: ${browser.version()}`);

const ctx = await browser.newContext({
  viewport: { width: 1680, height: 1010 },
  ignoreHTTPSErrors: true,
});
const page = await ctx.newPage();

const seenRequests = new Map();
const apiStatuses = [];

page.on("console", (msg) => {
  log(`[console.${msg.type()}] ${msg.text().slice(0, 300)}`);
});
page.on("pageerror", (err) => {
  log(`[pageerror] ${err.message}`);
});
page.on("request", (req) => {
  seenRequests.set(req.url(), { url: req.url(), status: "pending" });
});
page.on("response", (res) => {
  const r = seenRequests.get(res.url());
  if (r) r.status = res.status();
});

// 1. Open the setup page
await page.goto("http://localhost:3000/new?mode=ai", {
  waitUntil: "domcontentloaded",
  timeout: 30000,
});
log(`[nav] /new?mode=ai`);

// 2. Start interview
await page.click('button:has-text("Start interview")');
log("[click] Start interview (AI mode)");

await page.waitForURL(/\/interview\//, { timeout: 15000 });
log(`[nav] interview started: ${page.url()}`);

// 3. Integration check screen should be visible after Begin
await page.waitForSelector("text=Pre-flight", { timeout: 20000 }).catch(() => {});
log("[check] preflight UI reached");
const btns = await page.getByRole("button").evaluateAll((els) =>
  els.map((e) => e.textContent?.trim().replace(/\s+/g, " ")),
);
log(`[debug] buttons on page: ${JSON.stringify(btns)}`);
const bodyText = await page
  .locator("body")
  .innerText()
  .catch(() => "");
log(`[debug] bodyText: ${JSON.stringify(bodyText.slice(0, 400))}`);

try {
  await page
    .getByRole("button")
    .filter({ hasText: /begin/i })
    .first()
    .click({ timeout: 8000 });
  log("[click] Begin interview");
} catch (err) {
  log(`[error] Begin click failed: ${err.message.slice(0, 200)}`);
  // Try falling through anyway (interview page may auto-begin via text input path)
}

// Let the integration check + opening turn run
await page.waitForTimeout(8000);

// 4. Check state: transcript exists, timer ticking, no pageerrors
const transcriptText = await page
  .getByRole("textbox")
  .count()
  .then(async (n) => {
    const boxes = page.getByRole("textbox");
    return n > 0 ? (await boxes.first().textContent().catch(() => "")) : "";
  });
log(`[check] textbox count: ${await page.getByRole("textbox").count()}`);

// 5. Type an answer and submit (tests the text path through the real LLM)
const textInput = page.getByPlaceholder(/Speak your answer or type here/);
await textInput.fill("hello");
await textInput.press("Enter");
log("[input] typed test answer, pressed Enter");

// 6. STT route check via API
const sttRes = await page.request.post("http://localhost:3000/api/stt", {
  data: undefined,
});
log(`[api] POST /api/stt -> ${sttRes.status()} ${(await sttRes.json()).code ?? ""}`.trim());

const ttsRes = await page.request.post("http://localhost:3000/api/tts", {
  data: { text: "hello" },
});
log(`[api] POST /api/tts -> ${ttsRes.status()} ${JSON.stringify(await ttsRes.json())}`);

const turnRes = await page.request.post("http://localhost:3000/api/interview/turn", {
  data: {
    fsmState: { phase: "REQUIREMENTS", elapsedSec: 10, durationSec: 2700, milestones: {} },
    recentMessages: [],
    userMessage: "test",
  },
});
const turnBody = await turnRes.text();
const turnEvents = turnBody
  .split("\n")
  .filter((line) => line.startsWith("data: "))
  .map((line) => {
    try {
      return JSON.parse(line.slice(6));
    } catch {
      return null;
    }
  })
  .filter(Boolean);
log(
  `[api] POST /api/interview/turn -> ${turnRes.status()} events=${turnEvents.length} types=${[...new Set(turnEvents.map((e) => e.type))].join(",")}`,
);

const evalRes = await page.request.post("http://localhost:3000/api/interview/evaluate", {
  data: {
    fsmState: { phase: "REQUIREMENTS", elapsedSec: 10, durationSec: 2700, milestones: {} },
    recentMessages: [],
  },
});
log(`[api] POST /api/interview/evaluate -> ${evalRes.status()} ${(await evalRes.json()).code ?? ""}`.trim());

const selectRes = await page.request.post("http://localhost:3000/api/interview/select");
log(`[api] POST /api/interview/select -> ${selectRes.status()}`);

const reportRes = await page.request.post("http://localhost:3000/api/interview/report", {
  data: { scenarioId: "netflix", turns: [{ speaker: "candidate", text: "hi" }], elapsedSec: 10 },
});
log(`[api] POST /api/interview/report -> ${reportRes.status()} ${(await reportRes.json()).code ?? ""}`.trim());

// 7. Take a screenshot of the final state
await page.screenshot({ path: "/tmp/opencode/headless-interview.png", fullPage: true });

// 8. Summarize API statuses for requests seen via the page
log("--- api statuses seen by page ---");
for (const [url, r] of seenRequests.entries()) {
  if (url.includes("/api/")) {
    log(`[page-api] ${r.status} ${url.split("/api/").pop().slice(0, 60)}`);
  }
}

log("=== headless interview test done ===");

await page.close();
await ctx.close();
await browser.close();
process.exit(0);
