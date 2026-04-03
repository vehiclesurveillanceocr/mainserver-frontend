"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

type ThemeMode = "light" | "dark";

interface ThemeContextValue {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = "surveillance-theme";

function applyTheme(theme: ThemeMode) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.dataset.theme = theme;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>("light");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const nextTheme: ThemeMode =
      stored === "dark" || stored === "light"
        ? stored
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";

    setThemeState(nextTheme);
    applyTheme(nextTheme);
  }, []);

  const value = useMemo<ThemeContextValue>(() => ({
    theme,
    setTheme(nextTheme) {
      setThemeState(nextTheme);
      applyTheme(nextTheme);
      window.localStorage.setItem(STORAGE_KEY, nextTheme);
    },
    toggleTheme() {
      const nextTheme: ThemeMode = theme === "light" ? "dark" : "light";
      setThemeState(nextTheme);
      applyTheme(nextTheme);
      window.localStorage.setItem(STORAGE_KEY, nextTheme);
    },
  }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return context;
}
