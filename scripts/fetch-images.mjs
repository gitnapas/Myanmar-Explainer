/**
 * Fetches freely-licensed portraits and emblems from Wikimedia Commons.
 *
 * Two safeguards, because this script picks images that nobody here can look
 * at before they ship:
 *
 *  1. A candidate is only accepted if its file title matches a required
 *     pattern and misses an excluded one. Taking the top search hit on trust
 *     is how a portrait of the wrong person ends up captioned as Aung San.
 *  2. Only licences on an allow-list are accepted, and the licence, author and
 *     source page are recorded per file in src/data/images.json so every
 *     image on the site can be traced back.
 *
 * Anything without an acceptable match is simply left out; the interface falls
 * back to a monogram. A missing portrait is a gap, a wrong one is a claim.
 *
 * Run: node scripts/fetch-images.mjs [--write]
 */
import { mkdir, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = resolve(ROOT, "public/images");
const MANIFEST = resolve(ROOT, "src/data/images.json");
const API = "https://commons.wikimedia.org/w/api.php";
const WRITE = process.argv.includes("--write");

/** Public domain and attribution licences only. No fair-use, no NC, no ND. */
const OK_LICENCE = /^(cc0|cc by|cc by-sa|public domain|pd-|no restrictions)/i;

const TARGETS = [
  { id: "aung-san", kind: "portrait", q: ["Aung San Burmese politician", "Bogyoke Aung San"], must: /aung.?san/i, not: /suu.?kyi|stadium|market|museum|road|bridge/i, portrait: true },
  { id: "ne-win", kind: "portrait", q: ["Ne Win Burma general"], must: /ne.?win/i, not: /suu|aung.?san|ben.?gurion|meeting|visit/i, portrait: true },
  { id: "thein-sein", kind: "portrait", q: ["Thein Sein president Myanmar"], must: /thein.?sein/i, portrait: true },
  { id: "min-aung-hlaing", kind: "portrait", q: ["Min Aung Hlaing"], must: /min.?aung.?hlaing/i, portrait: true },
  { id: "nld", kind: "emblem", q: ["Flag of the National League for Democracy"], must: /national.?league.?for.?democracy|NLD/i },
  { id: "usdp", kind: "emblem", q: ["Union Solidarity and Development Party flag logo"], must: /union.?solidarity/i },
  { id: "tatmadaw", kind: "emblem", q: ["Seal of the Myanmar Armed Forces", "State Administration Council Myanmar"], must: /myanmar.?armed.?forces|tatmadaw|state.?administration.?council/i },
  { id: "knu", kind: "emblem", q: ["Flag of the Karen National Union"], must: /karen.?national.?union|KNU/i },
  { id: "kio", kind: "emblem", q: ["Flag of the Kachin Independence Army"], must: /kachin.?independence/i },
  { id: "ula-aa", kind: "emblem", q: ["Flag of the Arakan Army"], must: /arakan.?army|united.?league.?of.?arakan/i },
  { id: "mndaa", kind: "emblem", q: ["Flag of the MNDAA Kokang"], must: /MNDAA|kokang/i },
  { id: "tnla", kind: "emblem", q: ["Flag of the Taang National Liberation Army"], must: /ta.?ang|TNLA|palaung/i },
  { id: "uwsa", kind: "emblem", q: ["Flag of the Wa State United Wa State Army"], must: /wa.?state|UWSA/i },
  { id: "cnf", kind: "emblem", q: ["Flag of the Chin National Front"], must: /chin.?national/i },
  { id: "knpp", kind: "emblem", q: ["Flag of the Karenni National Progressive Party", "Flag of Karenni State"], must: /karenni/i },
  { id: "nug", kind: "emblem", q: ["National Unity Government of Myanmar logo"], must: /national.?unity.?government/i },
  { id: "cpb", kind: "emblem", q: ["Flag of the Communist Party of Burma"], must: /communist.?party.?of.?burma/i },
  { id: "bia", kind: "emblem", q: ["Burma Independence Army flag"], must: /burma.?independence.?army|thirty.?comrades/i },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Commons rate-limits anonymous clients hard. Requests are spaced out and
 * retried with backoff rather than hammered, which is both the polite thing
 * and the only way the whole target list completes in one run.
 */
const api = async (params, attempt = 0) => {
  const url = new URL(API);
  for (const [k, v] of Object.entries({ format: "json", origin: "*", ...params }))
    url.searchParams.set(k, v);
  const res = await fetch(url, {
    headers: { "User-Agent": "myanmar-explainer/1.0 (educational project)" },
  });
  if (res.status === 429 && attempt < 5) {
    await sleep(2000 * 2 ** attempt);
    return api(params, attempt + 1);
  }
  if (!res.ok) throw new Error(`Commons API ${res.status}`);
  return res.json();
};

const clean = (html) => (html ?? "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

async function search(target) {
  for (const q of target.q) {
    const data = await api({
      action: "query",
      generator: "search",
      gsrsearch: q,
      gsrnamespace: 6,
      gsrlimit: 20,
      prop: "imageinfo",
      iiprop: "url|extmetadata|mime",
      iiurlwidth: 320,
    });
    const pages = Object.values(data.query?.pages ?? {});
    for (const page of pages) {
      const info = page.imageinfo?.[0];
      if (!info) continue;
      const title = page.title.replace(/^File:/, "");
      if (!target.must.test(title)) continue;
      if (target.not?.test(title)) continue;
      // A signature, a stamp or a banknote carries the right name and is not
      // a face. Portrait slots reject them outright.
      if (target.portrait && /signature|stamp|coin|banknote|kyat|logo|plaque|grave/i.test(title))
        continue;
      // SVG renders crisply at any size; raster is fine too, but skip video/pdf.
      if (!/^image\//.test(info.mime ?? "")) continue;

      const meta = info.extmetadata ?? {};
      const licence = clean(meta.LicenseShortName?.value) || "unknown";
      if (!OK_LICENCE.test(licence)) continue;

      return {
        id: target.id,
        kind: target.kind,
        title,
        licence,
        author: clean(meta.Artist?.value) || "unknown",
        credit: clean(meta.Credit?.value) || null,
        descriptionUrl: info.descriptionurl,
        thumbUrl: info.thumburl ?? info.url,
        query: q,
      };
    }
  }
  return null;
}

const found = [];
const missing = [];

for (const target of TARGETS) {
  await sleep(900);
  try {
    const hit = await search(target);
    if (hit) {
      found.push(hit);
      console.log(`  ok    ${target.id.padEnd(18)} ${hit.title}`);
      console.log(`        ${hit.licence} — ${hit.author.slice(0, 70)}`);
    } else {
      missing.push(target.id);
      console.log(`  ----  ${target.id.padEnd(18)} no acceptably-licensed match`);
    }
  } catch (err) {
    missing.push(target.id);
    console.log(`  err   ${target.id.padEnd(18)} ${err.message}`);
  }
}

console.log(`\n${found.length} found, ${missing.length} without an image: ${missing.join(", ") || "none"}`);

if (!WRITE) {
  console.log("\nReport only. Re-run with --write to download and record them.");
  process.exit(0);
}

await mkdir(OUT_DIR, { recursive: true });
const manifest = [];

for (const hit of found) {
  const ext = hit.thumbUrl.match(/\.(png|jpe?g|svg|webp)(\?|$)/i)?.[1]?.toLowerCase() ?? "png";
  const file = `${hit.id}.${ext === "jpeg" ? "jpg" : ext}`;
  const res = await fetch(hit.thumbUrl, {
    headers: { "User-Agent": "myanmar-explainer/1.0 (educational project)" },
  });
  if (!res.ok) {
    console.log(`  skip  ${hit.id} (download ${res.status})`);
    continue;
  }
  await writeFile(resolve(OUT_DIR, file), Buffer.from(await res.arrayBuffer()));
  manifest.push({
    actor: hit.id,
    kind: hit.kind,
    file: `images/${file}`,
    title: hit.title,
    licence: hit.licence,
    author: hit.author,
    source: hit.descriptionUrl,
  });
  console.log(`  saved ${file}`);
}

await writeFile(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
console.log(`\nWrote ${manifest.length} images and src/data/images.json`);
