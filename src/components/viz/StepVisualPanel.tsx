import { asset } from "@/lib/asset";
import type { GraphicDatum, StepGraphic, VisualTone } from "@/lib/types";

const toneClass: Record<VisualTone, string> = {
  colonial: "bg-series-1",
  occupation: "bg-series-3",
  independence: "bg-amber-500",
  military: "bg-series-1",
  resistance: "bg-series-2",
  civilian: "bg-series-3",
  warning: "bg-amber-500",
  neutral: "bg-ink-muted",
};

export default function StepVisualPanel({ graphic }: { graphic: StepGraphic }) {
  if (graphic.type === "media") return <MediaCard graphic={graphic} />;

  const data = graphic.data ?? [];
  const maximum = graphic.total ?? Math.max(...data.map((d) => Math.abs(d.value)), 1);

  return (
    <figure className="mt-6 border-y border-rule bg-paper-raised/75 px-4 py-4">
      {graphic.eyebrow && <p className="label">{graphic.eyebrow}</p>}
      <figcaption className="mt-1 text-[0.95rem] font-semibold leading-snug text-ink">
        {graphic.title}
      </figcaption>
      {graphic.subtitle && (
        <p className="mt-1 text-[0.76rem] leading-relaxed text-ink-muted">{graphic.subtitle}</p>
      )}

      {graphic.type === "parliament" ? (
        <ParliamentSeats data={data} total={graphic.total ?? 100} />
      ) : (
        <BarRows data={data} maximum={maximum} unit={graphic.unit} />
      )}

      {graphic.overlay && (
        <div className="relative mt-4 overflow-hidden border-2 border-series-1 px-3 py-2 text-center font-mono text-[0.72rem] font-bold uppercase tracking-[0.12em] text-series-1">
          <span className="absolute left-[-8%] top-1/2 h-px w-[116%] -rotate-3 bg-series-1" />
          <span className="relative bg-paper-raised px-2">{graphic.overlay}</span>
        </div>
      )}
    </figure>
  );
}

function BarRows({
  data,
  maximum,
  unit,
}: {
  data: GraphicDatum[];
  maximum: number;
  unit?: string;
}) {
  return (
    <div className="mt-4 space-y-3">
      {data.map((datum) => {
        const width = Math.max(2, (Math.abs(datum.value) / maximum) * 100);
        const negative = datum.value < 0;
        return (
          <div key={datum.label}>
            <div className="mb-1 flex items-end justify-between gap-4 text-[0.76rem]">
              <span className="text-ink-secondary">{datum.label}</span>
              <span className="font-mono tabular-nums text-ink">
                {datum.display ?? `${datum.value}${unit ?? ""}`}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden bg-paper-sunk">
              <div
                className={`h-full origin-left transition-[width] duration-700 ${
                  negative ? "bg-series-1" : toneClass[datum.tone ?? "neutral"]
                }`}
                style={{ width: `${width}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ParliamentSeats({ data, total }: { data: GraphicDatum[]; total: number }) {
  const tones = Array.from({ length: total }, (_, i) => {
    let cursor = 0;
    return data.find((datum) => {
      cursor += datum.value;
      return i < cursor;
    })?.tone ?? "neutral";
  });
  const toneFill: Record<VisualTone, string> = {
    colonial: "var(--series-1)", occupation: "var(--series-3)", independence: "#d6a928",
    military: "var(--series-1)", resistance: "var(--series-2)", civilian: "var(--series-3)",
    warning: "#d27a19", neutral: "var(--ink-muted)",
  };
  const ringCounts = total === 100 ? [12, 16, 20, 24, 28] : [Math.ceil(total * 0.12), Math.ceil(total * 0.16), Math.ceil(total * 0.2), Math.ceil(total * 0.24)];
  if (total !== 100) ringCounts.push(total - ringCounts.reduce((sum, value) => sum + value, 0));
  let seatIndex = 0;
  const dots = ringCounts.flatMap((count, ring) => Array.from({ length: count }, (_, index) => {
    const angle = Math.PI + (Math.PI * (index + 0.5)) / count;
    const radius = 54 + ring * 24;
    const dot = { x: 180 + Math.cos(angle) * radius, y: 174 + Math.sin(angle) * radius, tone: tones[seatIndex], key: seatIndex };
    seatIndex += 1;
    return dot;
  }));

  return (
    <div className="mt-4">
      <svg viewBox="0 0 360 190" className="w-full" role="img" aria-label={`${total} parliament seats arranged in a hemicycle`}>
        {dots.map((dot) => <circle key={dot.key} cx={dot.x} cy={dot.y} r={5.2} fill={toneFill[dot.tone]} stroke="var(--paper)" strokeWidth={1} />)}
      </svg>
      <div className="-mt-2 space-y-1.5">
        {data.map((datum) => <div key={datum.label} className="flex items-center justify-between gap-4 text-[0.72rem]"><span className="flex items-center gap-2 text-ink-secondary"><i className={`h-2.5 w-2.5 ${toneClass[datum.tone ?? "neutral"]}`} />{datum.label}</span><b className="font-mono font-normal text-ink">{datum.display ?? datum.value}</b></div>)}
      </div>
    </div>
  );
}
function MediaCard({ graphic }: { graphic: StepGraphic }) {
  const content = graphic.file ? (
    // Static export: the base-path helper keeps local media working on Pages.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={asset(graphic.file)}
      alt=""
      loading="lazy"
      decoding="async"
      className="aspect-[16/9] w-full object-cover grayscale-[20%]"
    />
  ) : (
    <div className="flex aspect-[16/7] items-center justify-center bg-paper-sunk px-5 text-center font-mono text-[0.76rem] text-ink-muted">
      Open archival footage
    </div>
  );

  return (
    <figure className="mt-6 overflow-hidden border border-rule bg-paper-raised">
      {graphic.href ? (
        <a href={graphic.href} target="_blank" rel="noreferrer" className="group block">
          {content}
          <span className="block border-t border-rule px-4 py-2 font-mono text-[0.7rem] text-ink group-hover:text-series-1">
            View source / footage &rarr;
          </span>
        </a>
      ) : (
        content
      )}
      <figcaption className="px-4 py-3">
        <p className="text-[0.82rem] leading-snug text-ink">{graphic.caption ?? graphic.title}</p>
        {graphic.credit && (
          <p className="mt-1 font-mono text-[0.64rem] leading-relaxed text-ink-muted">
            {graphic.credit}
          </p>
        )}
      </figcaption>
    </figure>
  );
}
