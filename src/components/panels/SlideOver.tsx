"use client";

import { useEffect, useRef } from "react";

/**
 * Shared shell for the source and actor panels.
 *
 * Escape closes, focus moves in on open and the backdrop is clickable, because
 * these open constantly while reading and a panel that traps you is worse than
 * no panel.
 */
export default function SlideOver({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    panelRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close panel"
        onClick={onClose}
        className="absolute inset-0 bg-ink/25"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="absolute right-0 top-0 h-full w-full max-w-[26rem] overflow-y-auto border-l border-rule bg-paper-raised p-6 shadow-none outline-none"
      >
        <div className="flex items-start justify-between gap-4 border-b border-rule pb-3">
          <p className="label">{title}</p>
          <button
            type="button"
            onClick={onClose}
            className="font-mono text-[0.7rem] text-ink-muted transition-colors hover:text-ink"
          >
            CLOSE &times;
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
