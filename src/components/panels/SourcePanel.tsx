"use client";

import SlideOver from "./SlideOver";
import type { Source } from "@/lib/types";

const KIND_LABEL: Record<Source["kind"], string> = {
  report: "Research report",
  legal: "Legal record",
  academic: "Academic work",
  journalism: "Journalism",
  data: "Dataset",
  primary: "Primary document",
};

export default function SourcePanel({
  source,
  onClose,
}: {
  source: Source | null;
  onClose: () => void;
}) {
  return (
    <SlideOver open={!!source} title="Source" onClose={onClose}>
      {source && (
        <div className="mt-5">
          <p className="label">{KIND_LABEL[source.kind]}</p>
          <h3 className="display mt-2 text-[1.3rem] leading-snug">{source.title}</h3>
          <p className="mt-1.5 text-[0.85rem] text-ink-secondary">
            {source.publisher}
            {source.date && <span className="tabular"> &middot; {source.date}</span>}
          </p>

          {/*
            What a source does and does not establish is part of the citation.
            A court record proves that proceedings exist; it does not prove the
            allegations in them, and the difference matters on this subject.
          */}
          {source.note && (
            <p className="mt-4 border-l-2 border-rule-strong py-1 pl-3 text-[0.84rem] leading-relaxed text-ink-secondary">
              {source.note}
            </p>
          )}

          {source.url && (
            <a
              href={source.url}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-5 inline-block border-b border-ink-muted font-mono text-[0.75rem] text-ink transition-colors hover:border-ink"
            >
              Open source &rarr;
            </a>
          )}
        </div>
      )}
    </SlideOver>
  );
}
