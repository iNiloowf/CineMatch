import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { AppStateProvider } from "@/lib/app-state";
import { htmlMetadataIcons } from "@/lib/pwa-app-icons";
import "./globals.css";

export const metadata: Metadata = {
  title: "CineMatch",
  description: "A polished mobile-first movie matching app.",
  applicationName: "CineMatch",
  icons: htmlMetadataIcons(),
  appleWebApp: {
    capable: true,
    title: "CineMatch",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  /** Edge-to-edge on notched devices; use env(safe-area-*) in shell / auth. */
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7fb" },
    { media: "(prefers-color-scheme: dark)", color: "#0f0b1a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

  return (
    <html
      lang="en"
      className="h-full antialiased"
      data-supabase-url={supabaseUrl}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <Script id="cinematch-theme-boot" src="/scripts/theme-boot.js" strategy="beforeInteractive" />
        <AppStateProvider>{children}</AppStateProvider>
      </body>
    </html>
  );
}
