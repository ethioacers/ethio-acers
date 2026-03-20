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
          🌙
        </span>
        <span
          className={`absolute inset-0 flex items-center justify-center transition-all duration-200 ease-out ${
            mounted && !isDark
              ? "opacity-100 scale-100 rotate-0"
              : "pointer-events-none opacity-0 scale-75 rotate-12"
          }`}
        >
          ☀️
        </span>
      </span>
    </button>
  );
}

