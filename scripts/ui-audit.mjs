import { chromium } from "playwright-core";

const BASE = process.env.UI_AUDIT_BASE || "http://localhost:3000";
const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "laptop", width: 1024, height: 768 },
  { name: "mobile", width: 390, height: 844 },
];
const ROUTES = ["/", "/practice"];

const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: ["--no-sandbox", "--disable-gpu"],
});

const report = [];

for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console: ${m.text()}`);
  });

  for (const route of ROUTES) {
    await page.goto(BASE + route, { waitUntil: "networkidle" });
    await page.waitForTimeout(900); // let entrance/choreography settle

    const slug = route === "/" ? "home" : "practice";
    await page.screenshot({
      path: `/tmp/opencode/ui-${vp.name}-${slug}.png`,
      fullPage: true,
    });

    const metrics = await page.evaluate(() => {
      const labToSrgb = (L, A, B) => {
        const fy = (L + 16) / 116;
        const fx = A / 500 + fy;
        const fz = fy - B / 200;
        const finv = (t) => {
          const d = 6 / 29;
          return t > d ? t * t * t : 3 * d * d * (t - 4 / 29);
        };
        const X = finv(fx) * 0.96422;
        const Y = finv(fy);
        const Z = finv(fz) * 0.82521;
        const lin = [
          3.1338561 * X - 1.6168667 * Y - 0.4906146 * Z,
          -0.9787684 * X + 1.9161415 * Y + 0.033454 * Z,
          0.0719453 * X - 0.2289914 * Y + 1.4052427 * Z,
        ];
        return lin.map((v) => {
          const c = Math.max(0, Math.min(1, v));
          return Math.round(255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055));
        });
      };
      const parseColor = (c) => {
        if (!c || c === "transparent") return null;
        const rgb = c.match(/rgba?\(([^)]+)\)/);
        if (rgb) {
          const parts = rgb[1].split(",").map((x) => parseFloat(x.trim()));
          return { r: parts[0], g: parts[1], b: parts[2], a: parts[3] ?? 1 };
        }
        const lab = c.match(/lab\(([^)]+)\)/);
        if (lab) {
          const parts = lab[1].split(/[\s/]+/).filter(Boolean).map(parseFloat);
          const [r, g, b] = labToSrgb(parts[0], parts[1], parts[2]);
          return { r, g, b, a: parts[3] ?? 1 };
        }
        const oklch = c.match(/oklch\(([^)]+)\)/);
        if (oklch) {
          const parts = oklch[1].split(/[\s/]+/).filter(Boolean);
          const L = parseFloat(parts[0]);
          const C = parseFloat(parts[1]);
          const H = parseFloat(parts[2]);
          const a = C * Math.cos((H * Math.PI) / 180);
          const bb = C * Math.sin((H * Math.PI) / 180);
          const l_ = L + 0.3963377774 * a + 0.2158037573 * bb;
          const m_ = L - 0.1055613458 * a - 0.0638541728 * bb;
          const s_ = L - 0.0894841775 * a - 1.291485548 * bb;
          const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
          const lin = [
            4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
            -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
            -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
          ];
          const [r, g, b] = lin.map((v) => {
            const cc = Math.max(0, Math.min(1, v));
            return Math.round(255 * (cc <= 0.0031308 ? 12.92 * cc : 1.055 * Math.pow(cc, 1 / 2.4) - 0.055));
          });
          return { r, g, b, a: 1 };
        }
        return null;
      };
      const lum = (c) => {
        const f = (v) => {
          v /= 255;
          return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        };
        return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
      };
      const ratio = (a, b) => {
        const l1 = lum(a);
        const l2 = lum(b);
        return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      };
      const effectiveBg = (el) => {
        let node = el;
        while (node) {
          const c = parseColor(getComputedStyle(node).backgroundColor);
          if (c && c.a > 0.85) return c;
          node = node.parentElement;
        }
        return { r: 9, g: 9, b: 11, a: 1 };
      };

      const all = [...document.querySelectorAll("body *")];
      const overflowing = [];
      const clipped = [];
      const smallTargets = [];
      const lowContrast = [];
      const unnamedButtons = [];

      for (const el of all) {
        const cs = getComputedStyle(el);
        if (cs.display === "none" || cs.visibility === "hidden") continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) continue;
        const desc = `${el.tagName.toLowerCase()}${el.className && typeof el.className === "string" ? "." + el.className.split(/\s+/).slice(0, 3).join(".") : ""}`;

        if (r.right > window.innerWidth + 1 || r.left < -1) {
          overflowing.push({
            el: desc,
            left: Math.round(r.left),
            right: Math.round(r.right),
          });
        }

        const text = (el.textContent || "").trim();
        const directText = [...el.childNodes]
          .filter((n) => n.nodeType === Node.TEXT_NODE)
          .map((n) => n.textContent.trim())
          .join(" ")
          .trim();
        if (
          directText.length > 2 &&
          el.scrollWidth > el.clientWidth + 2 &&
          ["hidden", "clip"].includes(cs.overflowX)
        ) {
          clipped.push({ el: desc, text: directText.slice(0, 48) });
        }

        if (directText.length > 0) {
          const fg = parseColor(cs.color);
          const bg = effectiveBg(el);
          if (fg && fg.a > 0.5) {
            const cr = ratio(fg, bg);
            const size = parseFloat(cs.fontSize);
            const weight = parseInt(cs.fontWeight, 10) || 400;
            const large = size >= 24 || (size >= 18.66 && weight >= 700);
            const min = large ? 3 : 4.5;
            if (cr < min) {
              lowContrast.push({
                el: desc,
                text: directText.slice(0, 48),
                ratio: Math.round(cr * 100) / 100,
                color: cs.color,
                size,
              });
            }
          }
        }

        if (el.matches("button, a, [role=button], input, select, textarea")) {
          if (r.width < 24 || r.height < 24) {
            smallTargets.push({
              el: desc,
              w: Math.round(r.width),
              h: Math.round(r.height),
            });
          }
          const name =
            el.getAttribute("aria-label") ||
            el.getAttribute("title") ||
            (el.textContent || "").trim();
          if (!name && el.tagName !== "INPUT") {
            unnamedButtons.push({ el: desc });
          }
        }
      }

      const headings = [...document.querySelectorAll("h1,h2,h3")]
        .map((h) => `${h.tagName}: ${(h.textContent || "").trim().slice(0, 60)}`)
        .slice(0, 12);

      return {
        docScrollWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
        docScrollHeight: document.documentElement.scrollHeight,
        viewportHeight: window.innerHeight,
        overflowing: overflowing.slice(0, 12),
        overflowCount: overflowing.length,
        clipped: clipped.slice(0, 12),
        clippedCount: clipped.length,
        smallTargets: smallTargets.slice(0, 12),
        smallTargetCount: smallTargets.length,
        unnamedButtons: unnamedButtons.slice(0, 12),
        unnamedButtonCount: unnamedButtons.length,
        lowContrast: lowContrast
          .sort((a, b) => a.ratio - b.ratio)
          .slice(0, 14),
        lowContrastCount: lowContrast.length,
        headings,
      };
    });

    report.push({ vp: vp.name, route: slug, errors: [...errors], ...metrics });
    errors.length = 0;
  }
  await ctx.close();
}
await browser.close();

console.log(JSON.stringify(report, null, 2));
