"use client";

export function AdminSpinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16">
      <div
        className="h-10 w-10 animate-spin rounded-full border-2 border-gold/30 border-t-gold"
        aria-hidden
      />
      {label ? <p className="text-sm text-muted-foreground">{label}</p> : null}
    </div>
  );
}
