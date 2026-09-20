"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import ActorBubble from "@/components/ActorBubble";
import StatCallout from "@/components/annotate/StatCallout";
import StoryMap from "@/components/map/StoryMap";
import Timeline from "@/components/Timeline";
import OppositionNetwork from "@/components/viz/OppositionNetwork";
import GovernanceStack from "@/components/viz/GovernanceStack";
import CdmSectors from "@/components/viz/CdmSectors";
import MapLegend from "@/components/MapLegend";
import SourcePanel from "@/components/panels/SourcePanel";
import ActorPanel from "@/components/panels/ActorPanel";
import StepVisualPanel from "@/components/viz/StepVisualPanel";
import storyVisualsData from "@/data/storyVisuals.json";
import type { Actor, Chapter, Relationship, Source, Step, StepVisual } from "@/lib/types";

interface StoryProps {
  chapters: Chapter[];
  steps: Step[];
  sources: Source[];
  actors: Actor[];
  relationships: Relationship[];
}

const HOME = { center: [96.5, 19.5] as [number, number], zoom: 1 };
const storyVisuals = storyVisualsData as StepVisual[];
const visualByStep = new Map(storyVisuals.map((visual) => [visual.step, visual]));

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
  const [motionPaused, setMotionPaused] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const stepRefs = useRef<(HTMLElement | null)[]>([]);

  const chapterById = useMemo(
    () => new Map(chapters.map((c) => [c.id, c])),
    [chapters],
  );
  const sourceById = useMemo(() => new Map(sources.map((s) => [s.id, s])), [sources]);
  const actorById = useMemo(() => new Map(actors.map((a) => [a.id, a])), [actors]);

  const step = steps[activeIndex];
  const chapter = chapterById.get(step.chapter);
  const visual = visualByStep.get(step.id);

  // Keep the reading line below the pinned map on phones.
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const compact = window.matchMedia("(max-width: 760px)").matches;
      const line = compact ? (stageRef.current?.getBoundingClientRect().bottom ?? 0) + 72 : window.innerHeight * 0.38;
      let index = 0;
      stepRefs.current.forEach((element, i) => {
        if (element && element.getBoundingClientRect().top <= line) index = i;
      });
      setActiveIndex(index);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  const jumpTo = useCallback((index: number) => {
    const element = stepRefs.current[index];
    if (!element) return;
    const compact = window.matchMedia("(max-width: 760px)").matches;
    const offset = compact ? (stageRef.current?.offsetHeight ?? 0) + 20 : 36;
    window.scrollTo({
      top: window.scrollY + element.getBoundingClientRect().top - offset,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    });
  }, []);

  const layers = step.layers ?? [];
  const focus = step.focus ?? HOME;

  return (
    <div id="story" data-era={chapter?.era} data-motion={motionPaused ? "paused" : "playing"} className="story-shell bg-paper">
      <div className="story-grid">
        {/*
          The map is the constant. It stays pinned while the text moves past it,
          so a reader is always watching one continuous country change rather
          than meeting a new illustration every screen.
        */}
        <div ref={stageRef} className="story-stage">
          <div className="stage-heading">
            <div><span className="label">{step.dateLabel}</span><p>{step.title}</p></div>
            <button type="button" className="motion-toggle" aria-pressed={motionPaused} onClick={() => setMotionPaused((value) => !value)}>
              {motionPaused ? "Play motion" : "Pause motion"}
            </button>
          </div>
          <div className="stage-canvas">
            <StoryMap
              focus={focus}
              motionPaused={motionPaused}
              layers={layers}
              stepId={step.id}
              territoryAsOf={layers.includes("conflict-intensity") ? step.date : undefined}
              actors={actors}
              visual={visual}
              onSelectActor={setOpenActor}
            />

            {/* Mode-specific overlays sit on top of the map rather than replacing it. */}
            {layers.includes("opposition-network") && !visual?.map && (
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
          {!!visual?.map?.actors?.length && (
            <div className="compact-actor-roster" aria-label="People and organisations on the map">
              {visual.map.actors.map((mark, index) => (
                <button key={index} type="button" disabled={!mark.actor} onClick={() => mark.actor && setOpenActor(mark.actor)}>
                  <span>{index + 1}</span>{mark.label}{mark.status && mark.status !== "active" ? ` · ${mark.status}` : ""}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="story-reading">
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
                className="story-step"
              >
                {isChapterStart && ch && <ChapterHeading chapter={ch} />}

                <article
                  className={`transition-opacity duration-500 ${
                    i === activeIndex ? "opacity-100" : "opacity-75"
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
                            className="flex items-center gap-1.5 border border-rule py-1 pl-1 pr-2.5 font-mono text-[0.7rem] tracking-wide text-ink-secondary transition-colors hover:border-rule-strong hover:text-ink"
                          >
                            <ActorBubble actor={actor} size={22} />
                            {actor.abbr?.replace(/\s*\/.*$/, "") ?? actor.name}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {visualByStep.get(s.id)?.graphic && (
                    <StepVisualPanel graphic={visualByStep.get(s.id)!.graphic!} />
                  )}

                  {s.stat && <StatCallout value={s.stat.value} caption={s.stat.caption} />}

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
