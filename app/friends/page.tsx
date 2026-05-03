"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Navbar } from "@/components/Navbar";

export default function FriendsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();
        if (!cancelled) {
          if (error || !user) {
            router.replace("/login?redirectTo=/friends");
            return;
          }
          setLoading(false);
        }
      } catch {
        if (!cancelled) router.replace("/login?redirectTo=/friends");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="flex min-h-screen items-center justify-center p-4 pb-24 md:pb-10">
          <p className="text-muted-foreground">Loading…</p>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background p-6 pb-24 md:pb-10">
        <div className="mx-auto max-w-lg space-y-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-2xl font-bold text-gold">Friends</h1>
            <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
              ← Dashboard
            </Link>
          </div>
          <div className="rounded-2xl border border-border/70 bg-card/60 p-6 shadow-sm dark:border-gold/15">
            <p className="text-sm text-muted-foreground">
              Friend invites and study groups are coming soon. Check back later!
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
