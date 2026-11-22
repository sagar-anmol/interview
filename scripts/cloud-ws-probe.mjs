import { chromium } from "playwright-core";

const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage();
const out = await page.evaluate(async () => {
  const tryWs = (url) =>
    new Promise((resolve) => {
      const ws = new WebSocket(url);
      const t = setTimeout(() => resolve("TIMEOUT"), 8000);
      ws.onopen = () => {
        clearTimeout(t);
        ws.close();
        resolve("OPEN");
      };
      ws.onerror = () => {
        clearTimeout(t);
        resolve("ERR");
      };
      ws.onclose = (e) => {
        clearTimeout(t);
        resolve("CLOSE " + e.code + " " + e.reason);
      };
    });
  return {
    "0.peerjs.com/peerjs": await tryWs("wss://0.peerjs.com/peerjs?key=peerjs"),
    "peerjs.com/peerjs": await tryWs("wss://peerjs.com/peerjs?key=peerjs"),
    "peerjs.com/root": await tryWs("wss://peerjs.com"),
    "0.peerjs.com:9006/peerjs": await tryWs("wss://0.peerjs.com:9006/peerjs"),
  };
});
console.log(out);
await browser.close();
process.exit(0);
