# Myanmar: A State Unfinished

An interactive history of how Myanmar went from a colonial state to today's fragmented
political and military landscape.

A scroll-driven map and timeline. The map is the constant: it stays pinned while the
narrative moves past it, so the reader watches one continuous country change rather than
meeting a new illustration every screen.

**Status: prototype.** Chapter VI (The Spring Revolution, 2021–2023) is built out as the
reference chapter. The remaining seven chapters have their spine and major moments
anchored. Open data gaps are declared in the interface rather than filled.

## Running it

```bash
npm install
npm run geo     # download and build the base geography (once)
npm run dev
```

| Script | What it does |
| --- | --- |
| `npm run geo` | Downloads open geodata and builds the simplified map layers into `src/data/geo/`. |
| `npm run check` | Referential integrity across the narrative data. |
| `npm run build` | Runs `check`, then produces a static export into `out/`. |

## How this is built

Next.js with `output: "export"` — the result is a static site with no server, no database
and no runtime API calls. Maps are SVG drawn with `d3-geo` over TopoJSON; there is no tile
layer and nothing is fetched at runtime.

The camera is an SVG transform over geometry that is projected once at module load, so
moving between steps costs a transform update rather than reprojecting every boundary each
frame. Zoom interpolates geometrically, because linear zoom reads as a lurch.

### Data

All narrative content lives in `src/data/` and the UI renders from it:

| File | Contents |
| --- | --- |
| `chapters.json` | The eight chapters and their era treatment. |
| `steps.json` | Individual moments: date, visual mode, map framing, sources. |
| `actors.json` | Organisations, with named unresolved questions. |
| `relationships.json` | Typed edges between actors. |
| `sources.json` | The citation registry. |
| `territory.json` | Territorial claims, each with a confidence level and an as-of date. |
| `flows.json` | Directional movement of people between places. |
| `gaps.json` | Declared holes in the evidence. |

`npm run check` fails the build on a dangling source id, an unsourced claim, an undated
territorial claim, or a territory entry naming a region that does not exist. The rule that
substantive claims are traceable is only real if breaking it breaks the build.

## Editorial rules

These are the constraints the project works to; the reasoning is in
[`/methodology`](src/app/methodology/page.tsx).

- **Territory is mapped at whole state and region resolution, never below it.** There is no
  verified township-level control dataset here, and drawing a precise front line from
  imprecise reporting produces something that looks like evidence and is not.
- **Uncertainty is texture, never a hue.** A hatched area means weaker evidence, not a
  different actor. Given its own colour, "we don't know" would look like a finding.
- **Conflict events do not imply control.** Event data describes where fighting occurred
  and is used for nothing else.
- **Proxies are labelled where they are used.** Protest circles are sized by city
  population, not crowd size. Movement arcs show direction, not routes.
- **Gaps are declared, not filled.** This prototype was assembled against a May 2026
  knowledge boundary; anything later is left explicitly empty.

## Palette

The three series hues were validated against both light and dark surfaces on the
all-pairs list — the territorial map shows every actor at once — and clear the lightness
band, chroma floor, colour-vision separation, normal-vision floor and 3:1 contrast in both
modes. They are documented in `src/app/globals.css`. Do not adjust them by eye.

## Base geography

Built by `scripts/build-geo.mjs` from open sources, with full attribution in
`src/data/geo/ATTRIBUTION.json`:

- **geoBoundaries** gbOpen MMR ADM1 (CC BY 4.0) — states and regions
- **Natural Earth** 1:50m countries and 1:10m rivers (public domain)
- **GeoNames** cities500 and the Myanmar country dump (CC BY 4.0) — places

Historical and territorial layers are *not* derived from these sources.

## Deployment

Live at **https://gitnapas.github.io/Myanmar-Explainer/**

The site is currently published by pushing the static export to the `gh-pages`
branch, because the GitHub token in use lacks the `workflow` scope needed to add a
GitHub Actions workflow to the repository.

To redeploy by hand:

```bash
NEXT_PUBLIC_BASE_PATH=/Myanmar-Explainer npm run build   # PowerShell: $env:NEXT_PUBLIC_BASE_PATH="/Myanmar-Explainer"
cd out && git add -A && git commit -m "Deploy" && git push -f origin gh-pages
```

To switch to automatic deploys on every push to `master`, grant the scope once and
commit the workflow that is already prepared at `.github/workflows/deploy.yml`:

```bash
gh auth refresh -s workflow
git add .github/workflows/deploy.yml
git commit -m "Add Pages deploy workflow"
git push
```

Then set Pages to build from GitHub Actions rather than the `gh-pages` branch:

```bash
gh api -X PUT repos/gitnapas/Myanmar-Explainer/pages -f build_type=workflow
```

`basePath` comes from `NEXT_PUBLIC_BASE_PATH`, so local development still works at
`http://localhost:3000/` with no prefix, and renaming the repository only means
changing that one value (the workflow reads it from `actions/configure-pages`).

### Looking at it

```bash
npm run build
node scripts/shoot.mjs local   # screenshots out/ into .shots/
node scripts/shoot.mjs         # screenshots the live site
```

Uses the system Edge through playwright-core, so no browser download. Both the
blank-page bug and the invisible-map bug shipped because the colour maths was
checked and the rendered result never was; the computed checks only catch what
they are told to measure.
