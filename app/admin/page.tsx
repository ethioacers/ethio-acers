"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Navbar } from "@/components/Navbar";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminSpinner } from "@/components/admin/AdminSpinner";
import { AdminToast, type ToastMessage } from "@/components/admin/AdminToast";

export default function AdminPage() {
  const router = useRouter();
  const [gate, setGate] = useState<"loading" | "ok" | "deny">("loading");
  const [userId, setUserId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const showToast = useCallback((kind: "success" | "error", text: string) => {
    setToast({ id: Date.now(), kind, text });
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
          error: userErr,
        } = await supabase.auth.getUser();
        if (userErr || !user) {
          if (!cancelled) {
            router.replace("/login?redirectTo=/admin");
            setGate("deny");
          }
          return;
        }
        const { data: profile, error: prErr } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", user.id)
          .single();
        if (cancelled) return;
        if (prErr || !profile?.is_admin) {
          router.replace("/dashboard");
          setGate("deny");
          return;
        }
        setUserId(user.id);
        setGate("ok");
      } catch {
        if (!cancelled) {
          router.replace("/dashboard");
          setGate("deny");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (gate === "loading" || !userId) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-background pb-24 pt-8 md:pb-10">
          <AdminSpinner label="Checking access…" />
        </main>
      </>
    );
  }

  if (gate === "deny") {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-background pb-24 pt-8 md:pb-10">
          <AdminSpinner label="Redirecting…" />
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <AdminToast toast={toast} onDismiss={dismissToast} />
      <AdminShell currentUserId={userId} showToast={showToast} />
    </>
  );
}
