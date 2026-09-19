"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import StoryMap from "@/components/map/StoryMap";
import Timeline from "@/components/Timeline";
import OppositionNetwork from "@/components/viz/OppositionNetwork";
import GovernanceStack from "@/components/viz/GovernanceStack";
import CdmSectors from "@/components/viz/CdmSectors";
import MapLegend from "@/components/MapLegend";
import SourcePanel from "@/components/panels/SourcePanel";
import ActorPanel from "@/components/panels/ActorPanel";
import type { Actor, Chapter, Relationship, Source, Step } from "@/lib/types";

interface StoryProps {
  chapters: Chapter[];
  steps: Step[];
  sources: Source[];
  actors: Actor[];
  relationships: Relationship[];
}

const HOME = { center: [96.5, 19.5] as [number, number], zoom: 1 };

export default function Story({
  chapters,
  steps,
  sources,
  actors,
  relationships,
}: StoryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [openSource, setOpenSource] = useState<string | null>(null);
  const [openActor, setOpenActor] = useState<string | null>(null);
  const stepRefs = useRef<(HTMLElement | null)[]>([]);

  const chapterById = useMemo(
    () => new Map(chapters.map((c) => [c.id, c])),
    [chapters],
  );
  const sourceById = useMemo(() => new Map(sources.map((s) => [s.id, s])), [sources]);
  const actorById = useMemo(() => new Map(actors.map((a) => [a.id, a])), [actors]);

  const step = steps[activeIndex];
  const chapter = chapterById.get(step.chapter);

  /**
   * The active step is whichever one is crossing the middle of the viewport.
   *
   * The negative margins collapse the observer's root to a thin band across
   * the centre, so exactly one step is intersecting at a time and the map
   * changes when a passage reaches the reader's eye rather than when it first
   * appears at the bottom of the screen.
   */
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const index = Number((entry.target as HTMLElement).dataset.index);
          if (!Number.isNaN(index)) setActiveIndex(index);
        }
      },
      { rootMargin: "-48% 0px -48% 0px", threshold: 0 },
    );

    const observed = stepRefs.current.filter(Boolean) as HTMLElement[];
    observed.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const jumpTo = useCallback((index: number) => {
    stepRefs.current[index]?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  const layers = step.layers ?? [];
  const focus = step.focus ?? HOME;

  return (
    <div data-era={chapter?.era} className="bg-paper">
      <div className="mx-auto grid max-w-[1600px] grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        {/*
          The map is the constant. It stays pinned while the text moves past it,
          so a reader is always watching one continuous country change rather
          than meeting a new illustration every screen.
        */}
        <div className="sticky top-0 z-0 h-[52vh] lg:h-screen">
          <div className="relative h-full w-full overflow-hidden">
            <StoryMap
              focus={focus}
              layers={layers}
              stepId={step.id}
              territoryAsOf={layers.includes("conflict-intensity") ? step.date : undefined}
            />

            {/* Mode-specific overlays sit on top of the map rather than replacing it. */}
            {layers.includes("opposition-network") && (
              <OppositionNetwork
                actors={actors}
                relationships={relationships}
                highlight={step.actors ?? []}
                onSelectActor={setOpenActor}
              />
            )}
            {layers.includes("governance-stack") && <GovernanceStack />}
            {layers.includes("cdm-sectors") && <CdmSectors />}

            <MapLegend layers={layers} step={step} />
          </div>
        </div>

        <div className="relative z-10">
          {steps.map((s, i) => {
            const ch = chapterById.get(s.chapter);
            const isChapterStart = i === 0 || steps[i - 1].chapter !== s.chapter;
            return (
              <section
                key={s.id}
                data-index={i}
                ref={(el) => {
                  stepRefs.current[i] = el;
                }}
                aria-current={i === activeIndex ? "step" : undefined}
                className="flex min-h-[85vh] flex-col justify-center px-6 py-16 lg:px-12"
              >
                {isChapterStart && ch && <ChapterHeading chapter={ch} />}

                <article
                  className={`transition-opacity duration-500 ${
                    i === activeIndex ? "opacity-100" : "opacity-45"
                  }`}
                >
                  <p className="label tabular">{s.dateLabel}</p>
                  <h3 className="display mt-2 text-[1.75rem] lg:text-[2.1rem]">{s.title}</h3>
                  <div className="prose-narrow mt-4 text-ink-secondary">
                    <p className="text-ink">{s.summary}</p>
                    {s.detail && <p>{s.detail}</p>}
                  </div>

                  {s.actors && s.actors.length > 0 && (
                    <div className="mt-5 flex flex-wrap gap-1.5">
                      {s.actors.map((id) => {
                        const actor = actorById.get(id);
                        if (!actor) return null;
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => setOpenActor(id)}
                            className="border border-rule px-2 py-1 font-mono text-[0.7rem] tracking-wide text-ink-secondary transition-colors hover:border-rule-strong hover:text-ink"
                          >
                            {actor.abbr ?? actor.name}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {s.uncertainty && <Uncertainty text={s.uncertainty} />}

                  <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="label">Sources</span>
                    {s.sources.map((id) => {
                      const src = sourceById.get(id);
                      if (!src) return null;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setOpenSource(id)}
                          className="border-b border-dotted border-rule-strong text-[0.8rem] text-ink-secondary transition-colors hover:border-solid hover:text-ink"
                        >
                          {src.publisher}
                        </button>
                      );
                    })}
                  </div>
                </article>
              </section>
            );
          })}
        </div>
      </div>

      <Timeline
        steps={steps}
        chapters={chapters}
        activeIndex={activeIndex}
        onJump={jumpTo}
      />

      <SourcePanel
        source={openSource ? (sourceById.get(openSource) ?? null) : null}
        onClose={() => setOpenSource(null)}
      />
      <ActorPanel
        actor={openActor ? (actorById.get(openActor) ?? null) : null}
        actors={actors}
        relationships={relationships}
        sources={sources}
        onClose={() => setOpenActor(null)}
        onSelectActor={setOpenActor}
      />
    </div>
  );
}

function ChapterHeading({ chapter }: { chapter: Chapter }) {
  return (
    <header className="mb-10 border-t border-ink pt-4">
      <p className="label">
        Chapter {chapter.numeral} &nbsp;&middot;&nbsp; {chapter.period}
      </p>
      <h2 className="display mt-3 text-[2.4rem] leading-[1.02] lg:text-[3rem]">
        {chapter.title}
      </h2>
      <p className="prose-narrow mt-4 text-ink-secondary">{chapter.standfirst}</p>
    </header>
  );
}

/**
 * Uncertainty is shown inline with the claim it qualifies, not collected in a
 * footnote nobody reaches. A reader should not be able to take the sentence
 * without also taking its limits.
 */
function Uncertainty({ text }: { text: string }) {
  const isGap = text.startsWith("[DATA NEEDED");
  return (
    <p
      className={`mt-5 border-l-2 py-1 pl-3 text-[0.82rem] leading-relaxed ${
        isGap ? "border-series-1 text-ink-secondary" : "border-rule-strong text-ink-muted"
      }`}
    >
      <span className="label mr-2">{isGap ? "Gap" : "Uncertain"}</span>
      {text.replace(/^\[DATA NEEDED:\s*/, "").replace(/\]$/, "")}
    </p>
  );
}
