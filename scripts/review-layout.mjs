/**
 * Exercise the production export under its real Pages prefix.
 * Run: node scripts/review-layout.mjs [public URL]
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { chromium } from "playwright-core";

const root = resolve("out");
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".json": "application/json", ".woff2": "font/woff2", ".png": "image/png", ".jpg": "image/jpeg" };
const server = process.argv[2] ? null : createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const local = decodeURIComponent(url.pathname).replace(/^\/Myanmar-Explainer/, "");
  let file = resolve(root, "." + (local || "/"));
  if (local.endsWith("/") || local === "") file = resolve(file, "index.html");
  if (!file.startsWith(root + sep)) { res.writeHead(403).end(); return; }
  try { res.setHeader("Content-Type", types[extname(file)] ?? "application/octet-stream"); res.end(await readFile(file)); }
  catch { res.writeHead(404).end(); }
});
if (server) await new Promise(resolve => server.listen(4322, "127.0.0.1", resolve));
const base = process.argv[2] ?? "http://127.0.0.1:4322/Myanmar-Explainer/";
const browser = await chromium.launch({ channel: "msedge", headless: true });
const results = [];
try {
  for (const [width, height] of [[1440, 900], [900, 700], [390, 844], [320, 568], [740, 390]]) {
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion: "reduce" });
    const errors = [];
    page.on("pageerror", error => errors.push(String(error)));
    page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
    page.on("response", response => { if (response.status() >= 400) errors.push(response.status() + " " + response.url()); });
    await page.goto(base, { waitUntil: "networkidle" });
    await page.getByRole("link", { name: "Explore the history" }).click();
    await page.waitForTimeout(150);
    await page.getByRole("button", { name: "Next event", exact: true }).click();
    await page.waitForTimeout(150);
    const nextActive = await page.locator("section[aria-current=step]").getAttribute("data-index");
    if (nextActive !== "1") errors.push("Next event did not activate step 1: " + nextActive);
    await page.getByRole("button", { name: "Pause motion", exact: true }).click();
    if (await page.locator(".story-shell").getAttribute("data-motion") !== "paused") errors.push("Motion pause failed");
    for (const index of [6, 16, 18, 27, 36]) {
      await page.locator("[data-index='" + index + "']").evaluate(element => {
        const compact = matchMedia("(max-width: 760px)").matches;
        const offset = compact ? document.querySelector(".story-stage").offsetHeight + 20 : 36;
        scrollTo({ top: scrollY + element.getBoundingClientRect().top - offset, behavior: "instant" });
      });
      await page.waitForTimeout(100);
      const active = await page.locator("section[aria-current=step]").getAttribute("data-index");
      if (active !== String(index)) errors.push("Reading position mismatch: " + index + " / " + active);
      if ([6, 27, 36].includes(index)) await page.screenshot({ path: ".shots/layout-" + width + "-" + index + ".png" });
    }
    await page.getByRole("combobox", { name: "Choose a chapter" }).selectOption("iii-1988");
    await page.waitForTimeout(150);
    const chapter = await page.locator("section[aria-current=step]").getAttribute("data-index");
    if (chapter !== "13") errors.push("Chapter navigation failed: " + chapter);
    const geometry = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - innerWidth,
      map: document.querySelector(".story-stage").getBoundingClientRect().toJSON(),
      navigation: document.querySelector(".story-navigation").getBoundingClientRect().toJSON(),
      active: document.querySelector("section[aria-current=step]")?.getAttribute("data-index"),
      reducedMotion: [...document.querySelectorAll(".story-shell *")].some(element => getComputedStyle(element).animationName !== "none"),
    }));
    if (geometry.overflow > 1) errors.push("Horizontal overflow: " + geometry.overflow);
    if (geometry.map.y < -1 || geometry.map.bottom > height) errors.push("Map not pinned inside viewport");
    if (geometry.reducedMotion) errors.push("Animation running under reduced motion");
    results.push({ width, height, errors, geometry });
    await page.close();
  }
  const motionPage = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  await motionPage.goto(base, { waitUntil: "networkidle" });
  await motionPage.locator("[data-index='16']").evaluate(element => scrollTo({ top: scrollY + element.getBoundingClientRect().top - 36, behavior: "instant" }));
  await motionPage.waitForTimeout(1000);
  await motionPage.getByRole("button", { name: "Pause motion", exact: true }).click();
  await motionPage.waitForTimeout(200);
  const running = await motionPage.locator(".story-shell").evaluate(element => element.getAnimations({ subtree: true }).filter(animation => animation.playState === "running").length);
  if (running) throw new Error("Animations still running while paused: " + running);
  await motionPage.setViewportSize({ width: 390, height: 844 });
  await motionPage.waitForTimeout(250);
  if (await motionPage.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw new Error("Overflow after resizing");
  await motionPage.getByRole("button", { name: "Play motion", exact: true }).click();
  await motionPage.waitForTimeout(200);
  const resumed = await motionPage.locator(".story-shell").evaluate(element => element.getAnimations({ subtree: true }).some(animation => animation.playState === "running"));
  if (!resumed) throw new Error("Animation did not resume");
  await motionPage.close();
  console.log(JSON.stringify(results, null, 2));
  if (results.some(result => result.errors.length)) process.exitCode = 1;
} finally {
  await browser.close();
  if (server) server.close();
}
