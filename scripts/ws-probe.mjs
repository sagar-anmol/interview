import { chromium } from "playwright-core";

const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage();

const result = await page.evaluate(async () => {
  return new Promise((resolve) => {
    const tryWs = (url) => {
      const ws = new WebSocket(url);
      const t = setTimeout(() => resolve(`${url} -> TIMEOUT`), 5000);
      ws.onopen = () => {
        clearTimeout(t);
        ws.close();
        resolve(`${url} -> OPEN`);
      };
      ws.onerror = () => {
        clearTimeout(t);
        resolve(`${url} -> ERR`);
      };
      ws.onclose = (e) => {
        clearTimeout(t);
        resolve(`${url} -> CLOSE ${e.code}`);
      };
    };
    // Start the first; on close start the second.
    const ws = new WebSocket("ws://localhost:9000/peerjs/peerjs?key=peerjs&id=wstest1");
    const t = setTimeout(() => {
      ws.onopen = () => tryWs("ws://localhost:9000/peerjs/peerjs?key=peerjs&id=wstest2");
    }, 2500);
    ws.onopen = () => {
      clearTimeout(t);
      ws.close();
      resolve("wstest1 -> OPEN");
    };
    ws.onerror = () => {
      clearTimeout(t);
      resolve("wstest1 -> ERR");
    };
  });
});

console.log(result);
await browser.close();
process.exit(0);
