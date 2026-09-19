"use client";

import { useMemo } from "react";
import type { Actor, Relationship, RelationshipKind } from "@/lib/types";

/**
 * The post-coup political landscape as a set of relationships.
 *
 * The layout is a ring of peer clusters with nothing in the middle. That is
 * the argument the visualisation exists to make: the NUG is the most visible
 * opposition body but it does not sit above the ethnic armed organisations or
 * command most of the local defence groups, and any layout with a root node
 * would assert a chain of command that does not exist.
 *
 * Positions are fixed and carry no meaning beyond grouping. Only line style
 * encodes anything.
 */

const W = 660;
const H = 540;

/** Cluster angles around the ring, in degrees, clockwise from top. */
const CLUSTERS: { id: string; label: string; angle: number; members: string[] }[] = [
  {
    id: "movement",
    label: "Movements",
    angle: 0,
    members: ["cdm", "nld"],
  },
  {
    id: "eao",
    label: "Ethnic armed organisations",
    angle: 88,
    members: ["knu", "kio", "knpp", "ula-aa", "uwsa"],
  },
  {
    id: "armed",
    label: "Post-coup armed resistance",
    angle: 180,
    members: ["pdf", "ldo", "kndf"],
  },
  {
    id: "interim",
    label: "Interim institutions",
    angle: 268,
    members: ["crph", "nug", "nucc", "kscc", "iec"],
  },
];

const EDGE_STYLE: Record<RelationshipKind, { dash?: string; width: number; opacity: number; tone: string }> = {
  "cooperates-with": { width: 1.8, opacity: 0.75, tone: "var(--ink-secondary)" },
  "aligned-on-some-objectives": { dash: "7 5", width: 1.6, opacity: 0.7, tone: "var(--ink-secondary)" },
  "politically-distinct": { dash: "1.5 5", width: 1.6, opacity: 0.7, tone: "var(--ink-muted)" },
  conflict: { width: 2, opacity: 0.8, tone: "var(--series-1)" },
  ceasefire: { dash: "11 5", width: 1.6, opacity: 0.7, tone: "var(--series-3)" },
  competitive: { dash: "9 3 2 3", width: 1.7, opacity: 0.75, tone: "var(--series-1)" },
  historical: { width: 1.2, opacity: 0.32, tone: "var(--ink-muted)" },
  uncertain: { dash: "2 6", width: 1.6, opacity: 0.6, tone: "var(--ink-muted)" },
};

const LEGEND: { kind: RelationshipKind; label: string }[] = [
  { kind: "cooperates-with", label: "cooperates with" },
  { kind: "aligned-on-some-objectives", label: "aligned on some objectives" },
  { kind: "politically-distinct", label: "politically distinct" },
  { kind: "ceasefire", label: "ceasefire" },
  { kind: "conflict", label: "in conflict" },
  { kind: "uncertain", label: "uncertain" },
];

