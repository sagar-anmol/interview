import { chromium } from "playwright-core";
import { readFileSync } from "node:fs";

const bundle = readFileSync(
  "/home/sagaranmol/cl/interview/node_modules/peerjs/dist/peerjs.js",
  "utf8",
);

const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
page.on("console", (m) => console.log("[page]", m.text().slice(0, 300)));
page.on("pageerror", (e) => console.log("[pageerror]", String(e).slice(0, 300)));

await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" });
await page.addScriptTag({ content: bundle });

const result = await page.evaluate(async () => {
  const out = [];
  const { Peer } = window.peerjs ?? ({});
  out.push(`has Peer: ${Boolean(Peer)}`);
  if (!Peer) return out;
  try {
    const peer = new Peer("sdih-TESTXXX-host", {
      host: "localhost",
      port: 9000,
      path: "/peerjs",
      key: "peerjs",
      secure: false,
    });
    peer.on("open", () => out.push("peer.open"));
    peer.on("error", (e) => out.push(`peer.error ${e?.message ?? e}`));
    peer.on("close", () => out.push("peer.close"));
    await new Promise((resolve) => setTimeout(resolve, 4000));
    const socket = peer._socket;
    out.push(`socket.readyState=${socket?.readyState}`);
    try {
      const conn = peer.connect("sdih-TESTXXX-candidate2");
      conn.on("open", () => out.push("conn.open"));
      conn.on("error", (e) => out.push(`conn.error ${e?.message ?? e}`));
    } catch (e) {
      out.push(`connect threw ${e}`);
    }
    peer.destroy();
  } catch (e) {
    out.push(`fatal ${e}`);
  }
  return out;
});

console.log(result.join("\n"));
await browser.close();
process.exit(0);
