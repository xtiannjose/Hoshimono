import type { Metadata, Viewport } from "next";

import { AppShell } from "@/components/shell/installable";
import { brand } from "@/config/brand";
import { LANGS } from "@/i18n/lang";
import { MESSAGES } from "@/i18n/messages";
import { getLang } from "@/i18n/server";

import { RootShell } from "../root-shell";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  return {
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
    ),
    title: { default: brand.name, template: `%s | ${brand.name}` },
    description: MESSAGES[lang].shell.about,
    openGraph: {
      siteName: brand.name,
      locale: lang === "fil" ? "fil_PH" : "en_PH",
      type: "website",
    },
    twitter: { card: "summary_large_image" },
  };
}

// The browser bar matches the page (docs/05 section 3 backgrounds).
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f8ee" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1610" },
  ],
};

/**
 * Each language is its own prerendered site. The proxy sends every address
 * to /en or /fil, so no other value reaches this segment.
 */
export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

export default async function ShopLayout({ children }: LayoutProps<"/[lang]">) {
  return (
    <RootShell lang={await getLang()}>
      <AppShell />
      {children}
    </RootShell>
  );
}
