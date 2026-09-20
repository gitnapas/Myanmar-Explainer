/**
 * Builds the map's geographic base layers from open data sources.
 *
 * Every layer here comes from a published dataset. Nothing in this pipeline
 * invents geometry. Historical and territorial-control polygons are
 * deliberately NOT produced here -- those belong in src/data/territory.json
 * with explicit confidence levels and as-of dates.
 *
 * Sources:
 *   - geoBoundaries gbOpen MMR ADM1 (CC BY 4.0) -- states/regions
 *   - Natural Earth 1:50m admin_0 countries (public domain) -- neighbours
 *   - Natural Earth 1:10m rivers + lake centerlines (public domain) -- rivers
 *   - GeoNames cities500 (CC BY 4.0) -- cities
 *
 * Natural Earth carries only 37 populated places for Myanmar and none of the
 * border towns this story turns on -- no Cox's Bazar, Lashio, Muse or
 * Myawaddy -- so cities come from GeoNames instead.
 *
 * Run: node scripts/build-geo.mjs
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { inflateRawSync } from "node:zlib";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { topology } from "topojson-server";
import { presimplify, simplify, quantile } from "topojson-simplify";
import { quantize, feature } from "topojson-client";
import { geoBounds } from "d3-geo";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CACHE = resolve(ROOT, ".geocache");
const OUT = resolve(ROOT, "src/data/geo");

const NE = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson";
const GB = "https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/MMR/ADM1";

const SOURCES = {
  "mmr-adm1.geojson": `${GB}/geoBoundaries-MMR-ADM1_simplified.geojson`,
  "countries.geojson": `${NE}/ne_50m_admin_0_countries.geojson`,
  "rivers.geojson": `${NE}/ne_10m_rivers_lake_centerlines.geojson`,
  // cities500 covers the foreign border towns, but it omits Muse, Maungdaw
  // and Mindat entirely -- all of which the story needs -- so Myanmar places
  // come from the full country dump instead.
  "cities500.zip": "https://download.geonames.org/export/dump/cities500.zip",
  "MM.zip": "https://download.geonames.org/export/dump/MM.zip",
};

/** Countries kept as context around Myanmar. */
const NEIGHBOURS = new Set([
  "Bangladesh", "Bhutan", "Cambodia", "China", "India", "Laos",
  "Malaysia", "Nepal", "Thailand", "Vietnam",
]);

/**
 * Myanmar's fourteen ADM1 units split into seven States and seven Regions.
 * This is not a labelling detail: States are nominally the ethnic-nationality
 * units and Regions the Bamar-majority heartland, and the relationship between
 * the two is the unresolved structural question running through the whole
 * story. geoBoundaries ships bare names, so the split is declared here.
 */
const STATES = new Set(["Kachin", "Kayah", "Kayin", "Chin", "Mon", "Rakhine", "Shan"]);
const REGIONS = new Set([
  "Sagaing", "Tanintharyi", "Bago", "Magway", "Mandalay", "Yangon", "Ayeyarwady",
]);

/** geoBoundaries spellings that differ from common English usage. */
const NAME_FIXES = { Saigang: "Sagaing", Tanitharyi: "Tanintharyi" };

/**
 * Names used by sources predating the 1989 renaming, or by communities who
 * never accepted it. Both forms appear across the literature this site cites,
 * so the map needs to be able to show either.
 */
const ALT_NAMES = {
  Kayah: "Karenni", Kayin: "Karen", Rakhine: "Arakan", Ayeyarwady: "Irrawaddy",
};

/**
 * Rivers that carry narrative weight: the Irrawaddy corridor is the historical
 * spine of Burmese states, the Salween marks the eastern uplands, and the
 * Mekong anchors the northeastern border.
 */
const RIVERS = /^(Irrawaddy|Ayeyarwady|Salween|Thanlwin|Chindwin|Sittang|Sittaung|Mekong)$/i;

/**
 * Myanmar towns the narrative needs regardless of size -- documented border
 * crossings and towns that feature in specific events. Everything else is
 * included by population or by being a state capital.
 */
