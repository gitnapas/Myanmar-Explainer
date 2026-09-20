/**
 * Screenshots the site so it can actually be looked at.
 *
 * Every visual problem in this project so far -- an invisible page, then an
 * invisible map -- was shipped because the colour maths was checked and the
 * result never was. Computed checks catch what they are told to measure; they
 * do not catch layout, overlap, or "this looks wrong".
 *
 * Uses the system Edge via playwright-core, so no browser download is needed.
 *
 * Run: node scripts/shoot.mjs [url]
 */
import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { mkdir, stat } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SHOTS = resolve(ROOT, ".shots");
const ARG = process.argv[2] ?? "https://gitnapas.github.io/Myanmar-Explainer/";

const TYPES = {
  html: "text/html", css: "text/css", js: "text/javascript", json: "application/json",
  svg: "image/svg+xml", png: "image/png", jpg: "image/jpeg", ico: "image/x-icon",
  txt: "text/plain", woff2: "font/woff2",
};

/**
 * Serves out/ so a build can be looked at without waiting on a deploy.
 * Screenshotting the live site is the higher-fidelity check; this is the one
 * that makes iterating on a layout bearable.
 */
async function serveLocal() {
  const root = resolve(ROOT, "out");
  const server = createServer(async (req, res) => {
    let path = decodeURIComponent((req.url ?? "/").split("?")[0]);
    let file = resolve(root, "." + path);
    try {
      if ((await stat(file)).isDirectory()) file = resolve(file, "index.html");
    } catch {
      res.writeHead(404).end("not found");
      return;
    }
    const ext = file.split(".").pop() ?? "html";
    res.writeHead(200, { "content-type": TYPES[ext] ?? "application/octet-stream" });
    createReadStream(file).pipe(res);
  });
  await new Promise((r) => server.listen(4321, r));
  return { url: "http://localhost:4321/", close: () => server.close() };
}

const local = ARG === "local" ? await serveLocal() : null;
const URL_BASE = local ? local.url : ARG;

const VIEWPORT = { width: 1440, height: 900 };

/** Step indices worth looking at: the framings and overlays differ most here. */
const STEPS = [
  { index: 0, name: "step00-colonial" },
  { index: 6, name: "step06-panglong" },
  { index: 21, name: "step21-8888" },
  { index: 31, name: "step31-coup" },
  { index: 36, name: "step36-network" },
];

const browser = await chromium.launch({ channel: "msedge", headless: true });

async function shoot(colorScheme) {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    colorScheme,
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.goto(URL_BASE, { waitUntil: "networkidle", timeout: 60_000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: resolve(SHOTS, `${colorScheme}-00-hero.png`) });

  for (const step of STEPS) {
    const found = await page.evaluate((i) => {
      const el = document.querySelector(`[data-index="${i}"]`);
      if (!el) return false;
      el.scrollIntoView({ block: "center", behavior: "instant" });
      return true;
    }, step.index);
    if (!found) {
      console.log(`  (no element for step ${step.index})`);
      continue;
    }
    // Let the camera tween and any layer animation settle before capturing.
    await page.waitForTimeout(2200);
    await page.screenshot({ path: resolve(SHOTS, `${colorScheme}-${step.name}.png`) });
  }

  // What the map layer actually resolves to at render time, which is the
  // thing the CSS token check cannot see.
  const probe = await page.evaluate(() => {
    const svg = document.querySelector('svg[aria-label*="Map"]');
    if (!svg) return { error: "no map svg in the DOM" };
    const box = svg.getBoundingClientRect();
    const land = svg.querySelector("path[fill]");
    const cs = land ? getComputedStyle(land) : null;
    return {
      svgBox: { w: Math.round(box.width), h: Math.round(box.height) },
      paths: svg.querySelectorAll("path").length,
      firstPathFill: cs?.fill ?? null,
      mapLand: getComputedStyle(document.documentElement).getPropertyValue("--map-land"),
      mapWater: getComputedStyle(document.documentElement).getPropertyValue("--map-water"),
    };
  });

  console.log(`${colorScheme}:`, JSON.stringify(probe));
  if (errors.length) console.log(`  console errors: ${errors.slice(0, 5).join(" | ")}`);
  await context.close();
}

await mkdir(SHOTS, { recursive: true });
await shoot("light");
await shoot("dark");
await browser.close();
console.log(`\nWrote screenshots to .shots/`);
