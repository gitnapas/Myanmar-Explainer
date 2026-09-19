/**
 * Referential integrity for the narrative data.
 *
 * The project rule is that substantive claims are traceable. That rule is only
 * real if a dangling source id fails the build, so this runs in `npm run build`
 * ahead of next build.
 */
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const DATA = resolve(dirname(fileURLToPath(import.meta.url)), "../src/data");
const load = async (name) => JSON.parse(await readFile(resolve(DATA, `${name}.json`), "utf8"));

const [sources, actors, relationships, steps, chapters, territory, gaps, boundaries] =
  await Promise.all([
    load("sources"), load("actors"), load("relationships"), load("steps"),
    load("chapters"), load("territory"), load("gaps"), load("geo/boundaries.topo"),
  ]);

const errors = [];
const check = (cond, msg) => { if (!cond) errors.push(msg); };

const sourceIds = new Set(sources.map((s) => s.id));
const actorIds = new Set(actors.map((a) => a.id));
const chapterIds = new Set(chapters.map((c) => c.id));
const stepIds = new Set(steps.map((s) => s.id));
const adm1 = new Set(boundaries.objects.states.geometries.map((g) => g.properties.name));

const dupes = (ids, label) => {
  const seen = new Set();
  for (const id of ids) {
    if (seen.has(id)) errors.push(`duplicate ${label} id: ${id}`);
    seen.add(id);
  }
};
dupes(sources.map((s) => s.id), "source");
dupes(actors.map((a) => a.id), "actor");
dupes(steps.map((s) => s.id), "step");

const citesReal = (list, where) =>
  (list ?? []).forEach((id) =>
    check(sourceIds.has(id), `${where} cites unknown source "${id}"`));

for (const a of actors) {
  citesReal(a.sources, `actor ${a.id}`);
  check(a.sources?.length > 0, `actor ${a.id} has no sources`);
}

for (const r of relationships) {
  check(actorIds.has(r.from), `relationship cites unknown actor "${r.from}"`);
  check(actorIds.has(r.to), `relationship cites unknown actor "${r.to}"`);
  citesReal(r.sources, `relationship ${r.from}->${r.to}`);
  check(r.confidence, `relationship ${r.from}->${r.to} has no confidence`);
}

for (const s of steps) {
  citesReal(s.sources, `step ${s.id}`);
  check(s.sources?.length > 0, `step ${s.id} has no sources`);
  check(chapterIds.has(s.chapter), `step ${s.id} is in unknown chapter "${s.chapter}"`);
  (s.actors ?? []).forEach((id) =>
    check(actorIds.has(id), `step ${s.id} references unknown actor "${id}"`));
}

for (const t of territory) {
  citesReal(t.sources, `territory ${t.id}`);
  // Both are load-bearing: an undated or unqualified control claim is the
  // failure mode this whole data model exists to prevent.
  check(!!t.asOf, `territory ${t.id} has no asOf date`);
  check(!!t.confidence, `territory ${t.id} has no confidence`);
  check(!!t.basis, `territory ${t.id} has no stated basis`);
  t.areas.forEach((area) =>
    check(adm1.has(area), `territory ${t.id} names "${area}", which is not an ADM1 unit`));
}

for (const g of gaps) {
  g.affects.forEach((id) =>
    check(stepIds.has(id) || chapterIds.has(id),
      `gap ${g.id} affects unknown step or chapter "${id}"`));
}

if (errors.length) {
  console.error(`Data check failed (${errors.length}):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(
  `Data OK: ${steps.length} steps, ${actors.length} actors, ${relationships.length} relationships, ` +
  `${sources.length} sources, ${territory.length} territory claims, ${gaps.length} declared gaps.`,
);
