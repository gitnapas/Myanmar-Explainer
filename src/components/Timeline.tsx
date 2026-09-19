"use client";

import { useMemo } from "react";
import type { Chapter, Step } from "@/lib/types";

interface TimelineProps {
  steps: Step[];
  chapters: Chapter[];
  activeIndex: number;
  onJump: (index: number) => void;
}

/**
 * Navigation rail across the whole story.
 *
 * Ticks are evenly spaced by step rather than positioned by date. Eighty years
 * of history with a third of the moments inside 2021 would, on a true time
 * axis, collapse the part the reader most needs to click into a few pixels.
 * Because even spacing is not a time axis, every tick carries its own year and
 * the rail is labelled as navigation -- it is not asked to encode duration.
 */
export default function Timeline({ steps, chapters, activeIndex, onJump }: TimelineProps) {
  const segments = useMemo(() => {
    const byChapter = new Map<string, { first: number; count: number }>();
    steps.forEach((s, i) => {
      const seen = byChapter.get(s.chapter);
      if (seen) seen.count += 1;
      else byChapter.set(s.chapter, { first: i, count: 1 });
    });
    return chapters
      .filter((c) => byChapter.has(c.id))
      .map((c) => ({ chapter: c, ...byChapter.get(c.id)! }));
  }, [steps, chapters]);

  const active = steps[activeIndex];

  return (
    <nav
      aria-label="Story navigation"
      className="sticky bottom-0 z-30 border-t border-rule bg-paper/95 backdrop-blur-sm"
    >
      <div className="mx-auto flex max-w-[1600px] items-stretch gap-px overflow-x-auto px-3 py-2">
        {segments.map(({ chapter, first, count }) => (
          <div key={chapter.id} className="flex min-w-fit flex-col gap-1 px-2">
            <span
              className="label whitespace-nowrap text-[0.6rem]"
              title={`Chapter ${chapter.numeral}: ${chapter.title}`}
            >
              {chapter.numeral} &middot; {chapter.period}
            </span>
            <div className="flex items-end gap-px">
              {Array.from({ length: count }, (_, k) => {
                const index = first + k;
                const step = steps[index];
                const isActive = index === activeIndex;
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => onJump(index)}
                    aria-label={`${step.dateLabel}: ${step.title}`}
                    aria-current={isActive ? "step" : undefined}
                    title={`${step.dateLabel} — ${step.title}`}
                    className="group relative w-3 shrink-0 py-1"
                  >
                    <span
                      className={`block w-full transition-all duration-200 ${
                        isActive
                          ? "h-5 bg-ink"
                          : "h-2.5 bg-rule-strong group-hover:h-4 group-hover:bg-ink-muted"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mx-auto flex max-w-[1600px] items-baseline gap-3 border-t border-rule px-5 py-1.5">
        <span className="label tabular shrink-0">{active.dateLabel}</span>
        <span className="truncate text-[0.8rem] text-ink-secondary">{active.title}</span>
      </div>
    </nav>
  );
}
