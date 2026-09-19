"use client";

/**
 * The Civil Disobedience Movement, shown as the functions of a state going
 * quiet rather than as a participation chart.
 *
 * There is no reliable count of how many people joined, and inventing bar
 * heights would be exactly the kind of false precision this project avoids.
 * What is well documented is the order: hospital staff first, then the sectors
 * that keep a country administratively functional. So the visual encodes
 * sequence, which the sources support, and says nothing about magnitude,
 * which they do not.
 */

const SECTORS = [
  { name: "Hospitals", when: "3 February", note: "Doctors and nurses refuse to work under the new authorities." },
  { name: "Teaching", when: "February", note: "School and university staff join." },
  { name: "Railways", when: "February", note: "Rail workers halt the network." },
  { name: "Banking", when: "February", note: "Payments and clearing slow." },
  { name: "Civil service", when: "February onward", note: "Ministries lose the staff that run them." },
];

export default function CdmSectors() {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4">
      <div className="pointer-events-auto w-full max-w-[25rem] border border-rule bg-paper/94 p-4 backdrop-blur-sm">
        <p className="label">Civil Disobedience Movement</p>
        <h4 className="display mt-1.5 text-[1.1rem] leading-snug">
          A state stops being able to function
        </h4>

        <ol className="mt-4">
          {SECTORS.map((sector, i) => (
            <li
              key={sector.name}
              className="flex gap-3 border-t border-rule py-2.5"
              style={{
                animation: "sector-in 600ms ease-out both",
                animationDelay: `${i * 130}ms`,
              }}
            >
              <span className="label tabular w-[5.5rem] shrink-0 pt-0.5">{sector.when}</span>
              <div>
                <p className="text-[0.88rem] leading-tight text-ink">{sector.name}</p>
                <p className="mt-0.5 text-[0.75rem] leading-snug text-ink-muted">{sector.note}</p>
              </div>
            </li>
          ))}
        </ol>

        <p className="mt-2 border-t border-rule pt-2 text-[0.7rem] leading-snug text-ink-muted">
          Order is documented. Scale is not — no reliable count of participation exists, so
          none is shown.
        </p>
      </div>
    </div>
  );
}
