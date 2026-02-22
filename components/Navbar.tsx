"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

export function Navbar() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
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
