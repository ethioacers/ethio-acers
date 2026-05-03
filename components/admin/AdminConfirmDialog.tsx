"use client";

type Props = {
  open: boolean;
  itemName: string;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function AdminConfirmDialog({ open, itemName, loading, onCancel, onConfirm }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-confirm-title"
        className="relative z-10 w-full max-w-md rounded-2xl border border-border/80 bg-background p-6 shadow-2xl dark:border-gold/20"
      >
        <h2 id="admin-confirm-title" className="text-lg font-semibold text-foreground">
          Confirm delete
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Are you sure you want to delete {itemName}?
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="rounded-xl border border-input bg-transparent px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className="rounded-xl bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground shadow-sm transition-colors hover:bg-destructive/90 disabled:opacity-50"
          >
            {loading ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
