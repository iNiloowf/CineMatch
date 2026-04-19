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
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <Script id="cinematch-theme-boot" strategy="beforeInteractive">
          {`
            try {
              var supabaseUrl = ${JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "")};
              if (supabaseUrl && typeof document !== "undefined" && typeof window !== "undefined") {
                var projectRef = "";
                try {
                  projectRef = new URL(supabaseUrl).hostname.split(".")[0] || "";
                } catch (error) {
                  projectRef = "";
                }
                if (projectRef) {
                  var hostname = window.location.hostname;
                  var hostParts = hostname.split(".");
                  var rootDomain = hostParts.length >= 2 ? "." + hostParts.slice(-2).join(".") : "";
                  document.cookie
                    .split(";")
                    .map(function (entry) { return entry.trim().split("=")[0]; })
                    .filter(function (name) { return name.indexOf("sb-" + projectRef + "-") === 0; })
                    .forEach(function (name) {
                      document.cookie = name + "=; Max-Age=0; path=/; SameSite=Lax";
                      document.cookie = name + "=; Max-Age=0; path=/; domain=" + hostname + "; SameSite=Lax";
                      if (rootDomain) {
                        document.cookie = name + "=; Max-Age=0; path=/; domain=" + rootDomain + "; SameSite=Lax";
                      }
                    });
                }
              }
              var currentUserId = window.localStorage.getItem("cinematch-current-user-v5");
              var userTheme = currentUserId
                ? window.localStorage.getItem("cinematch-user-theme-" + currentUserId)
                : null;
              var globalTheme = window.localStorage.getItem("cinematch-theme-mode");
              var shouldUseDark = userTheme ? userTheme === "dark" : globalTheme === "dark";
              document.documentElement.classList.toggle("theme-dark", !!shouldUseDark);
              document.documentElement.style.colorScheme = shouldUseDark ? "dark" : "light";
              if (document.body) {
                document.body.style.background = shouldUseDark ? "#0d0a14" : "#f6f7fb";
                document.body.style.color = shouldUseDark ? "#f8fafc" : "#0f172a";
              }
            } catch (error) {}
          `}
        </Script>
        <AppStateProvider>{children}</AppStateProvider>
      </body>
    </html>
  );
}
