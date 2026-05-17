/** Shared layout + surface for Profile shortcut rows (Taste insight, Profile look, Friends, Settings). */

export const profileShortcutsStackClass = "flex w-full min-w-0 flex-col gap-3";

export function profileActionTileSurface(
  isDarkMode: boolean,
  tone: "violet" | "slate" = "violet",
): string {
  if (tone === "slate") {
    return isDarkMode
      ? "relative isolate w-full min-w-0 overflow-hidden rounded-[var(--radius-surface)] border border-white/12 bg-gradient-to-br from-slate-950/95 to-violet-950/35 ring-1 ring-white/8"
      : "relative isolate w-full min-w-0 overflow-hidden rounded-[var(--radius-surface)] border border-slate-200/95 bg-gradient-to-br from-white via-slate-50/95 to-violet-50/35 ring-1 ring-slate-200/80 shadow-[0_10px_28px_rgba(15,23,42,0.08)]";
  }

  return isDarkMode
    ? "relative isolate w-full min-w-0 overflow-hidden rounded-[var(--radius-surface)] border border-white/14 bg-gradient-to-br from-violet-950/55 to-slate-950/80 ring-1 ring-white/10"
    : "relative isolate w-full min-w-0 overflow-hidden rounded-[var(--radius-surface)] border border-violet-200/90 bg-gradient-to-br from-white via-violet-50/80 to-fuchsia-50/50 ring-1 ring-violet-100/90 shadow-[0_12px_32px_rgba(109,40,217,0.12)]";
}

export function profileActionTileAccentBar(accentClass: string): string {
  return `pointer-events-none absolute inset-x-0 top-0 z-[1] h-1 ${accentClass}`;
}

export function profileActionTileIconWrap(
  isDarkMode: boolean,
  tone: "violet" | "slate" = "violet",
): string {
  if (tone === "slate") {
    return isDarkMode
      ? "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/12 text-slate-100 ring-2 ring-white/18 transition group-hover:scale-[1.04] sm:h-12 sm:w-12"
      : "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-800 text-white ring-2 ring-slate-300/70 shadow-sm transition group-hover:scale-[1.04] sm:h-12 sm:w-12";
  }

  return isDarkMode
    ? "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-500/25 text-violet-100 ring-2 ring-violet-400/35 transition group-hover:scale-[1.04] sm:h-12 sm:w-12"
    : "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-600 text-white ring-2 ring-violet-300/60 shadow-sm transition group-hover:scale-[1.04] sm:h-12 sm:w-12";
}

export const profileActionTileHeaderRowClass =
  "relative z-10 flex w-full min-h-[4.75rem] items-center gap-3 px-4 py-4 text-left sm:min-h-[5rem] sm:gap-3.5 sm:px-5";

export const profileActionTileLinkRowClass =
  `${profileActionTileHeaderRowClass} transition hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:scale-[0.99]`;

export const profileActionTileTitleClass = (isDarkMode: boolean) =>
  isDarkMode ? "text-white" : "text-slate-900";

export const profileActionTileSubtitleClass = (
  isDarkMode: boolean,
  tone: "violet" | "slate" = "violet",
) => {
  if (tone === "slate") {
    return isDarkMode ? "text-slate-300" : "text-slate-600";
  }
  return isDarkMode ? "text-violet-200/85" : "text-violet-700/85";
};

export const profileActionTileChevronClass = (
  isDarkMode: boolean,
  tone: "violet" | "slate" = "violet",
) => {
  if (tone === "slate") {
    return isDarkMode ? "text-slate-400" : "text-slate-500";
  }
  return isDarkMode ? "text-violet-300/90" : "text-violet-500";
};
