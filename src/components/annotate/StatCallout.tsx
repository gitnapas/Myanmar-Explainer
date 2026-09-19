/**
 * A single figure, pulled out of the paragraph and drawn round by hand.
 *
 * The explainer-video convention: when one number carries the argument, stop
 * the prose and put it on screen at a size that cannot be skimmed past. The
 * ring is deliberately irregular -- a perfect ellipse reads as a UI chrome
 * element, a wobbly one reads as someone circling a figure on a printout,
 * which is the register this is aiming for.
 *
 * Used sparingly. If every step had one, none of them would land.
 */
export default function StatCallout({
  value,
  caption,
}: {
  value: string;
  caption: string;
}) {
  return (
    <figure className="relative my-7 w-fit">
      <svg
        className="pointer-events-none absolute -inset-x-6 -inset-y-3 h-[calc(100%+1.5rem)] w-[calc(100%+3rem)]"
        viewBox="0 0 320 90"
        preserveAspectRatio="none"
        aria-hidden
      >
        {/*
          Two overlapping passes at slightly different radii, the way a pen
          doubles back when you circle something. Drawn as cubic segments
          rather than <ellipse> so the ends can overshoot.
        */}
        <path
          d="M52 12 C12 16 4 40 12 58 C22 79 92 84 168 84 C248 84 308 76 312 52 C316 28 268 10 186 8 C140 7 96 8 60 13"
          fill="none"
          stroke="var(--series-1)"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.75"
        />
        <path
          d="M64 17 C26 24 18 44 30 60 C44 78 108 80 172 79 C238 78 298 70 300 50"
          fill="none"
          stroke="var(--series-1)"
          strokeWidth="1.4"
          strokeLinecap="round"
          opacity="0.4"
        />
      </svg>

      <div className="relative px-2">
        <p className="display tabular text-[2.6rem] leading-none text-ink lg:text-[3.2rem]">
          {value}
        </p>
        <figcaption className="mt-2 max-w-[26ch] text-[0.8rem] leading-snug text-ink-secondary">
          {caption}
        </figcaption>
      </div>
    </figure>
  );
}
