import type { Metadata } from "next";
import { Epilogue, Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";

import { LiveRegion } from "@/components/live-region";
import { Footer } from "@/components/shell/footer";
import { Header } from "@/components/shell/header";
import { ThemeProvider } from "@/components/theme-provider";
import { brand } from "@/config/brand";
import "./globals.css";

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

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  ),
  title: { default: brand.name, template: `%s | ${brand.name}` },
  description: brand.description,
  openGraph: { siteName: brand.name, locale: "en_PH", type: "website" },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${epilogue.variable} ${jakarta.variable} ${geistMono.variable}`}
    >
      <body className="flex min-h-dvh flex-col">
        <ThemeProvider>
          <a
            href="#main"
            className="rounded-pill bg-btn text-btn-fg sr-only px-4 py-3 font-semibold focus:not-sr-only focus:fixed focus:top-3 focus:left-4 focus:z-[100]"
          >
            Skip to main content
          </a>
          <Header />
          <main id="main" className="flex-1">
            {children}
          </main>
          <Footer />
          <LiveRegion />
        </ThemeProvider>
      </body>
    </html>
  );
}
