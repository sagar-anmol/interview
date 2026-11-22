import { chromium } from "playwright-core";

const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage();

await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" });
console.log("at", page.url());

const result = await page.evaluate(async () => {
  return await new Promise((resolve) => {
    const ws = new WebSocket("ws://localhost:9000/peerjs/peerjs?key=peerjs&id=apptest1");
    const t = setTimeout(() => resolve("TIMEOUT"), 6000);
    ws.onopen = () => {
      clearTimeout(t);
      resolve("OPEN");
    };
    ws.onerror = () => {
      clearTimeout(t);
      resolve("ERR");
    };
    ws.onclose = (e) => {
      clearTimeout(t);
      resolve(`CLOSE ${e.code} ${e.reason}`);
    };
  });
});

console.log("app-origin ws result:", result);
await browser.close();
process.exit(0);
