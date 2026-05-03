"use client";

import { useEffect } from "react";

export type ToastMessage = { id: number; kind: "success" | "error"; text: string };

type Props = {
  toast: ToastMessage | null;
  onDismiss: () => void;
};

export function AdminToast({ toast, onDismiss }: Props) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onDismiss, 4200);
    return () => clearTimeout(t);
  }, [toast, onDismiss]);

  if (!toast) return null;

  return (
    <div
      role="status"
      className={
        toast.kind === "success"
          ? "fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] left-4 right-4 z-[200] rounded-xl border border-primary/40 bg-primary/15 px-4 py-3 text-sm font-medium text-foreground shadow-lg backdrop-blur-md md:bottom-6 md:left-auto md:right-6 md:max-w-md md:border-gold/30 md:bg-background/95"
          : "fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] left-4 right-4 z-[200] rounded-xl border border-destructive/50 bg-destructive/15 px-4 py-3 text-sm font-medium text-destructive shadow-lg backdrop-blur-md md:bottom-6 md:left-auto md:right-6 md:max-w-md"
      }
    >
      {toast.text}
    </div>
  );
}
