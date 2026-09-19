"use client";

import { useEffect, useRef, useState } from "react";

export interface Camera {
  center: [number, number];
  zoom: number;
}

const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Animates the map camera between framings.
 *
 * Zoom interpolates geometrically rather than linearly. Linear zoom reads as a
 * lurch -- it crawls while close in and races while pulled out -- because what
 * the eye registers is proportional change, not absolute. Interpolating the
 * ratio keeps the apparent speed even across a move from a whole-country view
 * down to a single state.
 *
 * Interrupting a move resumes from wherever it had reached, so scrolling
 * quickly through steps glides rather than snapping between framings.
 */
export function useCameraTween(target: Camera, duration = 1400): Camera {
  const [camera, setCamera] = useState<Camera>(target);
  const currentRef = useRef<Camera>(target);
  const frameRef = useRef<number | null>(null);

  const [lon, lat] = target.center;
  const { zoom } = target;

  useEffect(() => {
    const goal: Camera = { center: [lon, lat], zoom };

    // Motion here carries meaning, but a reader who has asked for less of it
    // gets the destination without the journey rather than a faster journey.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      currentRef.current = goal;
      setCamera(goal);
      return;
    }

    const from = currentRef.current;
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const e = easeInOutCubic(t);
      const next: Camera = {
        center: [
          lerp(from.center[0], goal.center[0], e),
          lerp(from.center[1], goal.center[1], e),
        ],
        zoom: from.zoom * Math.pow(goal.zoom / from.zoom, e),
      };
      currentRef.current = next;
      setCamera(next);
      if (t < 1) frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [lon, lat, zoom, duration]);

  return camera;
}
