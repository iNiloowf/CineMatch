/**
 * Bootstrap theme + clear stale Supabase cookies before first paint.
 * Kept in an external file so a strict Content-Security-Policy can block inline scripts.
 */
(function cinematchThemeBoot() {
  try {
    var supabaseUrl = "";
    if (document.documentElement) {
      supabaseUrl = document.documentElement.getAttribute("data-supabase-url") || "";
    }
    if (supabaseUrl && typeof document !== "undefined" && typeof window !== "undefined") {
      var projectRef = "";
      try {
        projectRef = new URL(supabaseUrl).hostname.split(".")[0] || "";
      } catch {
        projectRef = "";
      }
      if (projectRef) {
        var hostname = window.location.hostname;
        var hostParts = hostname.split(".");
        var rootDomain = hostParts.length >= 2 ? "." + hostParts.slice(-2).join(".") : "";
        document.cookie
          .split(";")
          .map(function (entry) {
            return entry.trim().split("=")[0];
          })
          .filter(function (name) {
            return name.indexOf("sb-" + projectRef + "-") === 0;
          })
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
    document.documentElement.classList.toggle("theme-dark", Boolean(shouldUseDark));
    document.documentElement.style.colorScheme = shouldUseDark ? "dark" : "light";
    if (document.body) {
      document.body.style.background = shouldUseDark ? "#0d0a14" : "#f6f7fb";
      document.body.style.color = shouldUseDark ? "#f8fafc" : "#0f172a";
    }
  } catch {
    // Best-effort only.
  }
})();
