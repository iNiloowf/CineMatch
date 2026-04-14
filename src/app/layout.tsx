import type { Metadata } from "next";
import { AppStateProvider } from "@/lib/app-state";
import "./globals.css";

export const metadata: Metadata = {
  title: "CineMatch",
  description: "A polished mobile-first movie matching app.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <AppStateProvider>{children}</AppStateProvider>
      </body>
    </html>
  );
}
