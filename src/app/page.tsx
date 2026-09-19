import Link from "next/link";

import Story from "@/components/Story";
import Opening from "@/components/Opening";
import chapters from "@/data/chapters.json";
import steps from "@/data/steps.json";
import sources from "@/data/sources.json";
import actors from "@/data/actors.json";
import relationships from "@/data/relationships.json";
import gaps from "@/data/gaps.json";
import type {
  Actor,
  Chapter,
  DataGap,
  Relationship,
  Source,
  Step,
} from "@/lib/types";

export default function Page() {
  return (
    <main>
      <Opening />

      <Story
        chapters={chapters as Chapter[]}
        steps={steps as Step[]}
        sources={sources as Source[]}
        actors={actors as Actor[]}
        relationships={relationships as Relationship[]}
      />

      <ClosingNote gaps={gaps as DataGap[]} />
    </main>
  );
}

/**
 * The site ends on what it does not know.
 *
 * Nine open gaps are listed by name because the alternative -- quietly
 * stopping the narrative where the evidence stops -- would leave a reader
 * with the impression that the story had been told to its end.
 */
function ClosingNote({ gaps }: { gaps: DataGap[] }) {
  return (
    <section className="border-t border-ink bg-paper px-6 py-20 lg:px-12">
      <div className="mx-auto max-w-[62rem]">
        <p className="label">Where this account stops</p>
        <h2 className="display mt-3 max-w-[22ch] text-[2rem] leading-[1.06] lg:text-[2.6rem]">
          What is missing, named
        </h2>
        <p className="prose-narrow mt-5 text-ink-secondary">
          This is a prototype. Chapter VI is built out; the rest of the spine is in place
          with its major moments anchored. Everywhere the evidence runs out before the
          narrative wants to, the gap is declared rather than filled.
        </p>

        <ul className="mt-10 grid gap-px border border-rule bg-rule sm:grid-cols-2">
          {gaps.map((gap) => (
            <li key={gap.id} className="bg-paper p-5">
              <p className="text-[0.9rem] leading-snug text-ink">{gap.needed}</p>
              <p className="mt-2 text-[0.78rem] leading-relaxed text-ink-muted">{gap.why}</p>
            </li>
          ))}
        </ul>

        <Link
          href="/methodology"
          className="mt-10 inline-block border-b border-ink-muted font-mono text-[0.78rem] tracking-wide text-ink transition-colors hover:border-ink"
        >
          Read the methodology &rarr;
        </Link>
      </div>
    </section>
  );
}
