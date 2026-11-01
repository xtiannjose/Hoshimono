"use client";

import { DownloadSimpleIcon, WifiSlashIcon } from "@phosphor-icons/react";
import { useEffect, useSyncExternalStore } from "react";

import { useMessages } from "@/i18n/client";

// The installable app (ADR 0017): the service worker, a note while offline
// and Android's install prompt.

type InstallPrompt = Event & { prompt: () => Promise<void> };

let prompt: InstallPrompt | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

if (typeof window !== "undefined") {
  // Chrome on Android offers it once the app can be installed; keep it for
  // the button instead of its own mini bar.
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    prompt = event as InstallPrompt;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    prompt = null;
    notify();
  });
}

const subscribeOnline = (change: () => void) => {
  window.addEventListener("online", change);
  window.addEventListener("offline", change);
  return () => {
    window.removeEventListener("online", change);
    window.removeEventListener("offline", change);
  };
};

/** Registers the service worker and says so while there is no connection. */
export function AppShell() {
  const t = useMessages().app;
  const online = useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true
  );
  useEffect(() => {
    // Not in development: stored pages would hide code changes.
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  if (online) return null;
  return (
    <div className="wrap mt-3">
      <p
        role="status"
        className="rounded-field bg-warn-soft text-warn flex items-center gap-2 px-4 py-2.5 text-sm font-semibold"
      >
        <WifiSlashIcon size={18} aria-hidden className="shrink-0" />
        {t.offlineNote}
      </p>
    </div>
  );
}

/** "Install the app", shown only when the browser offers it (Android). */
export function InstallButton({ className }: { className: string }) {
  const t = useMessages().app;
  const offered = useSyncExternalStore(
    (change) => {
      listeners.add(change);
      return () => listeners.delete(change);
    },
    () => prompt !== null,
    () => false
  );
  if (!offered) return null;
  return (
    <button
      type="button"
      onClick={() => {
        void prompt?.prompt();
        prompt = null;
        notify();
      }}
      className={className}
    >
      <DownloadSimpleIcon size={18} aria-hidden className="mr-1.5" />
      {t.install}
    </button>
  );
}
