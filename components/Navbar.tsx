"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { ThemeToggle } from "@/components/ThemeToggle";

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

          <div className="hidden md:flex flex-wrap items-center gap-6">
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
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="text-muted-foreground hover:text-gold transition-colors"
          >
            Logout
          </button>
          <div className="flex items-center">
            <ThemeToggle />
          </div>
        </div>
      </div>

      {/* Mobile bottom navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-muted bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-4xl items-stretch justify-between px-2 py-1">
          <Link href="/dashboard" className="flex flex-1 flex-col items-center justify-center gap-0.5 text-xs text-muted-foreground">
            <span className="text-base" aria-hidden>
              🏠
            </span>
            Home
          </Link>
          <Link href="/practice" className="flex flex-1 flex-col items-center justify-center gap-0.5 text-xs text-muted-foreground">
            <span className="text-base" aria-hidden>
              📝
            </span>
            Practice
          </Link>
          <Link href="/notes" className="flex flex-1 flex-col items-center justify-center gap-0.5 text-xs text-muted-foreground">
            <span className="text-base" aria-hidden>
              📖
            </span>
            Notes
          </Link>
          <Link href="/flashcards" className="flex flex-1 flex-col items-center justify-center gap-0.5 text-xs text-muted-foreground">
            <span className="text-base" aria-hidden>
              🃏
            </span>
            Cards
          </Link>
          <Link href="/profile" className="flex flex-1 flex-col items-center justify-center gap-0.5 text-xs text-muted-foreground">
            <span className="text-base" aria-hidden>
              👤
            </span>
            Profile
          </Link>
        </div>
      </div>
    </nav>
  );
}
