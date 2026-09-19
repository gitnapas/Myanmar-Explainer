"use client";

import SlideOver from "./SlideOver";
import type { Actor, Relationship, RelationshipKind, Source } from "@/lib/types";

const TYPE_LABEL: Record<Actor["type"], string> = {
  military: "Armed forces",
  government: "Government",
  "interim-government": "Interim government body",
  "political-party": "Political party",
  eao: "Ethnic armed organisation",
  resistance: "Resistance organisation",
  "civil-society": "Civil society movement",
  "foreign-state": "Foreign state",
  bloc: "Alliance",
};

/**
 * Relationship wording is deliberately not "ally" or "enemy".
 *
 * Several of these organisations have cooperated with, fought and signed
 * ceasefires with the same counterpart inside a decade. A two-valued edge
 * would force a choice between three true things.
 */
const KIND_LABEL: Record<RelationshipKind, string> = {
  "cooperates-with": "cooperates with",
  "aligned-on-some-objectives": "aligned on some objectives with",
  "politically-distinct": "politically distinct from",
  conflict: "in conflict with",
  ceasefire: "in ceasefire with",
  competitive: "in a shifting relationship with",
  historical: "historically connected to",
  uncertain: "relationship uncertain with",
};

export default function ActorPanel({
  actor,
  actors,
  relationships,
  sources,
  onClose,
  onSelectActor,
}: {
  actor: Actor | null;
  actors: Actor[];
  relationships: Relationship[];
  sources: Source[];
  onClose: () => void;
  onSelectActor: (id: string) => void;
}) {
  const byId = new Map(actors.map((a) => [a.id, a]));
  const sourceById = new Map(sources.map((s) => [s.id, s]));

  const edges = actor
    ? relationships
        .filter((r) => r.from === actor.id || r.to === actor.id)
        .map((r) => ({
          other: byId.get(r.from === actor.id ? r.to : r.from),
          rel: r,
        }))
        .filter((e) => e.other)
    : [];

  return (
    <SlideOver open={!!actor} title="Actor" onClose={onClose}>
      {actor && (
        <div className="mt-5">
          <p className="label">{TYPE_LABEL[actor.type]}</p>
          <h3 className="display mt-2 text-[1.45rem] leading-tight">{actor.name}</h3>
          {actor.abbr && (
            <p className="mt-1 font-mono text-[0.78rem] text-ink-muted">{actor.abbr}</p>
          )}

          <dl className="mt-5 space-y-3 border-t border-rule pt-4 text-[0.85rem]">
            <Field label="Founded" value={actor.founded} />
            <Field label="Primary geography" value={actor.geography?.join(", ")} />
            <Field label="Objective" value={actor.objective} />
            <Field label="Armed wing" value={actor.armedWing} />
            <Field label="Political organisation" value={actor.politicalWing} />
            <Field label="Historical significance" value={actor.significance} />
            <Field label="Current role" value={actor.currentRole} />
          </dl>

          {edges.length > 0 && (
            <section className="mt-6 border-t border-rule pt-4">
              <p className="label mb-3">Relationships</p>
              <ul className="space-y-2.5">
                {edges.map(({ other, rel }) => (
                  <li key={`${rel.from}-${rel.to}-${rel.kind}`} className="text-[0.84rem]">
                    <button
                      type="button"
                      onClick={() => onSelectActor(other!.id)}
                      className="text-left leading-snug text-ink-secondary transition-colors hover:text-ink"
                    >
                      <span className="text-ink-muted">{KIND_LABEL[rel.kind]}</span>{" "}
                      <span className="border-b border-dotted border-rule-strong text-ink">
                        {other!.abbr ?? other!.name}
                      </span>
                      {rel.since && <span className="tabular text-ink-muted"> ({rel.since})</span>}
                    </button>
                    {rel.note && (
                      <p className="mt-0.5 text-[0.78rem] leading-snug text-ink-muted">
                        {rel.note}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/*
            Named unknowns, rather than quietly omitting the field. A card that
            simply leaves out a contested fact reads as though there is nothing
            contested about it.
          */}
          {actor.unresolved && actor.unresolved.length > 0 && (
            <section className="mt-6 border-t border-rule pt-4">
              <p className="label mb-2">Unresolved</p>
              <ul className="space-y-2">
                {actor.unresolved.map((u) => (
                  <li
                    key={u}
                    className="border-l-2 border-series-1 py-0.5 pl-3 text-[0.8rem] leading-relaxed text-ink-secondary"
                  >
                    {u}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="mt-6 border-t border-rule pt-4">
            <p className="label mb-2">Sources</p>
            <ul className="space-y-1">
              {actor.sources.map((id) => {
                const s = sourceById.get(id);
                return (
                  <li key={id} className="text-[0.78rem] text-ink-muted">
                    {s ? `${s.publisher} — ${s.title}` : id}
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      )}
    </SlideOver>
  );
}

function Field({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  const isGap = value.startsWith("[DATA NEEDED");
  return (
    <div>
      <dt className="label">{label}</dt>
      <dd className={`mt-0.5 leading-relaxed ${isGap ? "text-ink-muted italic" : "text-ink-secondary"}`}>
        {isGap ? value.replace(/^\[DATA NEEDED:\s*/, "Not established — ").replace(/\]$/, "") : value}
      </dd>
    </div>
  );
}
