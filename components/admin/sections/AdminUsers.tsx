"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";
import { AdminSpinner } from "@/components/admin/AdminSpinner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  grade: number | null;
  school_name: string | null;
  is_pro: boolean;
  is_admin: boolean;
  created_at: string;
};

type Props = {
  currentUserId: string;
  showToast: (kind: "success" | "error", text: string) => void;
};

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export function AdminUsers({ currentUserId, showToast }: Props) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Profile[]>([]);
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, grade, school_name, is_pro, is_admin, created_at")
        .order("created_at", { ascending: false });
      if (error) {
        showToast("error", error.message);
        return;
      }
      setRows((data ?? []) as Profile[]);
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Failed to load users.");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const name = (r.full_name ?? "").toLowerCase();
      const email = (r.email ?? "").toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [rows, search]);

  async function toggleField(id: string, field: "is_pro" | "is_admin", next: boolean) {
    if (field === "is_admin" && id === currentUserId && !next) {
      showToast("error", "You cannot remove your own admin status.");
      return;
    }
    setBusyId(id);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("profiles").update({ [field]: next }).eq("id", id);
      if (error) {
        showToast("error", error.message);
        return;
      }
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: next } : r)));
      showToast("success", "User updated.");
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Update failed.");
    } finally {
      setBusyId(null);
    }
  }

  if (loading && rows.length === 0) {
    return <AdminSpinner label="Loading users…" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-gold">Users</h2>
        <p className="text-sm text-muted-foreground">Search and manage accounts.</p>
      </div>

      <div className="max-w-md space-y-2">
        <Label htmlFor="user-search">Search by name or email</Label>
        <Input
          id="user-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Type to filter…"
          className="border-border/80 bg-background/80 dark:border-gold/15"
        />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border/70 dark:border-gold/15">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead className="border-b border-border/60 bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground dark:border-gold/15">
            <tr>
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Email</th>
              <th className="px-4 py-3 font-semibold">Grade</th>
              <th className="px-4 py-3 font-semibold">School</th>
              <th className="px-4 py-3 font-semibold">Pro</th>
              <th className="px-4 py-3 font-semibold">Admin</th>
              <th className="px-4 py-3 font-semibold">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50 dark:divide-gold/10">
            {filtered.map((r) => {
              const disabledAdmin =
                r.id === currentUserId && r.is_admin && busyId !== r.id;
              return (
                <tr key={r.id} className="bg-card/30 hover:bg-accent/20">
                  <td className="px-4 py-3 font-medium">{r.full_name ?? "—"}</td>
                  <td className="max-w-[200px] truncate px-4 py-3 text-muted-foreground">{r.email ?? "—"}</td>
                  <td className="px-4 py-3 tabular-nums">{r.grade ?? "—"}</td>
                  <td className="max-w-[160px] truncate px-4 py-3 text-muted-foreground">
                    {r.school_name ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Switch
                      checked={r.is_pro}
                      disabled={busyId === r.id}
                      onChange={(v) => void toggleField(r.id, "is_pro", v)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Switch
                      checked={r.is_admin}
                      disabled={
                        (r.id === currentUserId && r.is_admin) || busyId === r.id
                      }
                      onChange={(v) => void toggleField(r.id, "is_admin", v)}
                      title={
                        r.id === currentUserId && r.is_admin
                          ? "You cannot remove your own admin access here."
                          : undefined
                      }
                    />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{fmtDate(r.created_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-muted-foreground">No users match this search.</p>
      )}
    </div>
  );
}

function Switch({
  checked,
  disabled,
  onChange,
  title,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={[
        "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors",
        checked
          ? "border-primary/50 bg-primary/25 shadow-[inset_0_0_12px_rgba(0,0,0,0.15)]"
          : "border-border/80 bg-muted/50 dark:border-gold/10",
        disabled ? "cursor-not-allowed opacity-50" : "hover:border-primary/40",
      ].join(" ")}
    >
      <span
        className={[
          "inline-block h-5 w-5 transform rounded-full bg-background shadow-sm ring-1 ring-border transition-transform",
          checked ? "translate-x-6" : "translate-x-1",
        ].join(" ")}
      />
    </button>
  );
}
