import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import type { ReactNode } from "react";
import { THEME_SCRIPT } from "@/features/theme/theme";
import { Providers } from "./providers";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk" });

const description =
  "Open-source thermal Earth observation on a map: Landsat surface temperature, NASA GIBS and any STAC catalog, declared as JSON.";

export const metadata: Metadata = {
  // Absolute URLs for link previews. CI sets the public origin; locally it is the dev server.
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "Gryphon", template: "%s · Gryphon" },
  description,
  applicationName: "Gryphon",
  openGraph: { type: "website", siteName: "Gryphon", title: "Gryphon", description },
  twitter: { card: "summary_large_image", title: "Gryphon", description },
};

export const viewport: Viewport = {
  colorScheme: "dark light",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0b1020" },
    { media: "(prefers-color-scheme: light)", color: "#f4f6fb" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // The inline script sets data-theme before first paint, so React must not fight it.
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`} data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
