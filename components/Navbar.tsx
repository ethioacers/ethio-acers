"use client";

import { Fragment, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { ThemeToggle } from "@/components/ThemeToggle";

const DESKTOP_NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/practice", label: "Practice" },
  { href: "/weekly-exam", label: "Weekly" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/notes", label: "Notes" },
  { href: "/flashcards", label: "Flashcards" },
  { href: "/friends", label: "Friends" },
] as const;

const MORE_ITEMS: {
  href: string;
  icon: string;
  label: string;
  adminOnly?: boolean;
}[] = [
  { href: "/notes", icon: "📖", label: "Notes" },
  { href: "/flashcards", icon: "🃏", label: "Flashcards" },
  { href: "/weekly-exam", icon: "📅", label: "Weekly Exam" },
  { href: "/pricing", icon: "💰", label: "Plans" },
  { href: "/friends", icon: "👥", label: "Friends" },
  { href: "/admin", icon: "⚙️", label: "Admin", adminOnly: true },
];

const HIDE_MOBILE_BOTTOM_PATHS = new Set(["/", "/login", "/signup"]);

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

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

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [moreOpen]);

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

  function navLinkActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  function navLinkClass(href: string) {
    const active = navLinkActive(href);
    return [
      "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
      active
        ? "bg-primary/15 text-primary shadow-sm ring-1 ring-primary/25 dark:bg-primary/25 dark:text-emerald-50"
        : "text-muted-foreground hover:bg-accent hover:text-foreground",
    ].join(" ");
  }

  function mobileTabActive(href: string) {
    return navLinkActive(href);
  }

  const showMobileBottom = pathname != null && !HIDE_MOBILE_BOTTOM_PATHS.has(pathname);

  const drawerItems = MORE_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  return (
    <Fragment>
      <header
        className="sticky top-0 z-[90] w-full border-b border-border/80 bg-background/95 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.12)] backdrop-blur-xl supports-[backdrop-filter]:bg-background/85 dark:border-primary/25 dark:bg-background/98 dark:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.5)]"
        style={{ WebkitBackdropFilter: "blur(14px)" }}
      >
        <div
          className="pointer-events-none h-0.5 w-full bg-gradient-to-r from-primary via-gold to-primary opacity-[0.95]"
          aria-hidden
        />

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
              {DESKTOP_NAV_LINKS.map(({ href, label }) => (
                <Link key={href} href={href} className={navLinkClass(href)}>
                  {label}
                </Link>
              ))}
            </nav>

            <nav className="flex max-w-[min(42rem,calc(100vw-14rem))] items-center gap-1 overflow-x-auto pb-0.5 lg:hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {DESKTOP_NAV_LINKS.map(({ href, label }) => (
                <Link key={href} href={href} className={`${navLinkClass(href)} shrink-0`}>
                  {label}
                </Link>
              ))}
            </nav>

            <Link href="/pricing" className={`${navLinkClass("/pricing")} shrink-0`}>
              Plans
            </Link>
            {isAdmin && (
              <Link href="/admin" className={`${navLinkClass("/admin")} shrink-0`}>
                Admin
              </Link>
            )}

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

      {showMobileBottom && (
        <>
          <div className="fixed bottom-0 left-0 right-0 z-[90] border-t border-border/80 bg-background/98 pb-[env(safe-area-inset-bottom)] pt-1 shadow-[0_-10px_40px_-12px_rgba(0,0,0,0.15)] backdrop-blur-xl supports-[backdrop-filter]:bg-background/90 md:hidden dark:border-primary/20 dark:shadow-[0_-12px_40px_-12px_rgba(0,0,0,0.55)]">
            <div className="mx-auto grid max-w-md grid-cols-5 items-end gap-0 px-2 pb-1 pt-1">
              <Link
                href="/dashboard"
                className={`flex flex-col items-center justify-end gap-0.5 rounded-lg py-1 text-[10px] font-medium transition-colors ${
                  mobileTabActive("/dashboard")
                    ? "text-primary"
                    : "text-muted-foreground hover:bg-accent/70 hover:text-foreground"
                }`}
              >
                <span className="text-lg leading-none" aria-hidden>
                  🏠
                </span>
                Home
              </Link>
              <Link
                href="/practice"
                className={`flex flex-col items-center justify-end gap-0.5 rounded-lg py-1 text-[10px] font-medium transition-colors ${
                  pathname.startsWith("/practice")
                    ? "text-primary"
                    : "text-muted-foreground hover:bg-accent/70 hover:text-foreground"
                }`}
              >
                <span className="text-lg leading-none" aria-hidden>
                  📝
                </span>
                Practice
              </Link>
              <div className="flex flex-col items-center justify-end pb-0.5">
                <button
                  type="button"
                  aria-expanded={moreOpen}
                  aria-haspopup="dialog"
                  aria-label="More navigation"
                  onClick={() => setMoreOpen(true)}
                  className={[
                    "flex h-[3.25rem] w-[3.25rem] flex-col items-center justify-center rounded-2xl bg-gold text-center text-[10px] font-bold leading-tight text-black shadow-[0_8px_20px_-4px_rgba(0,0,0,0.35),0_4px_0_0_rgba(202,138,4,0.45)] ring-2 ring-gold/60 transition-transform active:translate-y-0.5 active:shadow-md",
                    moreOpen ? "ring-primary/40" : "",
                  ].join(" ")}
                >
                  <span className="text-xl leading-none" aria-hidden>
                    🔍
                  </span>
                  More
                </button>
              </div>
              <Link
                href="/leaderboard"
                className={`flex flex-col items-center justify-end gap-0.5 rounded-lg py-1 text-[10px] font-medium transition-colors ${
                  pathname.startsWith("/leaderboard")
                    ? "text-gold"
                    : "text-muted-foreground hover:bg-accent/70 hover:text-foreground"
                }`}
              >
                <span className="text-lg leading-none" aria-hidden>
                  🏆
                </span>
                <span className="max-w-[4rem] truncate text-center leading-tight">Leaderboard</span>
              </Link>
              <Link
                href="/profile"
                className={`flex flex-col items-center justify-end gap-0.5 rounded-lg py-1 text-[10px] font-medium transition-colors ${
                  pathname.startsWith("/profile")
                    ? "text-primary"
                    : "text-muted-foreground hover:bg-accent/70 hover:text-foreground"
                }`}
              >
                <span className="text-lg leading-none" aria-hidden>
                  👤
                </span>
                Profile
              </Link>
            </div>
          </div>

          {moreOpen && (
            <div className="fixed inset-0 z-[95] md:hidden" role="presentation">
              <button
                type="button"
                aria-label="Close menu"
                className="absolute inset-0 bg-black/65 backdrop-blur-[2px]"
                onClick={() => setMoreOpen(false)}
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-label="More destinations"
                className="absolute bottom-0 left-0 right-0 max-h-[85vh] animate-in slide-in-from-bottom-4 fade-in duration-200 rounded-t-3xl border border-border/80 bg-background/98 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 shadow-[0_-20px_50px_-12px_rgba(0,0,0,0.45)] dark:border-gold/20"
              >
                <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted-foreground/35" aria-hidden />
                <p className="px-5 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Explore
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3 px-4 sm:grid-cols-3">
                  {drawerItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMoreOpen(false)}
                      className="flex flex-col items-center gap-2 rounded-2xl border border-border/70 bg-card/80 p-4 text-center shadow-sm transition-colors hover:border-gold/35 hover:bg-accent/40 dark:border-gold/15"
                    >
                      <span className="text-2xl" aria-hidden>
                        {item.icon}
                      </span>
                      <span className="text-xs font-semibold leading-tight">{item.label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </Fragment>
  );
}
