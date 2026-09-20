"use client";

import { memo, useMemo } from "react";

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
  /** Named layers switched on by the current step. */
  layers?: string[];
  /** The step being read, used to pick which flows belong on screen. */
  stepId?: string;
  /** Territory claims are only drawn when a step asks for them. */
  territoryAsOf?: string;
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
  layers = [],
  stepId = "",
  territoryAsOf,
}: StoryMapProps) {
  const camera = useCameraTween(focus);

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
      viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
      className="h-full w-full"
      /* Fill the stage rather than letterbox inside it. The frame is taller
         than most viewports, so "meet" left wide bands of empty page down
         both sides and the map never looked like a map. */
      preserveAspectRatio="xMidYMid slice"
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
      </defs>

      <rect width={VIEW.width} height={VIEW.height} fill="var(--map-water)" />

      <g transform={transform}>
        <BaseGeography />
        <AdminUnits highlighted={highlighted} />
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
      {camera.zoom > 1.7 && <FocusRing camera={camera} />}
      {has("protest-spread") && <ProtestLayer camera={camera} />}
      {has("flight-to-border") && <FlowLayer stepId={stepId} camera={camera} />}
      <CityLabels camera={camera} />
    </svg>
  );
}
