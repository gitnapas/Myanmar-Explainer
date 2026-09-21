"use client";

import { memo, useEffect, useRef, useState, useMemo } from "react";
import { geoMercator, geoPath } from "d3-geo";

import ActorBubble from "@/components/ActorBubble";
import type { Actor, StepMapFill, StepMapJourney, StepVisual, VisualTone } from "@/lib/types";
import { worldCountries } from "@/lib/worldGeo";

import {
  VIEW,
  cameraTransform,
  cities,
  neighbours,
  outline,
  rivers,
  screenPoint,
  states,
  toPath,
  type City,
} from "@/lib/geo";
import { useCameraTween, type Camera } from "@/lib/useCameraTween";
import flowsData from "@/data/flows.json";
import territoryData from "@/data/territory.json";
import type { TerritoryClaim } from "@/lib/types";

const flows = flowsData as Flow[];
const territory = territoryData as TerritoryClaim[];

interface Flow {
  id: string;
  from: string;
  to: string;
  label: string;
  kind: "flight" | "refugee";
  steps: string[];
  sources: string[];
}

export interface StoryMapProps {
  focus: Camera;
  motionPaused?: boolean;
  /** Named layers switched on by the current step. */
  layers?: string[];
  /** The step being read, used to pick which flows belong on screen. */
  stepId?: string;
  /** Territory claims are only drawn when a step asks for them. */
  territoryAsOf?: string;
  /** Actor records used by the on-map portrait bubbles. */
  actors?: Actor[];
  /** Per-step fills, actor positions and annotations. */
  visual?: StepVisual;
  /** Opens the existing actor evidence panel. */
  onSelectActor?: (id: string) => void;
}

const cityByName = new Map(cities.map((c) => [c.name, c]));

/**
 * Base geography. Memoised away from the camera entirely: these paths are
 * projected once at module load and never recomputed, so a camera move costs
 * one transform attribute rather than reprojecting every boundary each frame.
 */
