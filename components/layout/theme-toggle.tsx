"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

// A no-op subscription: nothing external ever changes, we just need
// different values for the server snapshot (SSR — always false) vs. the
// client snapshot (always true once React has hydrated and is running this
// code in the browser). This is the same "am I mounted yet" check as a
// useState+useEffect pair, expressed via useSyncExternalStore instead,
// which avoids calling setState from inside an effect body.
function subscribe() {
  return () => {};
}
function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
}

/**
 * components/layout/theme-toggle.tsx
 * ----------------------------------------------------------------------------
 * `app/providers.tsx` already wraps the app in next-themes' `ThemeProvider`
 * (`attribute="class"`, `defaultTheme="system"`), and every color in
 * `app/globals.css` is defined for both `:root` and `.dark` — so dark mode
 * has worked at the CSS level since the first version of this app. What was
 * missing was any actual UI control for a person to switch it: this button.
 * It's a dropdown with three explicit choices (Light / Dark / System) rather
 * than a single toggle, so "follow my OS setting" stays a first-class,
 * reachable option rather than something only available by clearing state.
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useIsClient();

  const icon = !mounted ? Monitor : theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;
  const Icon = icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex h-9 w-9 items-center justify-center rounded-md text-foreground-muted hover:bg-surface-muted hover:text-foreground"
          aria-label="Toggle theme"
        >
          <Icon className="h-4.5 w-4.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-40">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <Sun className="h-4 w-4" /> Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <Moon className="h-4 w-4" /> Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          <Monitor className="h-4 w-4" /> System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
