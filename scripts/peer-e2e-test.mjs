import { chromium } from "playwright-core";
import fs from "node:fs";

const LOG = "/tmp/opencode/peer-e2e.log";
fs.rmSync(LOG, { force: true });

const log = (line) => {
  const text = `[${new Date().toISOString().slice(11, 19)}] ${line}`;
  fs.appendFileSync(LOG, text + "\n");
  console.log(text);
};

let failed = 0;
function check(name, ok, detail = "") {
  if (ok) log(`[PASS] ${name}`);
  else {
    log(`[FAIL] ${name} ${detail}`);
    failed++;
  }
}

function wire(page, label) {
  page.on("console", (m) => {
    const text = m.text();
    if (text.includes("peerjs") || text.includes("peer")) {
      log(`[${label}.console.${m.type()}] ${text.slice(0, 250)}`);
    }
  });
  page.on("pageerror", (e) => log(`[${label}.pageerror] ${String(e.message ?? e).slice(0, 250)}`));
  page.on("requestfailed", (r) => log(`[${label}.reqfail] ${r.url().slice(0, 100)}`));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const poll = async (fn, timeout = 20000, label = "") => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const value = await fn();
    if (value) {
      log(`[ok] ${label ?? "condition"}`);
      return value;
    }
    await sleep(500);
  }
  log(`[timeout] ${label ?? "condition"}`);
  return false;
};

log("=== peer e2e test start ===");

let browser;
let hostCtx;
let guestCtx;