const BaseGeography = memo(function BaseGeography() {
  return (
    <g>
      {neighbours.features.map((f) => (
        <path
          key={f.properties.iso ?? f.properties.name}
          d={toPath(f)}
          fill="var(--map-neighbour)"
          stroke="var(--map-neighbour-edge)"
          strokeWidth={0.75}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </g>
  );
});

/**
 * Rivers, drawn after the land rather than before it.
 *
 * They were previously part of the base layer and the state polygons painted
 * straight over them, so the Irrawaddy -- the spine the whole country is
 * organised around -- was invisible on its own map.
 */
const Rivers = memo(function Rivers() {
  return (
    <g>
      {rivers.features.map((f, i) => (
        <path
          key={`${f.properties.name}-${i}`}
          d={toPath(f)}
          fill="none"
          stroke="var(--map-river)"
          strokeWidth={1.3}
          strokeLinecap="round"
          strokeOpacity={0.85}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </g>
  );
});

/**
 * Myanmar's states and regions.
 *
 * States and regions are drawn with different edge weights. That is the one
 * piece of base-map styling carrying an argument: the seven States are
 * nominally the ethnic-nationality units and the seven Regions the
 * Bamar-majority centre, and the unresolved relationship between them is the
 * thread running through the entire story.
 */
const AdminUnits = memo(function AdminUnits({
  highlighted,
}: {
  highlighted: Set<string>;
}) {
  return (
    <g>
      {states.features.map((f) => {
        const { name, kind } = f.properties;
        const isHighlighted = highlighted.has(name);
        return (
          <path
            key={name}
            d={toPath(f)}
            fill={isHighlighted ? "var(--paper-sunk)" : "var(--map-land)"}
            stroke="var(--map-land-edge)"
            strokeWidth={kind === "state" ? 1.1 : 0.6}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            style={{ transition: "fill 700ms ease" }}
          />
        );
      })}
    </g>
  );
});

/**
 * Territorial claims, drawn at whole-state resolution.
 *
 * Confidence is carried by texture rather than by a fourth hue, so "we are
 * not sure" never looks like a different finding from "we are sure". Anything
 * short of documented gets a hatch, and the legend says what the hatch means.
 */
function TerritoryLayer({ asOf }: { asOf: string }) {
  const claims = useMemo(
    () => territory.filter((t) => t.asOf <= asOf),
    [asOf],
  );

  const slotFor = (actor: string) =>
    actor === "tatmadaw" ? 1 : actor === "ula-aa" ? 3 : 2;

  return (
    <g>
      {claims.map((claim) =>
        claim.areas.map((area) => {
          const f = states.features.find((s) => s.properties.name === area);
          if (!f) return null;
          const slot = slotFor(claim.actor);
          const solid = claim.confidence === "documented";
          return (
            <path
              key={`${claim.id}-${area}`}
              d={toPath(f)}
              fill={solid ? `var(--series-${slot}-wash)` : `url(#hatch-${slot})`}
              stroke={`var(--series-${slot})`}
              strokeWidth={1}
              strokeOpacity={0.55}
              vectorEffect="non-scaling-stroke"
            />
          );
        }),
      )}
    </g>
  );
}

const fillForTone: Record<VisualTone, string> = {
  colonial: "var(--series-1)",
  occupation: "var(--series-3)",
  independence: "#d6a928",
  military: "var(--series-1)",
  resistance: "var(--series-2)",
  civilian: "var(--series-3)",
  warning: "#d27a19",
  neutral: "var(--ink-muted)",
};

/** Historically meaningful colour fields supplied by the active story step. */
function HistoricalFillLayer({ fills }: { fills: StepMapFill[] }) {
  return (
    <g pointerEvents="none">
      {fills.flatMap((fill, fillIndex) => {
        const stateMarks = states.features
          .filter(
            (feature) =>
              fill.areas.includes("Myanmar") || fill.areas.includes(feature.properties.name),
          )
          .map((feature) => (
            <path
              key={`state-${fillIndex}-${feature.properties.name}`}
              d={toPath(feature)}
              fill={fillForTone[fill.tone]}
              fillOpacity={fill.opacity ?? 0.45}
              stroke={fillForTone[fill.tone]}
              strokeWidth={1.2}
              vectorEffect="non-scaling-stroke"
              className="story-area-fill"
            />
          ));

        const neighbourMarks = neighbours.features
          .filter((feature) => fill.areas.includes(feature.properties.name))
          .map((feature) => (
            <path
              key={`neighbour-${fillIndex}-${feature.properties.name}`}
              d={toPath(feature)}
              fill={fillForTone[fill.tone]}
              fillOpacity={fill.opacity ?? 0.45}
              stroke={fillForTone[fill.tone]}
              strokeWidth={1.2}
              vectorEffect="non-scaling-stroke"
              className="story-area-fill"
            />
          ));

        return [...stateMarks, ...neighbourMarks];
      })}
    </g>
  );
}

function AnnotationLayer({
  annotations,
  camera,
}: {
  annotations: NonNullable<NonNullable<StepVisual["map"]>["annotations"]>;
  camera: Camera;
}) {
  return (
    <g pointerEvents="none">
      {annotations.map((annotation, index) => {
        const [x, y] = screenPoint(annotation.coordinates, camera.center, camera.zoom);
        const colour = fillForTone[annotation.tone ?? "neutral"];
        return (
          <g
            key={`${annotation.label}-${index}`}
            transform={`translate(${x} ${y})`}
            className="map-annotation"
          >
            <circle r={8} fill="var(--paper)" stroke={colour} strokeWidth={2.2} />
            <circle r={2.5} fill={colour} />
            <line x1={8} y1={0} x2={18} y2={0} stroke={colour} strokeWidth={1.3} />
            <text
              x={22}
              y={-2}
              fontSize={12}
              fontWeight={700}
              fill="var(--ink)"
              stroke="var(--paper)"
              strokeWidth={4}
              paintOrder="stroke"
            >
              {annotation.label}
            </text>
            {annotation.detail && (
              <text
                x={22}
                y={13}
                fontSize={9.5}
                fill="var(--ink-secondary)"
                stroke="var(--paper)"
                strokeWidth={3}
                paintOrder="stroke"
              >
                {annotation.detail}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}

function ActorMapLayer({
  frameTop,
  frameHeight,
  marks,
  actors,
  camera,
  onSelectActor,
}: {
  frameTop: number;
  frameHeight: number;
  marks: NonNullable<NonNullable<StepVisual["map"]>["actors"]>;
  actors: Actor[];
  camera: Camera;
  onSelectActor?: (id: string) => void;
}) {
  const actorById = new Map(actors.map((actor) => [actor.id, actor]));
  const placed: { x: number; y: number }[] = [];

  return (
    <g className="map-actors">
      {marks.map((mark, index) => {
        const [anchorX, anchorY] = screenPoint(mark.coordinates, camera.center, camera.zoom);
        let x = Math.max(50, Math.min(790, anchorX - 90));
        let y = Math.max(frameTop + 65, Math.min(frameTop + frameHeight - 100, anchorY - 65));
        for (let attempt = 0; attempt < 24; attempt++) {
          if (!placed.some((point) => Math.abs(point.x - x) < 195 && Math.abs(point.y - y) < 80)) break;
          y += 85;
          if (y > frameTop + frameHeight - 80) { y = frameTop + 65; x = Math.min(790, x + 205); }
        }
        placed.push({ x, y });
        const actor = mark.actor ? actorById.get(mark.actor) : undefined;
        const initials = mark.label
          .split(/\s+/)
          .slice(0, 2)
          .map((word) => word[0])
          .join("");
        const inactive = mark.status && mark.status !== "active";

        return (
          <g
            key={mark.actor ?? `${mark.label}-${index}`}
            transform={`translate(${x} ${y})`}
            className="actor-map-mark"
          >
            <line x1={anchorX - x} y1={anchorY - y} x2={0} y2={0} stroke="var(--ink-muted)" strokeOpacity={0.55} strokeWidth={1} />
            <circle cx={anchorX - x} cy={anchorY - y} r={3} fill="var(--ink)" />
            <text className="compact-actor-number" x={0} y={0} fontSize={30} fontWeight={700} fill="var(--ink)" stroke="var(--paper)" strokeWidth={5} paintOrder="stroke">{index + 1}</text>
            <foreignObject x={-30} y={-30} width={190} height={82} overflow="visible">
              <div className={`flex items-center gap-2 ${inactive ? "opacity-60 grayscale" : ""}`}>
                <button
                  type="button"
                  disabled={!actor}
                  onClick={() => actor && onSelectActor?.(actor.id)}
                  aria-label={actor ? `Open ${actor.name}` : mark.label}
                  className="relative shrink-0 rounded-full disabled:cursor-default"
                >
                  {mark.flag ? (
                    <span
                      className={`inline-flex h-[52px] w-[52px] items-center justify-center overflow-hidden rounded-full border-2 border-rule-strong ${mark.flag === "japan-imperial" ? "imperial-japan-flag" : ""}`}
                      aria-hidden
                    ><svg viewBox="-26 -26 52 52" width={52} height={52}><FlagMark flag={mark.flag} /></svg></span>
                  ) : actor ? (
                    <ActorBubble actor={actor} size={52} />
                  ) : (
                    <span className="inline-flex h-[52px] w-[52px] items-center justify-center rounded-full border-2 border-rule-strong bg-paper-raised font-mono text-[0.72rem] font-bold text-ink">
                      {initials}
                    </span>
                  )}
                  {inactive && (
                    <span className="absolute inset-0 flex items-center justify-center text-[3.4rem] font-light leading-none text-series-1">
                      ×
                    </span>
                  )}
                </button>
                <span className="max-w-[7.5rem] bg-paper/90 px-1.5 py-1 text-[0.7rem] font-semibold leading-tight text-ink shadow-[0_0_0_1px_var(--rule)]">
                  {mark.label}
                  {mark.status && mark.status !== "active" && (
                    <small className="mt-0.5 block font-mono text-[0.58rem] uppercase tracking-wide text-series-1">
                      {mark.status}
                    </small>
                  )}
                </span>
              </div>
            </foreignObject>
          </g>
        );
      })}
    </g>
  );
}

/**
 * Directional movement of people.
 *
 * These are arcs between two real places, not tracked routes -- nobody has
 * journey-level data for this and drawing a confident line across the country
 * would invent one. The arc says "from this region toward that one"; the
 * legend says exactly that, and the dash animation carries direction.
 */
function FlowLayer({ stepId, camera }: { stepId: string; camera: Camera }) {
  const active = flows.filter((f) => f.steps.includes(stepId));

  return (
    <g>
      {active.map((flow, i) => {
        const from = cityByName.get(flow.from);
        const to = cityByName.get(flow.to);
        if (!from || !to) return null;

        const [x1, y1] = screenPoint(from.coordinates, camera.center, camera.zoom);
        const [x2, y2] = screenPoint(to.coordinates, camera.center, camera.zoom);

        // Bow each arc perpendicular to its own direction so overlapping
        // routes stay separable instead of collapsing into one another.
        const dx = x2 - x1;
        const dy = y2 - y1;
        const mx = (x1 + x2) / 2 - dy * 0.18;
        const my = (y1 + y2) / 2 + dx * 0.18;

        return (
          <g key={flow.id}>
            <path
              d={`M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`}
              fill="none"
              stroke={flow.kind === "refugee" ? "var(--series-3)" : "var(--series-2)"}
              strokeWidth={2.25}
              strokeLinecap="round"
              strokeDasharray="7 9"
              opacity={0.9}
              style={{
                animation: `flow-dash 1.6s linear infinite`,
                animationDelay: `${i * 0.18}s`,
              }}
            />
            <circle cx={x2} cy={y2} r={3.5} fill="var(--series-2)" />
          </g>
        );
      })}
    </g>
  );
}

/**
 * Nargis track, simplified from NOAA IBTrACS to the points that explain the
 * eastward turn and Delta landfall. The animation shows sequence, not wind
 * field or storm size.
 */
function CycloneTrackLayer({ camera }: { camera: Camera }) {
  const track: [number, number][] = [
    [88.0, 12.4],
    [89.5, 13.4],
    [91.2, 14.7],
    [92.8, 15.4],
    [94.2, 15.8],
    [95.1, 16.1],
    [96.0, 16.55],
    [97.0, 17.0],
  ];
  const points = track.map((point) => screenPoint(point, camera.center, camera.zoom));
  const path = points.map(([x, y], index) => `${index === 0 ? "M" : "L"} ${x} ${y}`).join(" ");
  const [landX, landY] = screenPoint([95.1, 16.1], camera.center, camera.zoom);

  return (
    <g pointerEvents="none" className="cyclone-track">
      <path
        d={path}
        fill="none"
        stroke="var(--series-3)"
        strokeWidth={4}
        strokeLinecap="round"
        strokeDasharray="10 9"
        className="cyclone-track-line"
      />
      <circle cx={landX} cy={landY} r={4} fill="var(--series-3)" />
      <text x={landX + 18} y={landY - 8} fontSize={12} fontWeight={700} fill="var(--ink)">
        Delta landfall
      </text>
    </g>
  );
}

const worldFlagColours = {
  myanmar: ["#fecb00", "#34b233", "#ea2839"],
  "burma-1943": ["#f4d03f", "#3a8f56", "#c53b32"],
  "japan-imperial": ["#fff", "#bc002d", "#bc002d"],
  "united-kingdom": ["#21468b", "#fff", "#ae1c28"],
  gambia: ["#ce1126", "#0c1c8c", "#3a7728"],
  netherlands: ["#ae1c28", "#fff", "#21468b"],
} as const;

function FlagMark({ flag }: { flag: NonNullable<StepMapJourney["stops"][number]["flag"]> }) {
  const colours = worldFlagColours[flag];
  if (flag === "united-kingdom") {
    return <svg x={-18} y={-12} width={36} height={24} viewBox="0 0 60 40">
      <path fill="#012169" d="M0 0h60v40H0z" />
      <path stroke="#fff" strokeWidth={8} d="m0 0 60 40M60 0 0 40" />
      <path stroke="#c8102e" strokeWidth={3} d="m0 0 60 40M60 0 0 40" />
      <path stroke="#fff" strokeWidth={13} d="M30 0v40M0 20h60" />
      <path stroke="#c8102e" strokeWidth={7} d="M30 0v40M0 20h60" />
    </svg>;
  }
  if (flag === "japan-imperial") {
    return <g><rect x={-18} y={-12} width={36} height={24} fill="#fff" stroke="var(--paper)" />{Array.from({ length: 16 }, (_, index) => { const a = (Math.PI * 2 * index) / 16; const b = a + Math.PI / 16; return <path key={index} d={`M 0 0 L ${Math.cos(a) * 18} ${Math.sin(a) * 12} L ${Math.cos(b) * 18} ${Math.sin(b) * 12} Z`} fill="#bc002d" />; })}<circle r={5} fill="#bc002d" /></g>;
  }
  return <g><rect x={-18} y={-12} width={36} height={24} fill={colours[0]} stroke="var(--paper)" /><rect x={-18} y={-4} width={36} height={8} fill={colours[1]} /><rect x={-18} y={4} width={36} height={8} fill={colours[2]} /></g>;
}

function journeyProjection(journey: StepMapJourney, height: number) {
  const longitudes = journey.stops.map((stop) => stop.coordinates[0]);
  const latitudes = journey.stops.map((stop) => stop.coordinates[1]);
  const minLon = Math.min(...longitudes);
  const maxLon = Math.max(...longitudes);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const lonPad = Math.max(8, (maxLon - minLon) * 0.12);
  const latPad = Math.max(6, (maxLat - minLat) * 0.18);
  const left = minLon - lonPad;
  const right = maxLon + lonPad;
  const bottom = Math.max(-72, minLat - latPad);
  const top = Math.min(72, maxLat + latPad);
  const center: [number, number] = [(left + right) / 2, (bottom + top) / 2];
  const trial = geoMercator().center(center).scale(1).translate([0, 0]);
  const corners = [[left, bottom], [left, top], [right, bottom], [right, top]]
    .map((point) => trial(point as [number, number]))
    .filter((point): point is [number, number] => !!point);
  const xRange = Math.max(...corners.map((point) => point[0])) - Math.min(...corners.map((point) => point[0]));
  const yRange = Math.max(...corners.map((point) => point[1])) - Math.min(...corners.map((point) => point[1]));
  const scale = Math.min(840 / xRange, Math.max(260, height - 150) / yRange);
  return geoMercator().center(center).scale(scale).translate([VIEW.width / 2, height / 2]);
}

function WorldJourneyLayer({ journey, height }: { journey: StepMapJourney; height: number }) {
  const projection = journeyProjection(journey, height);
  const path = geoPath(projection);
  const projected = journey.stops.map((stop) => ({ ...stop, point: projection(stop.coordinates) }));
  return <g className="world-journey"><rect width={VIEW.width} height={height} fill="var(--map-water)" />
    {worldCountries.features.map((country, index) => <path key={index} d={path(country) ?? undefined} fill="var(--map-neighbour)" stroke="var(--map-neighbour-edge)" strokeWidth={0.7} vectorEffect="non-scaling-stroke" />)}
    {projected.slice(1).map((stop, index) => { const previous = projected[index]; if (!previous.point || !stop.point) return null; const [x1, y1] = previous.point; const [x2, y2] = stop.point; const bow = Math.min(110, Math.abs(x2 - x1) * 0.12 + 30); return <path key={`${previous.label}-${stop.label}`} d={`M ${x1} ${y1} Q ${(x1 + x2) / 2} ${(y1 + y2) / 2 - bow} ${x2} ${y2}`} fill="none" stroke="var(--series-2)" strokeWidth={4} strokeDasharray="10 10" className="world-route-line" />; })}
    {projected.map((stop) => {
      if (!stop.point) return null;
      const [x, y] = stop.point;
      const placeLeft = x > 760;
      return <g key={stop.label} transform={`translate(${x} ${y})`}>{stop.emphasis && <circle r={34} fill="var(--series-2-wash)" stroke="var(--series-2)" className="journey-pulse" />}{stop.flag ? <FlagMark flag={stop.flag} /> : <circle r={7} fill="var(--series-2)" />}<text x={placeLeft ? -24 : 24} y={5} textAnchor={placeLeft ? "end" : "start"} fontSize={16} fontWeight={700} fill="var(--ink)" stroke="var(--paper)" strokeWidth={5} paintOrder="stroke">{stop.label}</text></g>;
    })}
    {journey.caption && <text x={VIEW.width / 2} y={height - 24} textAnchor="middle" fontSize={13} fill="var(--ink-secondary)">{journey.caption}</text>}
  </g>;
}

function RadioPulseLayer({ camera }: { camera: Camera }) {
  const places: [number, number][] = [[96.1561, 16.8053], [96.0836, 21.9747], [95.0844, 21.3349], [92.8983, 20.1462]];
  return <g pointerEvents="none">{places.flatMap((place, placeIndex) => { const [x, y] = screenPoint(place, camera.center, camera.zoom); return [0, 1, 2].map((ring) => <circle key={`${placeIndex}-${ring}`} cx={x} cy={y} r={7 + ring * 9} fill="none" stroke="#d59b2c" strokeWidth={2} className="radio-pulse" style={{ animationDelay: `${placeIndex * 180 + ring * 240}ms` }} />); })}</g>;
}

function AlliedLiberationLayer() {
  return <g pointerEvents="none" className="allied-liberation">{states.features.map((feature, index) => <path key={feature.properties.name} d={toPath(feature)} fill="var(--series-2)" fillOpacity={0.45} stroke="var(--series-2)" strokeWidth={1} style={{ animationDelay: `${index * 80}ms` }} />)}</g>;
}

function CurrentControlLayer() {
  const predominantlyResistance = new Set(["Rakhine"]);
  const predominantlyMilitary = new Set(["Yangon", "Ayeyarwady", "Naypyitaw"]);
  return <g pointerEvents="none" className="current-control-layer">{states.features.map((feature) => {
    const name = feature.properties.name;
    const fill = predominantlyResistance.has(name)
      ? "var(--series-2)"
      : predominantlyMilitary.has(name)
        ? "var(--series-1)"
        : "url(#control-mixed)";
    return <path
      key={name}
      d={toPath(feature)}
      fill={fill}
      fillOpacity={predominantlyResistance.has(name) || predominantlyMilitary.has(name) ? 0.58 : 0.9}
      stroke="var(--map-outline)"
      strokeWidth={0.9}
      vectorEffect="non-scaling-stroke"
    />;
  })}</g>;
}

/**
 * Cities where demonstrations were reported.
 *
 * Circle area is city population, NOT crowd size -- no reliable crowd counts
 * exist for 1988 or 2021. The legend states this, because a reader who assumes
 * otherwise would be reading a demographic map as a protest-size map.
 */
function ProtestLayer({ camera }: { camera: Camera }) {
  const marks = useMemo(
    () =>
      cities
        .filter((c) => c.country === "MM" && (c.population ?? 0) > 100_000)
        .slice(0, 22),
    [],
  );

  return (
    <g>
      {marks.map((city, i) => {
        const [x, y] = screenPoint(city.coordinates, camera.center, camera.zoom);
        // Area encodes population, so the radius follows its square root and
        // grows with the camera -- these read as places, not as pins.
        const r = Math.sqrt((city.population ?? 0) / 1000) * 0.42 * camera.zoom;
        return (
          <circle
            key={city.name}
            cx={x}
            cy={y}
            r={r}
            fill="var(--series-1)"
            fillOpacity={0.22}
            stroke="var(--series-1)"
            strokeWidth={1.2}
            style={{
              transformOrigin: `${x}px ${y}px`,
              animation: "protest-bloom 900ms ease-out both",
              animationDelay: `${i * 70}ms`,
            }}
          />
        );
      })}
    </g>
  );
}

/** Place labels, sized against the camera so they stay readable at any zoom. */
function CityLabels({ camera }: { camera: Camera }) {
  const shown = useMemo(() => {
    // More zoom earns more labels; at country scale only the largest places
    // are named, which keeps the frame from turning into a word cloud.
    const floor = camera.zoom > 2.6 ? 0 : camera.zoom > 1.6 ? 120_000 : 400_000;
    return cities.filter(
      (c) =>
        c.country === "MM" &&
        ((c.population ?? 0) >= floor || c.capital || (camera.zoom > 2 && c.stateCapital)),
    );
  }, [camera.zoom]);

  /*
   * Greedy de-collision. Cities arrive sorted by population, so when two
   * labels would overlap the larger place keeps its name and the smaller one
   * is dropped. Without this, Yangon was painted over by the halo of
   * Hlaingthaya, one of its own townships.
   */
  const placed: { x: number; y: number; w: number }[] = [];

  return (
    <g>
      {shown.map((city) => {
        const [x, y] = screenPoint(city.coordinates, camera.center, camera.zoom);
        if (x < -40 || x > VIEW.width + 40 || y < -40 || y > VIEW.height + 40) return null;

        const w = city.name.length * 7 + 14;
        const clash = placed.some(
          (p) => Math.abs(p.y - y) < 15 && x < p.x + p.w && x + w > p.x,
        );
        if (clash) return null;
        placed.push({ x, y, w });

        return <CityMark key={city.name} city={city} x={x} y={y} />;
      })}
    </g>
  );
}

function CityMark({ city, x, y }: { city: City; x: number; y: number }) {
  const major = city.capital || (city.population ?? 0) > 500_000;
  return (
    <g>
      <circle
        cx={x}
        cy={y}
        r={major ? 3.2 : 2.1}
        fill="var(--ink)"
        fillOpacity={major ? 0.85 : 0.5}
      />
      <text
        x={x + 6}
        y={y + 3.5}
        className="font-mono"
        fontSize={major ? 12.5 : 11}
        fill="var(--ink-secondary)"
        stroke="var(--paper)"
        strokeWidth={3}
        paintOrder="stroke"
        style={{ letterSpacing: "0.02em" }}
      >
        {city.name}
      </text>
    </g>
  );
}

/**
 * Circles wherever the camera has moved in to.
 *
 * The radius shrinks as the camera tightens, so the ring keeps marking an
 * area rather than growing into a border around the whole frame.
 */
function FocusRing({ camera }: { camera: Camera }) {
  const x = VIEW.width / 2;
  const y = VIEW.height / 2;
  const r = Math.max(74, 190 / camera.zoom);
  return (
    <g filter="url(#rough)" opacity={0.85} style={{ pointerEvents: "none" }}>
      <ellipse
        cx={x}
        cy={y}
        rx={r}
        ry={r * 0.84}
        fill="none"
        stroke="var(--series-1)"
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeDasharray={`${r * 5.2} ${r * 1.1}`}
        style={{ animation: "ring-draw 900ms ease-out both" }}
      />
    </g>
  );
}

export default function StoryMap({
  focus,
  motionPaused = false,
  layers = [],
  stepId = "",
  territoryAsOf,
  actors = [],
  visual,
  onSelectActor,
}: StoryMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [viewport, setViewport] = useState({ height: VIEW.height as number, width: 1000 });
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setViewport({ width, height: 1000 * height / width });
    });
    observer.observe(svg);
    return () => observer.disconnect();
  }, []);
  const fittedFocus = { ...focus, zoom: focus.zoom * Math.min(1, viewport.height / VIEW.height) * 0.92 };
  const camera = useCameraTween(fittedFocus, motionPaused ? 0 : 750);
  const frameTop = (VIEW.height - viewport.height) / 2;

  const has = (name: string) => layers.includes(name);

  const highlighted = useMemo(() => {
    if (!territoryAsOf) return new Set<string>();
    return new Set(
      territory.filter((t) => t.asOf <= territoryAsOf).flatMap((t) => t.areas),
    );
  }, [territoryAsOf]);

  const transform = cameraTransform(camera.center, camera.zoom);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${VIEW.width} ${viewport.height}`}
      className="h-full w-full"
      /* Fill the stage rather than letterbox inside it. The frame is taller
         than most viewports, so "meet" left wide bands of empty page down
         both sides and the map never looked like a map. */
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Map of Myanmar"
    >
      <defs>
        {/*
          A little turbulence on the annotation stroke. A perfectly smooth
          ring reads as interface chrome; a slightly broken one reads as
          someone circling a place on a printed map, which is the point.
        */}
        <filter id="rough">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="7" />
          <feDisplacementMap in="SourceGraphic" scale="3.2" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        {[1, 2, 3].map((slot) => (
          <pattern
            key={slot}
            id={`hatch-${slot}`}
            width={7}
            height={7}
            patternTransform="rotate(45)"
            patternUnits="userSpaceOnUse"
          >
            <rect width={7} height={7} fill={`var(--series-${slot}-wash)`} />
            <line
              x1={0}
              y1={0}
              x2={0}
              y2={7}
              stroke={`var(--series-${slot})`}
              strokeWidth={1.6}
              strokeOpacity={0.5}
            />
          </pattern>
        ))}
        <pattern id="control-mixed" width={18} height={18} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width={18} height={18} fill="var(--map-land)" />
          <line x1={2} y1={0} x2={2} y2={18} stroke="var(--series-2)" strokeWidth={3} strokeOpacity={0.55} />
          <line x1={11} y1={0} x2={11} y2={18} stroke="var(--series-1)" strokeWidth={2} strokeOpacity={0.42} />
        </pattern>
      </defs>

      <rect width={VIEW.width} height={viewport.height} fill="var(--map-water)" />
      <g transform={`translate(0 ${-frameTop})`}>
      <g transform={transform}>
        <BaseGeography />
        <AdminUnits highlighted={highlighted} />
        {visual?.map?.fills && <HistoricalFillLayer key={stepId} fills={visual.map.fills} />}
        {has("allied-liberation") && <AlliedLiberationLayer />}
        {has("current-control-trace") && <CurrentControlLayer />}
        <Rivers />
        {/* Drawn over the states so the country reads as one shape first and
            a set of administrative units second. */}
        <path
          d={toPath(outline)}
          fill="none"
          stroke="var(--map-outline)"
          strokeWidth={2.2}
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {territoryAsOf && <TerritoryLayer asOf={territoryAsOf} />}
      </g>

      {/* Overlays sit outside the camera transform so marks keep their size. */}
      {/*
        When a step moves in on somewhere specific, say so on the map rather
        than leaving the reader to infer which shape the paragraph means.
      */}
      {has("focus-ring") && <FocusRing camera={camera} />}
      {has("protest-spread") && <ProtestLayer key={stepId} camera={camera} />}
      {has("protest-radio") && <RadioPulseLayer key={stepId} camera={camera} />}
      {(has("flight-to-border") || has("rohingya-flow")) && (
        <FlowLayer stepId={stepId} camera={camera} />
      )}
      {has("cyclone-track") && <CycloneTrackLayer camera={camera} />}
      {!has("colonial-split") && !visual?.map?.actors?.length && !visual?.map?.annotations?.length && !has("current-control-trace") && !visual?.map?.journey && <CityLabels camera={camera} />}
      {visual?.map?.annotations && (
        <AnnotationLayer annotations={visual.map.annotations} camera={camera} />
      )}
      {visual?.map?.actors && (
        <ActorMapLayer
          marks={visual.map.actors}
          frameTop={frameTop}
          frameHeight={viewport.height}
          actors={actors}
          camera={camera}
          onSelectActor={onSelectActor}
        />
      )}
      </g>
      {visual?.map?.journey && <WorldJourneyLayer key={stepId} journey={visual.map.journey} height={viewport.height} />}
    </svg>
  );
}