export default function OppositionNetwork({
  actors,
  relationships,
  highlight,
  onSelectActor,
}: {
  actors: Actor[];
  relationships: Relationship[];
  highlight: string[];
  onSelectActor: (id: string) => void;
}) {
  const byId = useMemo(() => new Map(actors.map((a) => [a.id, a])), [actors]);

  const positions = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    const cx = W / 2;
    const cy = H / 2 + 6;
    const ringX = 214;
    const ringY = 176;

    for (const cluster of CLUSTERS) {
      const theta = ((cluster.angle - 90) * Math.PI) / 180;
      const hubX = cx + Math.cos(theta) * ringX;
      const hubY = cy + Math.sin(theta) * ringY;

      // Fan the members of a cluster along the tangent so labels do not stack.
      const n = cluster.members.length;
      cluster.members.forEach((id, i) => {
        const offset = (i - (n - 1) / 2) * 54;
        const tangent = theta + Math.PI / 2;
        map.set(id, {
          x: hubX + Math.cos(tangent) * offset * 0.85,
          y: hubY + Math.sin(tangent) * offset * 0.85 + (i % 2 ? 13 : -13),
        });
      });
    }
    return map;
  }, []);

  const edges = relationships.filter(
    (r) => positions.has(r.from) && positions.has(r.to),
  );

  const isLit = (id: string) => highlight.length === 0 || highlight.includes(id);

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4">
      <div className="pointer-events-auto w-full max-w-[42rem] border border-rule bg-paper/94 p-3 backdrop-blur-sm">
        <p className="label mb-1">The resistance is not one organisation</p>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img"
          aria-label="Network of relationships between post-coup political and armed organisations">

          {CLUSTERS.map((cluster) => {
            const members = cluster.members.map((id) => positions.get(id)!).filter(Boolean);
            if (members.length === 0) return null;
            const lx = members.reduce((s, p) => s + p.x, 0) / members.length;
            const ly = Math.min(...members.map((p) => p.y)) - 26;
            return (
              <text
                key={cluster.id}
                x={lx}
                y={ly}
                textAnchor="middle"
                className="font-mono"
                fontSize={10}
                fill="var(--ink-muted)"
                style={{ letterSpacing: "0.12em", textTransform: "uppercase" }}
              >
                {cluster.label}
              </text>
            );
          })}

          {edges.map((edge) => {
            const a = positions.get(edge.from)!;
            const b = positions.get(edge.to)!;
            const style = EDGE_STYLE[edge.kind];
            const lit = isLit(edge.from) && isLit(edge.to);

            // Bow every edge away from the centre so the ring stays open and
            // chords do not pile up through the middle.
            const mx = (a.x + b.x) / 2;
            const my = (a.y + b.y) / 2;
            const bow = 0.16;
            const qx = mx + (mx - W / 2) * bow;
            const qy = my + (my - H / 2) * bow;

            return (
              <path
                key={`${edge.from}-${edge.to}-${edge.kind}`}
                d={`M ${a.x} ${a.y} Q ${qx} ${qy} ${b.x} ${b.y}`}
                fill="none"
                stroke={style.tone}
                strokeWidth={style.width}
                strokeDasharray={style.dash}
                strokeLinecap="round"
                opacity={lit ? style.opacity : style.opacity * 0.22}
                style={{ transition: "opacity 450ms ease" }}
              />
            );
          })}

          {[...positions.entries()].map(([id, p]) => {
            const actor = byId.get(id);
            if (!actor) return null;
            const lit = isLit(id);
            const label = actor.abbr ?? actor.name;
            return (
              <g
                key={id}
                onClick={() => onSelectActor(id)}
                className="cursor-pointer"
                opacity={lit ? 1 : 0.3}
                style={{ transition: "opacity 450ms ease" }}
              >
                <rect
                  x={p.x - label.length * 3.6 - 7}
                  y={p.y - 10}
                  width={label.length * 7.2 + 14}
                  height={20}
                  fill="var(--paper-raised)"
                  stroke={lit ? "var(--ink-secondary)" : "var(--rule)"}
                  strokeWidth={1}
                />
                <text
                  x={p.x}
                  y={p.y + 4}
                  textAnchor="middle"
                  className="font-mono"
                  fontSize={11}
                  fill="var(--ink)"
                >
                  {label}
                </text>
              </g>
            );
          })}
        </svg>

        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 border-t border-rule pt-2">
          {LEGEND.map(({ kind, label }) => {
            const s = EDGE_STYLE[kind];
            return (
              <span key={kind} className="flex items-center gap-1.5 text-[0.68rem] text-ink-muted">
                <svg width="20" height="8" aria-hidden>
                  <line
                    x1="0"
                    y1="4"
                    x2="20"
                    y2="4"
                    stroke={s.tone}
                    strokeWidth={s.width}
                    strokeDasharray={s.dash}
                    opacity={s.opacity}
                  />
                </svg>
                {label}
              </span>
            );
          })}
        </div>
        <p className="mt-1.5 text-[0.68rem] leading-snug text-ink-muted">
          Position carries no meaning. Nothing sits at the centre because nothing commands the rest.
        </p>
      </div>
    </div>
  );
}
