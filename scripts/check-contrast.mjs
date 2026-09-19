/**
 * Asserts that text stays readable in every era treatment, in both modes.
 *
 * This exists because it already went wrong once. The era treatments used to
 * set surfaces to literal light values with no dark-mode counterpart, so in
 * dark mode a cream surface sat under near-white ink at about 1.02:1 and the
 * entire page rendered invisible. Nothing in the build caught it, because the
 * tokens and the utilities were all individually correct -- only their
 * combination was broken.
 *
 * So the combination is what gets checked. The script resolves the same
 * color-mix the browser will perform, for every era against both bases, and
 * fails the build on anything unreadable.
 */
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const CSS = resolve(dirname(fileURLToPath(import.meta.url)), "../src/app/globals.css");

// --- colour maths ----------------------------------------------------------

const hex = (h) => {
  const v = h.trim().replace("#", "");
  const full = v.length === 3 ? [...v].map((c) => c + c).join("") : v;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
};

const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGamma = (c) => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);

function toOklab([r, g, b]) {
  const [R, G, B] = [toLinear(r), toLinear(g), toLinear(b)];
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function fromOklab([L, A, B]) {
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((c) => Math.min(1, Math.max(0, toGamma(c))));
}

/** The same operation CSS `color-mix(in oklab, a p%, b)` performs. */
function mixOklab(a, b, keepPercent) {
  const t = 1 - keepPercent / 100;
  const A = toOklab(hex(a));
  const B = toOklab(hex(b));
  return fromOklab(A.map((v, i) => v + (B[i] - v) * t));
}

const luminance = ([r, g, b]) =>
  0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);

function contrast(fg, bg) {
  const [a, b] = [luminance(fg), luminance(bg)].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
}

// --- parsing ---------------------------------------------------------------

const css = await readFile(CSS, "utf8");

/** Pulls the custom properties out of the first rule matching a selector. */
function block(selectorPattern) {
  const re = new RegExp(`${selectorPattern}\\s*\\{([^}]*)\\}`);
  const body = css.match(re)?.[1];
  if (!body) throw new Error(`could not find block for ${selectorPattern}`);
  return Object.fromEntries(
    [...body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(([, k, v]) => [k, v.trim()]),
  );
}

const light = block(":root");
// The dark block is matched by position rather than by its selector, which
// contains the quotes and parentheses that make it awkward to express here.
const darkStart = css.indexOf("@media (prefers-color-scheme: dark)");
const darkBody = css.slice(darkStart, css.indexOf("\n  }", darkStart));
const darkOverrides = Object.fromEntries(
  [...darkBody.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(([, k, v]) => [k, v.trim()]),
);
const dark = { ...light, ...darkOverrides };

const eras = [...css.matchAll(/\[data-era="(\w+)"\]\s*\{([^}]*)\}/g)].map(([, name, body]) => ({
  name,
  tint: body.match(/--era-tint\s*:\s*([^;]+);/)?.[1]?.trim(),
  mix: Number(body.match(/--era-mix\s*:\s*(\d+)%/)?.[1] ?? 100),
  /**
   * A surface set as a literal hex on an era. This is the shape of the
   * original bug and must be read, not ignored: a literal has no dark-mode
   * counterpart, so it lands unchanged under whichever ink the mode supplies.
   * Modelling only the tint path would leave this checker blind to the exact
   * failure it was written for.
   */
  literal: body.match(/--paper\s*:\s*(#[0-9a-fA-F]{3,8})\s*;/)?.[1],
}));

// --- checks ----------------------------------------------------------------

/** Body copy needs 4.5:1; the muted tier is large/secondary text at 3:1. */
const PAIRS = [
  { ink: "--ink", min: 4.5, label: "ink" },
  { ink: "--ink-secondary", min: 4.5, label: "ink-secondary" },
  { ink: "--ink-muted", min: 3.0, label: "ink-muted" },
];

const failures = [];
const rows = [];

for (const [mode, tokens] of [
  ["light", light],
  ["dark", dark],
]) {
  const base = tokens["--paper-base"];
  const surfaces = [
    { era: "(none)", color: hex(base) },
    ...eras.map((e) => ({
      era: e.name,
      color: e.literal
        ? hex(e.literal)
        : e.tint
          ? mixOklab(base, e.tint, e.mix)
          : hex(base),
    })),
  ];

  for (const surface of surfaces) {
    for (const pair of PAIRS) {
      const ratio = contrast(hex(tokens[pair.ink]), surface.color);
      rows.push(
        `  ${mode.padEnd(5)} ${surface.era.padEnd(10)} ${pair.label.padEnd(14)} ${ratio.toFixed(2)}:1`,
      );
      if (ratio < pair.min) {
        failures.push(
          `${mode} / era "${surface.era}": ${pair.label} on paper is ${ratio.toFixed(2)}:1, needs ${pair.min}:1`,
        );
      }
    }
  }
}

if (process.env.VERBOSE) console.log(rows.join("\n"));

if (failures.length) {
  console.error(`Contrast check failed (${failures.length}):`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(
  `Contrast OK: ${eras.length + 1} surfaces x 2 modes x ${PAIRS.length} ink tiers all legible.`,
);
