import type { Metadata } from "next";
import Script from "next/script";
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
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <Script id="cinematch-theme-boot" strategy="beforeInteractive">
          {`
            try {
              var currentUserId = window.localStorage.getItem("cinematch-current-user-v5");
              var userTheme = currentUserId
                ? window.localStorage.getItem("cinematch-user-theme-" + currentUserId)
                : null;
              var globalTheme = window.localStorage.getItem("cinematch-theme-mode");
              var shouldUseDark = userTheme ? userTheme === "dark" : globalTheme === "dark";
              document.documentElement.classList.toggle("theme-dark", !!shouldUseDark);
            } catch (error) {}
          `}
        </Script>
        <AppStateProvider>{children}</AppStateProvider>
      </body>
    </html>
  );
}
