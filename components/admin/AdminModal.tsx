"use client";

import type { ReactNode } from "react";

type Props = {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
};

/** Full-screen on mobile; centered card on md+. Overlay does not close on click (per admin spec). */
export function AdminModal({ open, title, children, onClose, footer }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[140] flex items-stretch justify-center md:items-center md:p-6">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" aria-hidden />
      <div className="relative z-10 flex h-full w-full flex-col bg-background md:h-auto md:max-h-[90vh] md:min-h-0 md:max-w-2xl md:rounded-2xl md:border md:border-border/80 md:shadow-2xl dark:md:border-gold/20">
        <div className="flex shrink-0 items-center justify-between border-b border-border/60 px-4 py-4 md:px-6 dark:border-gold/15">
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6">{children}</div>
        {footer ? (
          <div className="shrink-0 border-t border-border/60 px-4 py-4 md:px-6 dark:border-gold/15">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}
