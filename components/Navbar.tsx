"use client";

import { Fragment, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { ThemeToggle } from "@/components/ThemeToggle";

const DESKTOP_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/practice", label: "Practice" },
  { href: "/weekly-exam", label: "Weekly exam" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/flashcards", label: "Flashcards" },
  { href: "/notes", label: "Notes" },
  { href: "/pricing", label: "Pricing" },
  { href: "/profile", label: "Profile" },
] as const;

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          if (!cancelled) setIsAdmin(false);
          return;
        }
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", user.id)
          .single();
        if (!cancelled) setIsAdmin(Boolean(profile?.is_admin));
      } catch {
        if (!cancelled) setIsAdmin(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

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

  function navLinkClass(href: string) {
    const active =
      pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
    return [
      "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
      active
        ? "bg-primary/15 text-primary shadow-sm ring-1 ring-primary/25 dark:bg-primary/25 dark:text-emerald-50"
        : "text-muted-foreground hover:bg-accent hover:text-foreground",
    ].join(" ");
  }

  return (
    <Fragment>
      {/* Top chrome: sticky sibling only — avoids fixed-inside-sticky bugs */}
      <header
        className="sticky top-0 z-[90] w-full border-b border-border/80 bg-background/95 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.12)] backdrop-blur-xl supports-[backdrop-filter]:bg-background/85 dark:border-primary/25 dark:bg-background/98 dark:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.5)]"
        style={{ WebkitBackdropFilter: "blur(14px)" }}
      >
        <div
          className="pointer-events-none h-0.5 w-full bg-gradient-to-r from-primary via-gold to-primary opacity-[0.95]"
          aria-hidden
        />

        {/* Mobile top bar */}
        <div className="flex h-12 items-center justify-between gap-3 px-4 md:hidden">
          <Link
            href="/dashboard"
            className="flex min-w-0 items-center gap-2 rounded-lg px-2 py-1 font-bold tracking-tight text-gold transition-colors hover:bg-accent/80"
          >
            <span className="text-lg shrink-0" aria-hidden>
              📚
            </span>
            <span className="truncate text-sm">Ethioacers</span>
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            {logoutError && (
              <span className="max-w-[7rem] truncate text-[10px] text-destructive" title={logoutError}>
                Error
              </span>
            )}
            <ThemeToggle />
          </div>
        </div>

        {/* Desktop */}
        <div className="mx-auto hidden h-[3.25rem] max-w-6xl items-center justify-between gap-4 px-4 md:flex">
          <Link
            href="/dashboard"
            className="flex shrink-0 items-center gap-2.5 rounded-xl px-2 py-1.5 font-bold tracking-tight text-gold transition-colors hover:bg-accent/60"
          >
            <span className="text-xl" aria-hidden>
              📚
            </span>
            <span className="text-base font-bold text-gold">Ethioacers</span>
          </Link>

          <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
            {logoutError && (
              <span className="max-w-[10rem] truncate text-xs text-destructive" title={logoutError}>
                {logoutError}
              </span>
            )}

            <nav className="hidden lg:flex flex-wrap items-center justify-end gap-1">
              {DESKTOP_LINKS.map(({ href, label }) => (
                <Link key={href} href={href} className={navLinkClass(href)}>
                  {label}
                </Link>
              ))}
              {isAdmin && (
                <Link href="/admin" className={navLinkClass("/admin")}>
                  Admin
                </Link>
              )}
            </nav>

            {/* Medium widths: horizontal scroll instead of crushed links */}
            <nav className="flex max-w-[min(42rem,calc(100vw-14rem))] items-center gap-1 overflow-x-auto pb-0.5 lg:hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {DESKTOP_LINKS.map(({ href, label }) => (
                <Link key={href} href={href} className={`${navLinkClass(href)} shrink-0`}>
                  {label}
                </Link>
              ))}
              {isAdmin && (
                <Link href="/admin" className={`${navLinkClass("/admin")} shrink-0`}>
                  Admin
                </Link>
              )}
            </nav>

            <button
              type="button"
              onClick={handleLogout}
              className="shrink-0 rounded-lg border border-input bg-secondary/50 px-3 py-2 text-sm font-medium shadow-sm transition-colors hover:border-primary/35 hover:bg-accent"
            >
              Logout
            </button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Mobile bottom bar — sibling of sticky header, not nested */}
      <div className="fixed bottom-0 left-0 right-0 z-[90] border-t border-border/80 bg-background/98 pb-[env(safe-area-inset-bottom)] pt-1 shadow-[0_-10px_40px_-12px_rgba(0,0,0,0.15)] backdrop-blur-xl supports-[backdrop-filter]:bg-background/90 md:hidden dark:border-primary/20 dark:shadow-[0_-12px_40px_-12px_rgba(0,0,0,0.55)]">
        <div className="mx-auto flex max-w-4xl items-stretch justify-between px-1">
          <Link
            href="/dashboard"
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 rounded-lg py-1.5 text-[10px] font-medium transition-colors ${
              pathname === "/dashboard"
                ? "text-primary"
                : "text-muted-foreground hover:bg-accent/70 hover:text-foreground"
            }`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M3 10.5L12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1v-10.5Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
            </svg>
            Home
          </Link>
          <Link
            href="/practice"
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 rounded-lg py-1.5 text-[10px] font-medium transition-colors ${
              pathname.startsWith("/practice") ? "text-primary" : "text-muted-foreground hover:bg-accent/70 hover:text-foreground"
            }`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.8" />
              <path d="M9 8h6M9 12h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            Practice
          </Link>
          <Link
            href="/weekly-exam"
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 rounded-lg py-1.5 text-[10px] font-medium transition-colors ${
              pathname.startsWith("/weekly-exam") ? "text-gold" : "text-muted-foreground hover:bg-accent/70 hover:text-foreground"
            }`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 3v3M18 3v3M4 8h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <rect x="4" y="5" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.8" />
              <path d="M9 13h6M9 17h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            Weekly
          </Link>
          <Link
            href="/leaderboard"
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 rounded-lg py-1.5 text-[10px] font-medium transition-colors ${
              pathname.startsWith("/leaderboard") ? "text-gold" : "text-muted-foreground hover:bg-accent/70 hover:text-foreground"
            }`}
          >
            <span className="text-lg leading-none" aria-hidden>
              🏆
            </span>
            <span className="max-w-[4rem] truncate text-center leading-tight">Leaderboard</span>
          </Link>
          <Link
            href="/notes"
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 rounded-lg py-1.5 text-[10px] font-medium transition-colors ${
              pathname.startsWith("/notes") ? "text-primary" : "text-muted-foreground hover:bg-accent/70 hover:text-foreground"
            }`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M4 6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6Z" stroke="currentColor" strokeWidth="1.8" />
              <path d="M8 8h8M8 12h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            Notes
          </Link>
          <Link
            href="/pricing"
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 rounded-lg py-1.5 text-[10px] font-medium transition-colors ${
              pathname.startsWith("/pricing") ? "text-primary" : "text-muted-foreground hover:bg-accent/70 hover:text-foreground"
            }`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M12 1 3 5v6c0 5 3.3 10.4 9 12 5.7-1.6 9-7 9-12V5l-9-4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
              <path d="M9.5 10.5 11 12l3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Plans
          </Link>
          <Link
            href="/flashcards"
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 rounded-lg py-1.5 text-[10px] font-medium transition-colors ${
              pathname.startsWith("/flashcards") ? "text-primary" : "text-muted-foreground hover:bg-accent/70 hover:text-foreground"
            }`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M4 7a2 2 0 0 1 2-2h11a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H6a2 2 0 0 1-2-2V7Z" stroke="currentColor" strokeWidth="1.8" />
              <path d="M8 10h7M8 14h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            Cards
          </Link>
          <Link
            href="/profile"
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 rounded-lg py-1.5 text-[10px] font-medium transition-colors ${
              pathname.startsWith("/profile") ? "text-primary" : "text-muted-foreground hover:bg-accent/70 hover:text-foreground"
            }`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M20 21a8 8 0 0 0-16 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M12 13a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" stroke="currentColor" strokeWidth="1.8" />
            </svg>
            Profile
          </Link>
          {isAdmin && (
            <Link
              href="/admin"
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 rounded-lg py-1.5 text-[10px] font-medium transition-colors ${
                pathname.startsWith("/admin") ? "text-gold" : "text-muted-foreground hover:bg-accent/70 hover:text-foreground"
              }`}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M12 2 4 6v6c0 5 3 10 8 11 5-1 8-6 8-11V6l-8-4Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
                <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              Admin
            </Link>
          )}
        </div>
      </div>
    </Fragment>
  );
}
