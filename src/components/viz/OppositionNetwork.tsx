"use client";

import { useMemo } from "react";

import { imageFor } from "@/components/ActorBubble";
import { asset } from "@/lib/asset";
import type { Actor, Relationship, RelationshipKind } from "@/lib/types";

/**
 * The post-coup political landscape as a set of relationships.
 *
 * An earlier version of this laid every organisation out on a ring. That was
 * wrong twice over. It put the UWSA and the Arakan Army among the resistance,
 * when the first has held a ceasefire with the military since 1989 and the
 * second pursues its own Arakan project outside the NUG framework; and the
 * ring packed labels close enough that edges ran through them.
 *
 * So the layout is now an explicit grid of named groups, each organisation
 * carries a one-line note saying what it actually is, and the group that sits
 * outside the anti-coup camp is labelled as such rather than folded in.
 *
 * Nothing sits at the centre, because nothing commands the rest. Position
 * encodes group membership and nothing else; only line style carries meaning.
 */

const W = 820;
const H = 600;
const COL_X = [140, 410, 680];
const ROW_Y = [100, 395];
const NODE_GAP = 66;
/** Bubble radius. Spacing above is set so labels never reach the next node. */
const R = 21;

interface Node {
  id: string;
  note: string;
}

interface Group {
  label: string;
  col: number;
  row: number;
  /** Groups that are not part of the anti-coup camp are marked, not hidden. */
  aside?: boolean;
  nodes: Node[];
}

const GROUPS: Group[] = [
  {
    label: "Interim national institutions",
    col: 0,
    row: 0,
    nodes: [
      { id: "crph", note: "the 2020 MPs" },
      { id: "nug", note: "executive" },
      { id: "nucc", note: "where the union is argued" },
    ],
  },
  {
    label: "State-level governance",
    col: 0,
    row: 1,
    nodes: [
      { id: "kscc", note: "Karenni forum" },
      { id: "iec", note: "Karenni executive" },
    ],
  },
  {
    label: "Post-coup armed resistance",
    col: 1,
    row: 0,
    nodes: [
      { id: "pdf", note: "a label, not one army" },
      { id: "ldo", note: "township-raised" },
      { id: "kndf", note: "Karenni umbrella" },
    ],
  },
  {
    label: "Civil movements",
    col: 1,
    row: 1,
    nodes: [
      { id: "cdm", note: "withdrawal of labour" },
      { id: "nld", note: "party, not government" },
    ],
  },
  {
    label: "Ethnic armed organisations",
    col: 2,
    row: 0,
    nodes: [
      { id: "knu", note: "at war since 1949" },
      { id: "kio", note: "trains recruits" },
      { id: "knpp", note: "Karenni, since 1957" },
      { id: "cnf", note: "Chin, since 1988" },
    ],
  },
  {
    label: "Outside the anti-coup camp",
    col: 2,
    row: 1,
    aside: true,
    nodes: [
      { id: "ula-aa", note: "fights the army, not under the NUG" },
      { id: "uwsa", note: "ceasefire since 1989" },
    ],
  },
];

const EDGE_STYLE: Record<
  RelationshipKind,
  { dash?: string; width: number; opacity: number; tone: string }
> = {
  "cooperates-with": { width: 1.8, opacity: 0.8, tone: "var(--ink-secondary)" },
  "aligned-on-some-objectives": { dash: "7 5", width: 1.6, opacity: 0.75, tone: "var(--ink-secondary)" },
  "politically-distinct": { dash: "1.5 5", width: 1.7, opacity: 0.8, tone: "var(--series-3)" },
  conflict: { width: 2, opacity: 0.8, tone: "var(--series-1)" },
  ceasefire: { dash: "11 5", width: 1.6, opacity: 0.75, tone: "var(--series-3)" },
  competitive: { dash: "9 3 2 3", width: 1.7, opacity: 0.8, tone: "var(--series-1)" },
  historical: { width: 1.2, opacity: 0.35, tone: "var(--ink-muted)" },
  uncertain: { dash: "2 6", width: 1.6, opacity: 0.65, tone: "var(--ink-muted)" },
};

const LEGEND: RelationshipKind[] = [
  "cooperates-with",
  "aligned-on-some-objectives",
  "politically-distinct",
  "ceasefire",
];

