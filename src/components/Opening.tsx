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
      className="opening relative flex flex-col justify-between overflow-hidden border-b border-rule bg-paper"
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
          Work in Progress, facts need to be adjusted and layout and map may be inaccurate
        </p>
        <a href="#story" className="begin-link">Explore the history <span aria-hidden>↓</span></a>
      </div>
    </header>
  );
}