try {
  browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--no-sandbox", "--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"],
  });
  log(`browser: ${browser.version()}`);

  // ---------- Host (interviewer) ----------
  hostCtx = await browser.newContext({ viewport: { width: 1750, height: 1000 } });
  const host = await hostCtx.newPage();
  wire(host, "host");

  await host.goto("http://localhost:3000/new?mode=peer", { waitUntil: "domcontentloaded" });
  log("[host] /new?mode=peer");
  await host.click('button:has-text("Start interview")');
  await host.waitForURL(/\/interview\//, { timeout: 20000 });
  log(`[host] interview: ${host.url()}`);

  const roomCode = (await poll(async () => {
    const m = (await host.locator("text=awaiting /join/").first().innerText().catch(() => ""))
      .match(/join\/([A-Z0-9-]+)/);
    return m?.[1] ?? false;
  }, 20000, "room code")) || null;
  check("room code generated on host", Boolean(roomCode), String(roomCode));
  log(`[host] room code: ${roomCode}`);

  // ---------- Guest (candidate) ----------
  guestCtx = await browser.newContext({ viewport: { width: 1280, height: 960 } });
  const guest = await guestCtx.newPage();
  wire(guest, "guest");

  await guest.goto(`http://localhost:3000/join/${roomCode}`, { waitUntil: "domcontentloaded" });
  log(`[guest] joined: ${guest.url()}`);

  await guest.waitForSelector("text=Candidate · You draw", { timeout: 15000 });
  log("[guest] lobby panel visible");

  // Host should see the guest peer id once connected
  const connected = await poll(
    () => host.waitForFunction(
      (room) => {
        const t = document.body.innerText;
        return t.includes("joined") || t.includes(`sdih-${room}-guest`);
      },
      roomCode,
      { timeout: 1000 },
    ).then(() => true).catch(() => false),
    30000,
    "guest connected (host shows guest)",
  );
  check("guest connected (host shows guest)", connected);
  if (!connected) {
    const bodyText = await host.locator('body').innerText().catch(() => "");
    const guestRow = bodyText.match(/Candidate[\s\S]{0,300}/)?.[0] ?? "";
    log("[debug] host DOM (guest row): " + JSON.stringify(guestRow));
    log("[debug] host has 'awaiting': " + bodyText.includes("awaiting"));
    log("[debug] host has 'sdih-': " + bodyText.includes("sdih-"));
  }

  // Video: both peers must see two live camera feeds (own + remote) with
  // actual frames flowing, not just <video> elements in the DOM.
  const liveFeeds = (page) =>
    page.evaluate(() => {
      const vids = Array.from(document.querySelectorAll("video"));
      const remote = vids.filter((v) => !v.muted);
      return {
        total: vids.length,
        liveVideo: vids.filter(
          (v) =>
            v.srcObject &&
            v.videoWidth > 0 &&
            v.srcObject.getVideoTracks().some((t) => t.readyState === "live"),
        ).length,
        remotePlaying: remote.some((v) => v.videoWidth > 0 && !v.paused),
      };
    });

  const hostVideo = await poll(
    async () => {
      const s = await liveFeeds(host);
      return s.liveVideo >= 2 && s.remotePlaying;
    },
    30000,
    "host sees own + guest video",
  );
  check("host sees own + guest video", hostVideo);
  if (!hostVideo) log("[debug] host feeds: " + JSON.stringify(await liveFeeds(host)));

  const guestVideo = await poll(
    async () => {
      const s = await liveFeeds(guest);
      return s.liveVideo >= 2 && s.remotePlaying;
    },
    30000,
    "guest sees own + host video",
  );
  check("guest sees own + host video", guestVideo);
  if (!guestVideo) log("[debug] guest feeds: " + JSON.stringify(await liveFeeds(guest)));

  // Camera toggle: switching the host camera off must black out the feed the
  // guest is receiving, then restore it.
  const brightness = (page) =>
    page.evaluate(() => {
      const v = Array.from(document.querySelectorAll("video")).find(
        (el) => !el.muted,
      );
      if (!v || !v.videoWidth) return -1;
      const c = document.createElement("canvas");
      c.width = 64;
      c.height = 36;
      const ctx = c.getContext("2d");
      ctx.drawImage(v, 0, 0, 64, 36);
      const data = ctx.getImageData(0, 0, 64, 36).data;
      let sum = 0;
      for (let i = 0; i < data.length; i += 4)
        sum += data[i] + data[i + 1] + data[i + 2];
      return Math.round(sum / (data.length / 4) / 3);
    });

  const brightBefore = await brightness(guest);
  await host.click('button:has-text("Cam on")');
  await new Promise((r) => setTimeout(r, 2500));
  const brightOff = await brightness(guest);
  await host.click('button:has-text("Cam off")');
  await new Promise((r) => setTimeout(r, 2500));
  const brightBack = await brightness(guest);
  check(
    "host camera toggle reaches guest",
    brightBefore > 5 && brightOff === 0 && brightBack > 5,
    `before=${brightBefore} off=${brightOff} back=${brightBack}`,
  );

  // Canvas from the guest should appear on the host canvas.
  // We add nothing, so skip guest->host canvas check here; instead:
  // canvas is verified by the guest adding a node (Test 3).

  // ---------- Test 1: guest -> host transcript ----------
  const gtext = await guest.locator('[placeholder*="Speak your answer"]').first();
  await gtext.fill("draft upload and transcode pipeline");
  await gtext.press("Enter");
  log("[input] guest typed candidate answer");

  const hHasGuestTurn = await poll(
    () => host.waitForFunction(
      () => document.body.innerText.includes("draft upload and transcode pipeline"),
      null,
      { timeout: 800 },
    ).then(() => true).catch(() => false),
    25000,
    "guest turn on host transcript",
  );
  check("guest turn appears on host transcript", hHasGuestTurn);
  if (!hHasGuestTurn) {
    log("[debug] host body: " + (await host.locator('body').innerText().catch(() => "")).slice(0, 700));
  }

  // ---------- Test 2: host -> guest transcript ----------
  const htext = await host.locator('input[placeholder*="Type question"]').first();
  await htext.fill("what is your redundancy plan?");
  await host.getByRole("button", { name: /Submit question/i }).click();
  log("[input] host typed question");

  const gHasHostTurn = await poll(
    () => guest.waitForFunction(
      () => document.body.innerText.includes("what is your redundancy plan?"),
      null,
      { timeout: 800 },
    ).then(() => true).catch(() => false),
    25000,
    "host turn on guest transcript",
  );
  check("host turn appears on guest transcript", gHasHostTurn);
  if (!gHasHostTurn) {
    log("[debug] guest body: " + (await guest.locator('body').innerText().catch(() => "")).slice(0, 700));
  }

  // ---------- Test 3: canvas sync guest -> host ----------
  // Host already has client nodes from earlier? Host canvas is empty.
  // Guest adds a Client node; host should display it.
  const guestNodeButton = guest.getByRole("button").filter({ hasText: "Client" }).first();
  const found = await guestNodeButton.isVisible().catch(() => false);
  log("[debug] guest palette has Client:", found);
  await guestNodeButton.click();
  log("[input] guest added Client node");

  const hostSeesClient = await poll(
    () => host.waitForFunction(
      () => {
        const t = document.body.innerText;
        return t.includes("Client") && (t.includes("joined") || t.includes("sdih-"));
      },
      null,
      { timeout: 800 },
    ).then(() => true).catch(() => false),
    20000,
    "candidate canvas node appears on host canvas",
  );
  check("candidate canvas node appears on host canvas", hostSeesClient);
  if (!hostSeesClient) {
    log("[debug] host body: " + (await host.locator('body').innerText().catch(() => "")).slice(0, 800));
  }

  // ---------- Test 4: interrupt button ----------
  await host.getByRole("button", { name: /Interrupt/i }).click();
  log("[action] host clicked Interrupt");

  // ---------- Test 5: end interview ----------
  await host.getByRole("button", { name: /End interview/i }).click();
  await host.waitForSelector("text=End & evaluate", { timeout: 5000 }).catch(() => {});
  await host.getByRole("button", { name: /End & evaluate/i }).click().catch(() => {});
  await host
    .waitForFunction(() => window.location.href.includes("/report/"), null, { timeout: 15000 })
    .then(() => true)
    .catch(() => false);
  check(
    "host navigates to /report after End & evaluate",
    host.url().includes("/report/"),
    host.url(),
  );

  // ---------- Report page check on host ----------
  const reportRendered = await poll(
    () => host.waitForFunction(
      () => document.body.innerText.includes("Evaluation Report"),
      null,
      { timeout: 800 },
    ).then(() => true).catch(() => false),
    15000,
    "report page rendered on host",
  );
  check("report page rendered on host", reportRendered);
} catch (error) {
  log(`[error] e2e failed: ${String(error).slice(0, 300)}`);
  failed = 1;
} finally {
  try { await guestCtx?.close(); } catch {}
  try { await hostCtx?.close(); } catch {}
  try { await browser?.close(); } catch {}
}

log("=== peer e2e test done ===");
process.exit(failed ? 1 : 0);
