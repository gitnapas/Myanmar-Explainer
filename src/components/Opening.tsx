import { states, toPath, VIEW } from "@/lib/geo";

/**
 * The title card.
 *
 * The country is drawn as an outline only -- no fills, no labels, no actors.
 * It is the one moment in the piece where the map means nothing yet, which is
 * the point: everything the reader will later be able to read off it has to be
 * earned by the eighty years in between.
 */
export default function Opening() {
  return (
    <header
      data-era="colonial"
      className="relative flex min-h-[96vh] flex-col justify-between overflow-hidden border-b border-ink bg-paper px-6 py-12 lg:px-12"
    >
      <svg
        viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
        className="pointer-events-none absolute -right-[14%] top-1/2 h-[128%] -translate-y-1/2 opacity-[0.16]"
        aria-hidden
      >
        {states.features.map((f) => (
          <path
            key={f.properties.name}
            d={toPath(f)}
            fill="none"
            stroke="var(--ink)"
            strokeWidth={f.properties.kind === "state" ? 1.6 : 0.7}
            strokeLinejoin="round"
          />
        ))}
      </svg>

      <p className="label relative">An interactive history</p>

      <div className="relative max-w-[20ch]">
        <h1 className="display text-[3.4rem] leading-[0.95] sm:text-[4.6rem] lg:text-[6.2rem]">
          Myanmar:
          <br />A State
          <br />
          Unfinished
        </h1>
      </div>

      <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <p className="prose-narrow max-w-[46ch] text-[1.05rem] text-ink-secondary">
          How did Myanmar go from a colonial state to today&rsquo;s fragmented political and
          military landscape &mdash; and what political order is emerging from it?
        </p>
        <p className="label shrink-0">Scroll to begin &darr;</p>
      </div>
    </header>
  );
}
