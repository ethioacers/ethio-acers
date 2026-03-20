"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = theme === "dark";
  const toggleTheme = () => setTheme(isDark ? "light" : "dark");

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-muted bg-card/50 shadow-sm transition-colors hover:bg-card"
    >
      <span className="relative flex h-5 w-5 items-center justify-center">
        <span
          className={`absolute inset-0 flex items-center justify-center transition-all duration-200 ease-out ${
            mounted && isDark
              ? "opacity-100 scale-100 rotate-0"
              : "pointer-events-none opacity-0 scale-75 -rotate-12"
          }`}
        >
          {/* Moon icon */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M21 13.2A8.5 8.5 0 0 1 10.8 3a7 7 0 1 0 10.2 10.2Z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span
          className={`absolute inset-0 flex items-center justify-center transition-all duration-200 ease-out ${
            mounted && !isDark
              ? "opacity-100 scale-100 rotate-0"
              : "pointer-events-none opacity-0 scale-75 rotate-12"
          }`}
        >
          {/* Sun icon */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z" stroke="currentColor" strokeWidth="1.8" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </span>
      </span>
    </button>
  );
}

