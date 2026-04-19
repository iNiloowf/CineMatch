/** Normalize API/runtime placeholder copy for compact UI (e.g. Picks cards). */
export function formatRuntimeForDisplay(runtime: string): string {
  const t = runtime.trim();
  if (!t) {
    return "N/A";
  }
  if (t.toLowerCase() === "runtime unavailable") {
    return "N/A";
  }
  return t;
}
