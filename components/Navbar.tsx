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
    <nav>
      {/* Desktop top navbar (hidden on mobile) */}
      <div className="hidden md:block sticky top-0 z-50 border-b border-muted bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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
              href="/pricing"
              className="text-muted-foreground hover:text-gold transition-colors"
            >
              Pricing
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
      </div>

      {/* Mobile bottom navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-muted bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-4xl items-stretch justify-between px-2 py-1">
          <Link href="/dashboard" className="flex flex-1 flex-col items-center justify-center gap-0.5 text-xs text-muted-foreground">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M3 10.5L12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1v-10.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
            </svg>
            Home
          </Link>
          <Link href="/practice" className="flex flex-1 flex-col items-center justify-center gap-0.5 text-xs text-muted-foreground">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.8"/>
              <path d="M9 8h6M9 12h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            Practice
          </Link>
          <Link href="/notes" className="flex flex-1 flex-col items-center justify-center gap-0.5 text-xs text-muted-foreground">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M4 6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6Z" stroke="currentColor" strokeWidth="1.8"/>
              <path d="M8 8h8M8 12h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            Notes
          </Link>
          <Link href="/pricing" className="flex flex-1 flex-col items-center justify-center gap-0.5 text-xs text-muted-foreground">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M12 1 3 5v6c0 5 3.3 10.4 9 12 5.7-1.6 9-7 9-12V5l-9-4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
              <path d="M9.5 10.5 11 12l3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Plans
          </Link>
          <Link href="/flashcards" className="flex flex-1 flex-col items-center justify-center gap-0.5 text-xs text-muted-foreground">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M4 7a2 2 0 0 1 2-2h11a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H6a2 2 0 0 1-2-2V7Z" stroke="currentColor" strokeWidth="1.8"/>
              <path d="M8 10h7M8 14h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            Cards
          </Link>
          <Link href="/profile" className="flex flex-1 flex-col items-center justify-center gap-0.5 text-xs text-muted-foreground">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M20 21a8 8 0 0 0-16 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              <path d="M12 13a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" stroke="currentColor" strokeWidth="1.8"/>
            </svg>
            Profile
          </Link>
        </div>
      </div>
    </nav>
  );
}