const MM_KEEP = new Set([
  "lashio", "laukkai", "mu-se", "hsipaw", "kyaukme", "kunlong",
  "namhkam", "kutkai", "theinni", "mongko", "moeng la",
  "myawaddy", "hpa-an", "loikaw", "dimawso", "bawlake",
  "bhamo", "myitkyina", "putao", "mogaung", "hpakan",
  "hakha", "falam", "mindat", "thantlang", "tedim",
  "sittwe", "kyaukpyu", "maungdaw", "buthidaung town", "mrauk u", "paletwa", "ann",
  "sagaing", "monywa", "kalemyo", "shwebo", "depayin", "meiktila", "mawlaik",
  "kengtung", "tachileik", "pangsang", "mogok", "pakokku",
]);

/**
 * Laiza, the KIO/KIA headquarters, has no GeoNames entry. It is referenced in
 * the narrative but deliberately carries no map pin rather than a guessed
 * coordinate. [DATA NEEDED: Laiza coordinates from a citable gazetteer]
 */

/**
 * GeoNames sometimes files a place under a name English-language sources do
 * not use. Mapping back keeps labels recognisable to readers following the
 * reporting.
 */
const DISPLAY_NAMES = {
  "Mu-se": "Muse",
  Mengmao: "Ruili",
  Dimawso: "Demoso",
  "Mrauk U": "Mrauk-U",
  "Buthidaung Town": "Buthidaung",
  "Moeng La": "Mong La",
  Kalemyo: "Kalay",
  Theinni: "Hsenwi",
  Pangsang: "Pangkham",
};

/**
 * Foreign towns, by country, that appear in the cross-border story: refugee
 * reception, trade gates and rear areas.
 */
const FOREIGN_KEEP = {
  BD: ["cox's bazar", "coxs bazar", "teknaf", "ukhia", "chittagong", "dhaka"],
  TH: ["mae sot", "mae hong son", "mae sai", "chiang mai", "bangkok", "ranong"],
  // GeoNames files the Ruili border city under its older name, Mengmao.
  CN: ["mengmao", "kunming", "tengchong"],
  IN: ["aizawl", "champhai", "imphal", "moreh", "new delhi"],
  LA: ["vientiane"],
  MY: ["kuala lumpur"],
};

/**
 * Documented crossing points and reception areas. These are longstanding,
 * well-reported facts of geography and trade, not claims about who controls
 * them -- control is tracked separately in territory.json with dates.
 */
const CITY_ROLES = {
  "mu-se": "border-crossing",
  mengmao: "border-crossing",
  myawaddy: "border-crossing",
  "mae sot": "border-crossing",
  tachileik: "border-crossing",
  "mae sai": "border-crossing",
  moreh: "border-crossing",
  teknaf: "border-crossing",
  "cox's bazar": "refugee-reception",
  ukhia: "refugee-reception",
};

/**
 * Extracts one named entry from a ZIP archive.
 *
 * Shelling out to `tar` is not portable here: the GNU tar that ships with Git
 * for Windows reads a leading `C:` as a remote host and fails. GeoNames uses
 * plain stored/deflated entries, so walking the central directory directly is
 * both shorter and dependency-free. Country dumps bundle a readme alongside
 * the data, so entries are selected by name rather than position.
 */
function unzipEntry(buf, wanted) {
  // End of central directory: scan back from the tail for the signature.
  let eocd = buf.length - 22;
  while (eocd >= 0 && buf.readUInt32LE(eocd) !== 0x06054b50) eocd--;
  if (eocd < 0) throw new Error("not a ZIP archive: no end-of-central-directory record");

  const count = buf.readUInt16LE(eocd + 10);
  let at = buf.readUInt32LE(eocd + 16);
  const seen = [];

  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(at) !== 0x02014b50) throw new Error("corrupt ZIP central directory");
    const method = buf.readUInt16LE(at + 10);
    const compressedSize = buf.readUInt32LE(at + 20);
    const nameLength = buf.readUInt16LE(at + 28);
    const extraLength = buf.readUInt16LE(at + 30);
    const commentLength = buf.readUInt16LE(at + 32);
    const localOffset = buf.readUInt32LE(at + 42);
    const name = buf.toString("utf8", at + 46, at + 46 + nameLength);
    seen.push(name);

    if (name === wanted) {
      // The local header repeats the name/extra lengths and they can differ
      // from the central directory's, so the data offset comes from there.
      const start =
        localOffset + 30 + buf.readUInt16LE(localOffset + 26) + buf.readUInt16LE(localOffset + 28);
      const data = buf.subarray(start, start + compressedSize);
      if (method === 0) return data;
      if (method === 8) return inflateRawSync(data);
      throw new Error(`unsupported ZIP compression method ${method} for ${name}`);
    }
    at += 46 + nameLength + extraLength + commentLength;
  }
  throw new Error(`${wanted} not found in archive (has: ${seen.join(", ")})`);
}