const LEGEND_LABEL: Record<string, string> = {
  "cooperates-with": "cooperates with",
  "aligned-on-some-objectives": "aligned on some objectives",
  "politically-distinct": "politically distinct",
  ceasefire: "ceasefire with the military",
};

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

  const placed = useMemo(() => {
    const map = new Map<string, { x: number; y: number; note: string; aside: boolean }>();
    for (const group of GROUPS) {
      group.nodes.forEach((node, i) => {
        map.set(node.id, {
          x: COL_X[group.col],
          y: ROW_Y[group.row] + i * NODE_GAP,
          note: node.note,
          aside: !!group.aside,
        });
      });
    }
    return map;
  }, []);

  const edges = relationships.filter((r) => placed.has(r.from) && placed.has(r.to));
  const isLit = (id: string) => highlight.length === 0 || highlight.includes(id);

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-3">
      <div className="pointer-events-auto max-h-full w-full max-w-[46rem] overflow-y-auto border border-rule bg-paper/95 p-3 backdrop-blur-sm">
        <p className="label mb-0.5">The resistance is not one organisation</p>

        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          role="img"
          aria-label="Grouped network of post-coup political and armed organisations and the relationships between them"
        >
          {GROUPS.map((group) => {
            const x = COL_X[group.col];
            const y = ROW_Y[group.row];
            return (
              <g key={group.label}>
                <line
                  x1={x - 112}
                  y1={y - 30}
                  x2={x + 112}
                  y2={y - 30}
                  stroke={group.aside ? "var(--series-3)" : "var(--rule-strong)"}
                  strokeWidth={1}
                />
                <text
                  x={x - 112}
                  y={y - 38}
                  className="font-mono"
                  fontSize={10}
                  fill={group.aside ? "var(--series-3)" : "var(--ink-muted)"}
                  style={{ letterSpacing: "0.1em", textTransform: "uppercase" }}
                >
                  {group.label}
                </text>
              </g>
            );
          })}

          {edges.map((edge) => {
            const a = placed.get(edge.from)!;
            const b = placed.get(edge.to)!;
            const style = EDGE_STYLE[edge.kind];
            const lit = isLit(edge.from) && isLit(edge.to);

            // Route around the label boxes rather than through them: the
            // control point is offset perpendicular to the run.
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const len = Math.hypot(dx, dy) || 1;
            const bow = Math.min(46, len * 0.16);
            // Start and end on the rim so lines do not run under the faces.
            const ax = a.x + (dx / len) * R;
            const ay = a.y + (dy / len) * R;
            const bx = b.x - (dx / len) * R;
            const by = b.y - (dy / len) * R;
            const qx = (a.x + b.x) / 2 - (dy / len) * bow;
            const qy = (a.y + b.y) / 2 + (dx / len) * bow;

            return (
              <path
                key={`${edge.from}-${edge.to}-${edge.kind}`}
                d={`M ${ax} ${ay} Q ${qx} ${qy} ${bx} ${by}`}
                fill="none"
                stroke={style.tone}
                strokeWidth={style.width}
                strokeDasharray={style.dash}
                strokeLinecap="round"
                opacity={lit ? style.opacity : style.opacity * 0.18}
                style={{ transition: "opacity 450ms ease" }}
              />
            );
          })}

          {[...placed.entries()].map(([id, p]) => {
            const actor = byId.get(id);
            if (!actor) return null;
            const label = actor.abbr?.replace(/\s*\/.*$/, "") ?? actor.name;
            const lit = isLit(id);
            const image = imageFor(id);
            const ring = p.aside ? "var(--series-3)" : "var(--ink-secondary)";

            return (
              <g
                key={id}
                onClick={() => onSelectActor(id)}
                className="cursor-pointer"
                opacity={lit ? 1 : 0.28}
                style={{ transition: "opacity 450ms ease" }}
              >
                <title>{actor.name}</title>

                <circle cx={p.x} cy={p.y} r={R} fill="var(--paper-raised)" />
                {image ? (
                  <>
                    <clipPath id={`bubble-${id}`}>
                      <circle cx={p.x} cy={p.y} r={R} />
                    </clipPath>
                    <image
                      href={asset(image.file)}
                      x={p.x - R}
                      y={p.y - R}
                      width={R * 2}
                      height={R * 2}
                      clipPath={`url(#bubble-${id})`}
                      /* A face fills the circle; a flag is letterboxed inside
                         it, since cropping a flag to a circle removes the part
                         that identifies it. */
                      preserveAspectRatio={
                        image.kind === "portrait" ? "xMidYMid slice" : "xMidYMid meet"
                      }
                    />
                  </>
                ) : (
                  /* No freely-licensed emblem exists for this organisation.
                     A plain disc rather than initials, because the name is
                     already directly below and repeating it twice in one mark
                     just made the diagram noisier. */
                  <circle cx={p.x} cy={p.y} r={R - 6} fill="var(--paper-sunk)" />
                )}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={R}
                  fill="none"
                  stroke={ring}
                  strokeWidth={lit ? 1.6 : 1}
                />

                <text
                  x={p.x}
                  y={p.y + R + 15}
                  textAnchor="middle"
                  className="font-mono"
                  fontSize={11}
                  fill="var(--ink)"
                >
                  {label}
                </text>
                <text
                  x={p.x}
                  y={p.y + R + 28}
                  textAnchor="middle"
                  fontSize={9.5}
                  fill="var(--ink-muted)"
                >
                  {p.note}
                </text>
              </g>
            );
          })}
        </svg>

        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 border-t border-rule pt-1.5">
          {LEGEND.map((kind) => {
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
                {LEGEND_LABEL[kind]}
              </span>
            );
          })}
        </div>
        <p className="mt-1 text-[0.68rem] leading-snug text-ink-muted">
          Grouping is the only thing position encodes. Nothing sits at the centre because
          nothing commands the rest.
        </p>
      </div>
    </div>
  );
}
