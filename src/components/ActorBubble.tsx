"use client";

import { asset } from "@/lib/asset";
import imagesData from "@/data/images.json";
import type { Actor, ActorImage } from "@/lib/types";

const images = imagesData as ActorImage[];
const byActor = new Map(images.map((i) => [i.actor, i]));

export const imageFor = (id: string) => byActor.get(id) ?? null;

/**
 * Initials for an organisation with no freely-licensed emblem.
 *
 * An abbreviation is already the thing people recognise, so it is used whole.
 * Otherwise the initials of the first two words. The alternative -- grabbing
 * whatever logo a search returns -- would mean shipping images this project
 * has no right to use, next to claims about who those organisations are.
 */
function monogram(actor: Actor): string {
  if (actor.abbr && actor.abbr.length <= 6) return actor.abbr.replace(/\s*\/.*$/, "");
  return actor.name
    .split(/\s+/)
    .filter((w) => /^[A-Z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join("");
}

/**
 * Circular portrait or emblem.
 *
 * Portraits fill the circle; emblems are letterboxed inside it, because a flag
 * is wide and cropping one to a circle removes the part that identifies it.
 */
export default function ActorBubble({
  actor,
  size = 40,
  className = "",
}: {
  actor: Actor;
  size?: number;
  className?: string;
}) {
  const image = byActor.get(actor.id);
  const style = { width: size, height: size };

  if (!image) {
    return (
      <span
        aria-hidden
        style={{ ...style, fontSize: Math.max(8, size * 0.3) }}
        className={`inline-flex shrink-0 items-center justify-center rounded-full border border-rule-strong bg-paper-sunk font-mono leading-none tracking-tight text-ink-muted ${className}`}
      >
        {monogram(actor)}
      </span>
    );
  }

  return (
    <span
      style={style}
      className={`inline-block shrink-0 overflow-hidden rounded-full border border-rule-strong bg-paper-raised ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={asset(image.file)}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        className={`h-full w-full ${image.kind === "portrait" ? "object-cover" : "object-contain p-[15%]"}`}
      />
    </span>
  );
}
