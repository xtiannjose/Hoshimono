import type { ReactNode } from "react";
import { Epilogue, Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";

import { LiveRegion } from "@/components/live-region";
import { Footer } from "@/components/shell/footer";
import { Header } from "@/components/shell/header";
import { ThemeProvider } from "@/components/theme-provider";
import { I18nProvider } from "@/i18n/client";
import { HTML_LANG, type Lang } from "@/i18n/lang";
import { MESSAGES } from "@/i18n/messages";

import "./globals.css";

// The page frame shared by the two root layouts: the shop under app/[lang]
// and the staff screens under app/admin (ADR 0017).

// latin-ext carries the peso sign (U+20B1).
const epilogue = Epilogue({
  variable: "--font-epilogue",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

// Order numbers and codes in admin tables only.
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  preload: false,
});

export function RootShell({
  lang,
  children,
}: {
  lang: Lang;
  children: ReactNode;
}) {
  const t = MESSAGES[lang].shell;
  return (
    <html
      lang={HTML_LANG[lang]}
      suppressHydrationWarning
      className={`${epilogue.variable} ${jakarta.variable} ${geistMono.variable}`}
    >
      <body className="flex min-h-dvh flex-col">
        <ThemeProvider>
          <I18nProvider lang={lang}>
            <a
              href="#main"
              className="rounded-pill bg-btn text-btn-fg sr-only px-4 py-3 font-semibold focus:not-sr-only focus:fixed focus:top-3 focus:left-4 focus:z-[100]"
            >
              {t.skipToContent}
            </a>
            <Header lang={lang} />
            <main id="main" className="flex-1">
              {children}
            </main>
            <Footer lang={lang} />
            <LiveRegion />
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
