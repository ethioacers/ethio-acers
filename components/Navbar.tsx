"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

export function Navbar() {
  const router = useRouter();
  const [logoutError, setLogoutError] = useState<string | null>(null);

  async function handleLogout() {
    setLogoutError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();
      if (error) {
        setLogoutError(error.message);
        return;
      }
      router.push("/login");
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setLogoutError(msg || "Failed to log out.");
    }
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-muted bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-3 sm:px-4 gap-2">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 font-bold text-gold hover:text-gold/90"
        >
          <span className="text-lg sm:text-xl">📚</span>
          <span className="text-sm sm:text-base">Ethio Acers</span>
        </Link>
        <div className="flex flex-wrap items-center justify-end gap-3 sm:gap-6 text-xs sm:text-sm">
          {logoutError && (
            <span className="max-w-[12rem] truncate text-destructive" title={logoutError}>
              {logoutError}
            </span>
          )}
          <Link
            href="/dashboard"
            className="text-muted-foreground hover:text-gold transition-colors"
          >
            Dashboard
          </Link>
          <Link
            href="/practice"
            className="text-muted-foreground hover:text-gold transition-colors"
          >
            Practice
          </Link>
          <Link
            href="/notes"
            className="text-muted-foreground hover:text-gold transition-colors"
          >
            Notes
          </Link>
          <Link
            href="/flashcards"
            className="text-muted-foreground hover:text-gold transition-colors"
          >
            Flashcards
          </Link>
          <Link
            href="/profile"
            className="text-muted-foreground hover:text-gold transition-colors"
          >
            Profile
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="text-muted-foreground hover:text-gold transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
