"use client";
import type { Chapter, Step } from "@/lib/types";
interface TimelineProps { steps: Step[]; chapters: Chapter[]; activeIndex: number; onJump: (index: number) => void; }
export default function Timeline({ steps, chapters, activeIndex, onJump }: TimelineProps) {
  const active = steps[activeIndex];
  return (
    <nav aria-label="Story navigation" className="story-navigation">
      <div className="story-progress" aria-hidden="true"><span style={{ width: `${((activeIndex + 1) / steps.length) * 100}%` }} /></div>
      <div className="navigation-inner">
        <button type="button" className="navigation-arrow" aria-label="Previous event" disabled={activeIndex === 0} onClick={() => onJump(activeIndex - 1)}>←</button>
        <label className="chapter-select">
          <span className="label">Explore the story</span>
          <select aria-label="Choose a chapter" value={active.chapter} onChange={(event) => onJump(steps.findIndex((step) => step.chapter === event.target.value))}>
            {chapters.filter((chapter) => steps.some((step) => step.chapter === chapter.id)).map((chapter) => (
              <option key={chapter.id} value={chapter.id}>{chapter.numeral} · {chapter.title}</option>
            ))}
          </select>
        </label>
        <p className="navigation-event"><span className="label">{active.dateLabel}</span><span>{active.title}</span></p>
        <span className="navigation-count">{activeIndex + 1} / {steps.length}</span>
        <button type="button" className="navigation-arrow" aria-label="Next event" disabled={activeIndex === steps.length - 1} onClick={() => onJump(activeIndex + 1)}>→</button>
      </div>
    </nav>
  );
}
