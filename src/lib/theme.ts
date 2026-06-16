import { useEffect, useSyncExternalStore } from "react";

const THEME_KEY = "agnes.agent.theme";
export type ThemeMode = "dark" | "light";

function getInitialTheme(): ThemeMode {
  const stored = typeof localStorage !== "undefined" ? localStorage.getItem(THEME_KEY) : null;
  if (stored === "dark" || stored === "light") return stored;
  if (typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) {
    return "light";
  }
  return "dark";
}

let listeners: Array<() => void> = [];
let current: ThemeMode = getInitialTheme();

function emit() {
  listeners.forEach((l) => l());
}

export function setTheme(mode: ThemeMode) {
  current = mode;
  try {
    localStorage.setItem(THEME_KEY, mode);
  } catch {}
  applyTheme(mode);
  emit();
}

function applyTheme(mode: ThemeMode) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", mode);
  document.documentElement.style.colorScheme = mode;
}

export function toggleTheme() {
  setTheme(current === "dark" ? "light" : "dark");
}

// 启动时应用
if (typeof document !== "undefined") {
  applyTheme(current);
}

export function useTheme(): { theme: ThemeMode; set: (m: ThemeMode) => void; toggle: () => void } {
  useSyncExternalStore(
    (cb) => {
      listeners.push(cb);
      return () => {
        listeners = listeners.filter((x) => x !== cb);
      };
    },
    () => current,
    () => current,
  );
  useEffect(() => {
    applyTheme(current);
  }, []);
  return { theme: current, set: setTheme, toggle: toggleTheme };
}