/** Downloads a source, unzipping it if needed. Returns the files it produced. */
async function download(name, url) {
  const dest = resolve(CACHE, name);
  if (existsSync(dest)) {
    console.log(`  cached  ${name}`);
  } else {
    console.log(`  fetch   ${name}`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
    await writeFile(dest, Buffer.from(await res.arrayBuffer()));
  }
  if (!name.endsWith(".zip")) return { [name]: dest };

  // GeoNames ships dumps as a zipped TSV of the same base name.
  const member = name.replace(/\.zip$/, ".txt");
  const extracted = resolve(CACHE, member);
  if (!existsSync(extracted)) {
    console.log(`  unzip   ${name}`);
    await writeFile(extracted, unzipEntry(await readFile(dest), member));
  }
  return { [name]: dest, [member]: extracted };
}

const readJSON = async (path) => JSON.parse(await readFile(path, "utf8"));

/**
 * Converts features to TopoJSON and drops the smallest arcs by area-weight.
 * Shared borders stay welded together, so simplifying states never opens gaps
 * between them -- which a per-feature simplifier would do.
 *
 * Layers of different scale must NOT share a topology. simplify() takes one
 * weight threshold for the whole thing, and quantile() derives it from every
 * arc present: put China in with Myanmar's states and the threshold lands so
 * high that the small state rings collapse to degenerate geometry. d3-geo then
 * reads those rings as inverted and fills the entire world with them, which is
 * how this map once rendered as a single flat colour.
 */
function toTopology(layers, { retain = 0.4, quant = 1e5 } = {}) {
  let topo = topology(layers);
  topo = presimplify(topo);
  topo = simplify(topo, quantile(topo, retain));
  return quantize(topo, quant);
}

/**
 * Forces ring orientation to what d3-geo requires: exterior rings CLOCKWISE
 * (negative shoelace area), holes counter-clockwise.
 *
 * Note that this is the opposite of RFC 7946, which specifies counter-clockwise
 * exteriors. d3-geo predates that spec and never changed. Do not "correct"
 * this to match the GeoJSON spec -- it was verified empirically, by rewinding
 * both ways and taking the bounds of each:
 *
 *   exterior counter-clockwise -> -180,-90 .. 180,90   (the whole planet)
 *   exterior clockwise         ->  92.2,9.7 .. 101.2,28.5
 *
 * It matters because d3-geo clips on a sphere, where a ring has no outside:
 * an exterior wound the wrong way describes everything on Earth except the
 * country. geoBoundaries ships counter-clockwise, so every state silently
 * meant "the world minus this state", d3 filled the frame with each of them in
 * turn, and the map rendered as one flat colour with Myanmar invisible inside
 * it. Nothing in the lon/lat values looks wrong, which is why this survived
 * several rounds of inspecting the data.
 */
const ringArea = (ring) => {
  let sum = 0;
  for (let i = 0, n = ring.length; i < n - 1; i++) {
    sum += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  }
  return sum / 2;
};

const orient = (ring, wantPositive) => {
  const area = ringArea(ring);
  return (area < 0) === wantPositive ? [...ring].reverse() : ring;
};

function rewindGeometry(geometry) {
  const fixPolygon = (rings) =>
    rings.map((ring, i) => orient(ring, i !== 0)); // exterior CW, holes CCW

  if (geometry.type === "Polygon") {
    return { ...geometry, coordinates: fixPolygon(geometry.coordinates) };
  }
  if (geometry.type === "MultiPolygon") {
    return { ...geometry, coordinates: geometry.coordinates.map(fixPolygon) };
  }
  return geometry;
}

const rewind = (fc) => ({
  ...fc,
  features: fc.features.map((f) => ({ ...f, geometry: rewindGeometry(f.geometry) })),
});

/**
 * Fails the build if a layer claims to span the globe.
 *
 * An inverted ring has perfectly ordinary lon/lat values, so bounds are the
 * only place it shows up before rendering. Checking projected coordinates
 * instead does not work: fitExtent rescales whatever it is handed, so broken
 * geometry passes by being normalised into the frame.
 */
function assertBounded(fc, label, box) {
  const [[w, s2], [e, n]] = geoBounds(fc);
  const ok = w >= box[0] && s2 >= box[1] && e <= box[2] && n <= box[3];
  if (!ok) {
    throw new Error(
      `${label} spans [${w.toFixed(1)}, ${s2.toFixed(1)}] to [${e.toFixed(1)}, ${n.toFixed(1)}], ` +
      `outside the expected box ${JSON.stringify(box)}. Ring winding is almost certainly inverted.`,
    );
  }
  console.log(`  bounds  ${label}: ${w.toFixed(1)},${s2.toFixed(1)} to ${e.toFixed(1)},${n.toFixed(1)}`);
}

const write = async (name, data) => {
  const json = JSON.stringify(data);
  await writeFile(resolve(OUT, name), json);
  console.log(`  write   ${name} (${(json.length / 1024).toFixed(0)} KB)`);
};

async function main() {
  await mkdir(CACHE, { recursive: true });
  await mkdir(OUT, { recursive: true });

  console.log("Downloading sources...");
  const paths = {};
  for (const [name, url] of Object.entries(SOURCES)) {
    Object.assign(paths, await download(name, url));
  }

  console.log("Building layers...");

  // --- States and regions -------------------------------------------------
  // geoBoundaries gbOpen MMR ADM1 carries 14 units. Myanmar also administers
  // Nay Pyi Taw Union Territory, which this dataset folds into Mandalay
  // Region rather than splitting out; the city is drawn from the cities layer.
  const adm1 = await readJSON(paths["mmr-adm1.geojson"]);
  adm1.features = adm1.features.map((f) => {
    const raw = f.properties.shapeName;
    const name = NAME_FIXES[raw] ?? raw;
    if (!STATES.has(name) && !REGIONS.has(name)) {
      throw new Error(`Unclassified ADM1 unit "${raw}" -- update STATES/REGIONS/NAME_FIXES`);
    }
    return {
      type: "Feature",
      geometry: f.geometry,
      properties: {
        name,
        kind: STATES.has(name) ? "state" : "region",
        altName: ALT_NAMES[name] ?? null,
        id: f.properties.shapeISO ?? f.properties.shapeID,
      },
    };
  });
  const nStates = adm1.features.filter((f) => f.properties.kind === "state").length;
  const nUnits = adm1.features.length;
  console.log(`  adm1    ${nUnits} units (${nStates} states, ${nUnits - nStates} regions)`);

  // --- Neighbouring countries --------------------------------------------
  const countries = await readJSON(paths["countries.geojson"]);
  const pick = (test, props) => ({
    type: "FeatureCollection",
    features: countries.features
      .filter(test)
      .map((f) => ({ type: "Feature", geometry: f.geometry, properties: props(f) })),
  });
  const neighbours = pick(
    (f) => NEIGHBOURS.has(f.properties.NAME),
    (f) => ({ name: f.properties.NAME, iso: f.properties.ISO_A3 }),
  );
  console.log(`  nbrs    ${neighbours.features.length} countries`);

  // One topology per scale. The national outline is not shipped separately at
  // all -- it is merged from these same state polygons at load time, so the
  // border can never drift out of step with the states that make it up.
  const boundaries = toTopology({ states: rewind(adm1) }, { retain: 0.5 });
  assertBounded(feature(boundaries, boundaries.objects.states), "states", [91, 8, 102, 30]);
  await write("boundaries.topo.json", boundaries);

  const nbrTopo = toTopology({ neighbours: rewind(neighbours) }, { retain: 0.25 });
  assertBounded(feature(nbrTopo, nbrTopo.objects.neighbours), "neighbours", [60, -12, 140, 60]);
  await write("neighbours.topo.json", nbrTopo);

  // --- Rivers -------------------------------------------------------------
  const riversRaw = await readJSON(paths["rivers.geojson"]);
  const rivers = {
    type: "FeatureCollection",
    features: riversRaw.features
      .filter((f) => RIVERS.test(f.properties.name ?? ""))
      .map((f) => ({
        type: "Feature",
        geometry: f.geometry,
        properties: { name: f.properties.name },
      })),
  };
  console.log(`  rivers  ${rivers.features.length} segments`);
  await write("rivers.topo.json", toTopology({ rivers }, { retain: 0.5, quant: 1e4 }));

  // --- Cities -------------------------------------------------------------
  // GeoNames TSV columns: 1 name, 2 ascii, 4 lat, 5 lon, 6 class, 7 code,
  // 8 country, 14 population. PPLC is a national capital and PPLA a
  // first-order admin capital -- that is how the seven state capitals survive
  // the population filter despite several being small towns.
  const cities = [];
  const collect = async (file, keep) => {
    for (const row of (await readFile(file, "utf8")).split("\n")) {
      if (!row) continue;
      const c = row.split("\t");
      const [name, ascii, lat, lon, cls, code, cc] = [c[1], c[2], c[4], c[5], c[6], c[7], c[8]];
      if (cls !== "P") continue; // populated places only
      const pop = Number(c[14]) || 0;
      const key = ascii.toLowerCase();
      if (!keep({ key, cc, code, pop })) continue;

      cities.push({
        name: DISPLAY_NAMES[ascii] ?? ascii,
        country: cc,
        population: pop || null,
        capital: code === "PPLC",
        stateCapital: code === "PPLA",
        role: CITY_ROLES[key] ?? null,
        coordinates: [Number(Number(lon).toFixed(4)), Number(Number(lat).toFixed(4))],
      });
    }
  };

  await collect(paths["MM.txt"], ({ key, code, pop }) =>
    pop >= 100_000 || code === "PPLC" || code === "PPLA" || MM_KEEP.has(key));
  await collect(paths["cities500.txt"], ({ key, cc }) =>
    cc !== "MM" && (FOREIGN_KEEP[cc] ?? []).includes(key));

  // The country dump lists some towns more than once (variant romanisations
  // at slightly different coordinates); keep the best-populated of each.
  const byName = new Map();
  for (const city of cities) {
    const prev = byName.get(city.name);
    if (!prev || (city.population ?? 0) > (prev.population ?? 0)) byName.set(city.name, city);
  }
  const deduped = [...byName.values()].sort((a, b) => (b.population ?? 0) - (a.population ?? 0));
  const mm = deduped.filter((c) => c.country === "MM").length;
  console.log(`  cities  ${deduped.length} places (${mm} in Myanmar)`);
  await write("cities.json", deduped);

  const today = new Date().toISOString().slice(0, 10);
  await write("ATTRIBUTION.json", {
    note: "Base geography only. Historical and territorial-control layers are not derived from these sources.",
    sources: [
      {
        layer: "boundaries.topo.json#states",
        name: "geoBoundaries gbOpen MMR ADM1",
        license: "CC BY 4.0",
        url: "https://www.geoboundaries.org/",
        retrieved: today,
      },
      {
        layer: "neighbours.topo.json",
        name: "Natural Earth 1:50m Admin 0 Countries",
        license: "Public domain",
        url: "https://www.naturalearthdata.com/",
        retrieved: today,
      },
      {
        layer: "rivers.topo.json",
        name: "Natural Earth 1:10m Rivers and Lake Centerlines",
        license: "Public domain",
        url: "https://www.naturalearthdata.com/",
        retrieved: today,
      },
      {
        layer: "cities.json",
        name: "GeoNames cities500 and MM country dump",
        license: "CC BY 4.0",
        url: "https://www.geonames.org/",
        retrieved: today,
      },
    ],
  });

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
