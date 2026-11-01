"use client";

import { MoonIcon, SunIcon } from "@phosphor-icons/react";
import { useTheme } from "next-themes";

import { ICON_BUTTON } from "@/components/ui/button-classes";
import { useMessages } from "@/i18n/client";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const t = useMessages().shell;

  // Both icons render and CSS picks one, so server and client markup match.
  return (
    <button
      type="button"
      className={ICON_BUTTON}
      aria-label={t.toggleTheme}
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <SunIcon className="hidden dark:block" size={24} aria-hidden />
      <MoonIcon className="dark:hidden" size={24} aria-hidden />
    </button>
  );
}
