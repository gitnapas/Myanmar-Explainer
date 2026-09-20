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
  const seats = Array.from({ length: total }, (_, i) => {
    let cursor = 0;
    const owner = data.find((d) => {
      cursor += d.value;
      return i < cursor;
    });
    return owner?.tone ?? "neutral";
  });

  return (
    <div className="mt-4 grid grid-cols-10 gap-1" aria-label={`${total} parliament seats`}>
      {seats.map((tone, i) => (
        <span key={i} aria-hidden className={`aspect-square min-h-2 ${toneClass[tone]}`} />
      ))}
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
