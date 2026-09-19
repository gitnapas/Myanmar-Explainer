"use client";

/**
 * Administration assembled upward, not delegated downward.
 *
 * The visual argument is direction. Where military administration withdrew,
 * schooling, clinics and dispute resolution did not wait for a national
 * authority to authorise them -- townships organised, and some of those
 * arrangements later federated into state-level executives. Drawing this as an
 * org chart from the top would invert what happened.
 *
 * Karenni is the worked example because it is the case with the clearest
 * documentation, not because it is typical.
 */

const TIERS = [
  {
    label: "Township",
    body: "Village and township committees",
    detail: "Schools reopened, clinics staffed, disputes heard.",
  },
  {
    label: "District",
    body: "Area coordination bodies",
    detail: "Supply, casualty care and displacement response across townships.",
  },
  {
    label: "State",
    body: "Karenni State Consultative Council",
    detail: "Political, armed and civil society actors in one forum, from 2021.",
  },
  {
    label: "Executive",
    body: "Interim Executive Council",
    detail: "A state-level administration, formed 2023.",
  },
];

export default function GovernanceStack() {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4">
      <div className="pointer-events-auto w-full max-w-[24rem] border border-rule bg-paper/94 p-4 backdrop-blur-sm">
        <p className="label">What replaced the state</p>
        <h4 className="display mt-1.5 text-[1.1rem] leading-snug">
          Government assembled from below
        </h4>

        <ol className="mt-4 space-y-0">
          {[...TIERS].reverse().map((tier, i) => (
            <li key={tier.label} className="relative">
              <div
                className="border border-rule-strong px-3 py-2.5"
                style={{
                  // Narrowing upward reads as consolidation of something that
                  // already existed underneath, rather than authority
                  // descending from a point.
                  marginLeft: `${i * 9}px`,
                  marginRight: `${i * 9}px`,
                  background: "var(--paper-raised)",
                }}
              >
                <p className="label text-[0.6rem]">{tier.label}</p>
                <p className="mt-0.5 text-[0.85rem] leading-tight text-ink">{tier.body}</p>
                <p className="mt-1 text-[0.74rem] leading-snug text-ink-muted">{tier.detail}</p>
              </div>
              {i < TIERS.length - 1 && (
                <div className="flex justify-center py-1" aria-hidden>
                  <svg width="12" height="14">
                    <path
                      d="M6 14 L6 3 M2.5 6.5 L6 3 L9.5 6.5"
                      fill="none"
                      stroke="var(--series-2)"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              )}
            </li>
          ))}
        </ol>

        <p className="mt-3 border-t border-rule pt-2 text-[0.7rem] leading-snug text-ink-muted">
          How far each tier reaches, and how contested its authority is, varies by township
          and is not uniformly documented.
        </p>
      </div>
    </div>
  );
}
