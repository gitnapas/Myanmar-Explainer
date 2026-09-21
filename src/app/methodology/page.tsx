import Link from "next/link";
import type { Metadata } from "next";

import attribution from "@/data/geo/ATTRIBUTION.json";
import images from "@/data/images.json";
import sources from "@/data/sources.json";
import gaps from "@/data/gaps.json";
import type { ActorImage, DataGap, Source } from "@/lib/types";

export const metadata: Metadata = {
  title: "Methodology — Myanmar: A State Unfinished",
  description:
    "What control means on these maps, how uncertainty is handled, and where the data comes from.",
};

export default function MethodologyPage() {
  return (
    <main className="bg-paper px-6 py-16 lg:px-12">
      <div className="mx-auto max-w-[46rem]">
        <Link
          href="/"
          className="label border-b border-transparent transition-colors hover:border-ink-muted"
        >
          &larr; Back to the story
        </Link>

        <h1 className="display mt-8 text-[2.6rem] leading-[1.02] lg:text-[3.4rem]">
          Methodology
        </h1>
        <p className="prose-narrow mt-5 text-[1.05rem] text-ink-secondary">
          Mapping an active war invites a specific kind of dishonesty: a confident fill
          where there should be a question. These are the rules this project works to.
        </p>

        <Section title="What control means here">
          <p>
            Control is not one thing. A force can be present in a town without
            administering it; it can administer without being accepted; it can be accepted
            locally while recognised nowhere. This site keeps three ideas apart:
          </p>
          <Definitions
            items={[
              ["Military presence", "Armed forces operate in the area. Says nothing about who runs it."],
              ["Administration", "Somebody delivers services, resolves disputes and collects revenue."],
              ["Legitimacy", "Some population or government accepts that authority as rightful."],
            ]}
          />
          <p>
            The closing section of the story asks who governs, who controls and who claims
            to represent Myanmar as three separate questions precisely because they produce
            three different maps.
          </p>
        </Section>

        <Section title="Why the territory layers are coarse">
          <p>
            Territorial claims are made at whole state and region resolution, and never
            below it. That is deliberately coarser than the reporting you may have read,
            which often describes individual townships or bases.
          </p>
          <p>
            The reason is that this project has no verified township-level control dataset
            of its own. Drawing a precise boundary from imprecise reporting produces
            something that looks like evidence and is not. A state-wide wash that the
            legend admits is approximate is less impressive and more honest.
          </p>
          <p>
            Every territorial claim carries an <em>as-of</em> date and a confidence level,
            and the data model rejects any claim missing either.
          </p>
        </Section>

        <Section title="Four confidence levels">
          <Definitions
            items={[
              ["Documented", "Multiple independent sources, or a fact no party disputes."],
              ["Probable", "Credible reporting, but not independently corroborated."],
              ["Contested", "Sources actively disagree, or both parties operate throughout."],
              ["Unclear", "Insufficient evidence. Shown as absence, never as a colour."],
            ]}
          />
          <p>
            Confidence is carried by texture, not by hue. A hatched area means weaker
            evidence, not a different actor. If uncertainty had its own colour it would
            look like a finding.
          </p>
        </Section>

        <Section title="What conflict data does not establish">
          <p>
            Conflict event datasets record that something happened at a location. They do
            not record who held that location afterwards. Inferring control from event
            density is a common and serious error, and this site does not do it. Event
            data is used to describe where fighting occurred, and for nothing else.
          </p>
        </Section>

        <Section title="Proxies, labelled as proxies">
          <p>
            Two visual proxies appear in the story, and both are labelled in the legend
            where they are used:
          </p>
          <Definitions
            items={[
              [
                "Protest circles",
                "Sized by city population, not by crowd size. No reliable crowd counts exist for 1988 or 2021.",
              ],
              [
                "Movement arcs",
                "An arc runs from one region toward another. It is not a route — journey-level data does not exist.",
              ],
            ]}
          />
        </Section>

        <Section title="Naming">
          <p>
            Where names are contested, the contest is part of the history. The map carries
            both the post-1989 names and the older forms still used by many sources and
            communities — Kayah and Karenni, Kayin and Karen, Rakhine and Arakan. Body text
            uses the form the cited source uses.
          </p>
        </Section>

        <Section title="The knowledge boundary">
          <p>
            This work in progress was reviewed through 20 September 2026. Fast-moving
            claims — especially territorial control, casualty totals and the military-run
            election — use dated sources and explicit uncertainty notes. Where the available
            evidence does not support a precise map or number, that limitation remains a
            declared gap. Nine such gaps are listed at the end of the story and reproduced below.
          </p>
        </Section>

        <Section title="Declared gaps">
          <ul className="mt-2 space-y-4">
            {(gaps as DataGap[]).map((gap) => (
              <li key={gap.id} className="border-l-2 border-series-1 pl-4">
                <p className="text-[0.92rem] leading-snug text-ink">{gap.needed}</p>
                <p className="mt-1 text-[0.82rem] leading-relaxed text-ink-muted">{gap.why}</p>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Sources">
          <ul className="mt-2 space-y-3">
            {(sources as Source[]).map((s) => (
              <li key={s.id} className="border-t border-rule pt-3">
                <p className="text-[0.92rem] leading-snug text-ink">{s.title}</p>
                <p className="mt-0.5 text-[0.82rem] text-ink-secondary">
                  {s.publisher}
                  {s.date && <span className="tabular"> &middot; {s.date}</span>}
                </p>
                {s.note && (
                  <p className="mt-1 text-[0.8rem] leading-relaxed text-ink-muted">{s.note}</p>
                )}
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Portraits and emblems">
          <p>
            Every image on this site comes from Wikimedia Commons under a licence that
            permits reuse: public domain, CC0, CC BY or CC BY-SA. Nothing is used under a
            claim of fair dealing, and no logo has been copied from an organisation that
            has not released it.
          </p>
          <p>
            Where no freely-licensed image exists, the organisation is shown as initials
            rather than as a picture of something approximately right. Four have no image
            for that reason: the USDP, the MNDAA, the TNLA and the NUG.
          </p>
          <ul className="mt-4 space-y-2">
            {(images as ActorImage[]).map((img) => (
              <li key={img.actor} className="text-[0.8rem] text-ink-muted">
                <span className="font-mono text-[0.74rem] text-ink-secondary">{img.actor}</span>
                {" — "}
                <a
                  href={img.source}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="border-b border-rule-strong hover:border-ink"
                >
                  {img.title}
                </a>
                {" ("}
                {img.licence}
                {img.author && img.author !== "unknown" ? `, ${img.author}` : ""}
                {")"}
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Base geography">
          <p className="text-[0.88rem]">{attribution.note}</p>
          <ul className="mt-3 space-y-2">
            {attribution.sources.map((s) => (
              <li key={s.layer} className="text-[0.82rem] text-ink-muted">
                <span className="font-mono text-[0.76rem]">{s.layer}</span> &mdash; {s.name} (
                {s.license}), retrieved {s.retrieved}.
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-14 border-t border-rule pt-6">
      <h2 className="display text-[1.5rem] leading-snug">{title}</h2>
      <div className="prose-narrow mt-3 text-ink-secondary">{children}</div>
    </section>
  );
}

function Definitions({ items }: { items: [string, string][] }) {
  return (
    <dl className="my-4 space-y-3">
      {items.map(([term, def]) => (
        <div key={term} className="border-l-2 border-rule-strong pl-4">
          <dt className="text-[0.92rem] text-ink">{term}</dt>
          <dd className="mt-0.5 text-[0.86rem] leading-relaxed text-ink-muted">{def}</dd>
        </div>
      ))}
    </dl>
  );
}
