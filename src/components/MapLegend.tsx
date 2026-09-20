"use client";

import type { Step } from "@/lib/types";

/**
 * What the marks on the map mean, plus what they explicitly do not mean.
 *
 * The caveats are the point. A circle sized by city population sitting over a
 * protest map will be read as crowd size unless something says otherwise, and
 * an arc between two cities will be read as a route. Saying so in the legend
 * costs three lines; not saying so turns a proxy into a fabricated finding.
 */
export default function MapLegend({ layers, step }: { layers: string[]; step: Step }) {
  const entries = buildEntries(layers);
  if (entries.length === 0) return null;

  return (
    <aside className="pointer-events-none absolute bottom-28 left-3 max-w-[19rem] border border-rule bg-paper/92 p-3 backdrop-blur-sm">
      <p className="label mb-2">Reading this map</p>
      <dl className="space-y-2">
        {entries.map((e) => (
          <div key={e.term} className="flex gap-2.5">
            <span className="mt-[3px] shrink-0">{e.swatch}</span>
            <div>
              <dt className="text-[0.78rem] leading-tight text-ink">{e.term}</dt>
              {e.caveat && (
                <dd className="mt-0.5 text-[0.72rem] leading-snug text-ink-muted">
                  {e.caveat}
                </dd>
              )}
            </div>
          </div>
        ))}
      </dl>
      {step.uncertainty?.startsWith("[DATA NEEDED") && (
        <p className="mt-2.5 border-t border-rule pt-2 text-[0.7rem] leading-snug text-ink-muted">
          This step has an open data gap. See the methodology note.
        </p>
      )}
    </aside>
  );
}

interface Entry {
  term: string;
  caveat?: string;
  swatch: React.ReactNode;
}

const Dot = ({ color, opacity = 1 }: { color: string; opacity?: number }) => (
  <svg width="13" height="13" aria-hidden>
    <circle cx="6.5" cy="6.5" r="5.5" fill={color} fillOpacity={opacity} stroke={color} />
  </svg>
);

const Dash = ({ color }: { color: string }) => (
  <svg width="13" height="13" aria-hidden>
    <line
      x1="0"
      y1="6.5"
      x2="13"
      y2="6.5"
      stroke={color}
      strokeWidth="2"
      strokeDasharray="4 3"
    />
  </svg>
);

const Hatched = () => (
  <svg width="13" height="13" aria-hidden>
    <rect width="13" height="13" fill="var(--series-2-wash)" />
    <path d="M -3 13 L 13 -3 M 0 16 L 16 0" stroke="var(--series-2)" strokeWidth="1.4" />
  </svg>
);

function buildEntries(layers: string[]): Entry[] {
  const entries: Entry[] = [];

  if (layers.includes("protest-spread")) {
    entries.push({
      term: "Cities where demonstrations were reported",
      caveat:
        "Circle area is the city's population, not the size of the crowd. No reliable crowd counts exist.",
      swatch: <Dot color="var(--series-1)" opacity={0.22} />,
    });
  }

  if (layers.includes("flight-to-border")) {
    entries.push({
      term: "Direction of movement",
      caveat:
        "An arc points from one region toward another. It is not a route -- journey-level data does not exist.",
      swatch: <Dash color="var(--series-2)" />,
    });
  }

  if (layers.includes("conflict-intensity")) {
    entries.push(
      {
        term: "Documented control",
        caveat: "Shown at whole-state resolution, which is coarser than the situation on the ground.",
        swatch: <Dot color="var(--series-1)" opacity={0.3} />,
      },
      {
        term: "Probable or contested",
        caveat: "Hatching marks weaker evidence. Uncertainty is never given a colour of its own.",
        swatch: <Hatched />,
      },
    );
  }

  if (layers.includes("opposition-network")) {
    entries.push({
      term: "Relationships, not a hierarchy",
      caveat:
        "Line style carries the kind of relationship. Position carries nothing -- no organisation sits above another.",
      swatch: <Dash color="var(--ink-muted)" />,
    });
  }

  return entries;
}
