"use client";

import { memo } from "react";
import { PosterBackdrop } from "@/components/poster-backdrop";
import type { Movie } from "@/lib/types";

export type DiscoverSearchResultRowProps = {
  result: Movie;
  isDarkMode: boolean;
  onSelect: (movie: Movie) => void;
};

export const DiscoverSearchResultRow = memo(function DiscoverSearchResultRow({
  result,
  isDarkMode,
  onSelect,
}: DiscoverSearchResultRowProps) {
  const shell = isDarkMode
    ? "border-white/10 bg-white/6"
    : "border-white/80 bg-white/80 shadow-[0_14px_34px_rgba(148,163,184,0.08)]";

  return (
    <button
      type="button"
      onClick={() => onSelect(result)}
      className={`flex w-full items-start gap-3 rounded-[24px] border px-4 py-4 text-left ${shell}`}
    >
      <div className="relative flex h-16 w-14 shrink-0 items-end overflow-hidden rounded-[16px] p-2 text-white">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: result.poster.imageUrl
              ? undefined
              : `linear-gradient(145deg, ${result.poster.accentFrom}, ${result.poster.accentTo})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <PosterBackdrop imageUrl={result.poster.imageUrl} profile="search" />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(145deg,rgba(30,20,50,0.22),rgba(20,16,30,0.55))]" />
        <span className="relative text-[10px] font-semibold uppercase tracking-[0.16em] text-white/80">
          {result.mediaType === "series" ? "Series" : "Movie"}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
          <h3
            className={`min-w-0 text-sm font-semibold sm:flex-1 sm:truncate ${
              isDarkMode ? "text-white" : "text-slate-900"
            }`}
          >
            {result.title}
          </h3>
          <span className="ui-chip ui-chip--surface w-fit shrink-0">{result.year}</span>
        </div>
        <p
          className={`mt-1 line-clamp-2 text-sm leading-6 ${
            isDarkMode ? "text-slate-300" : "text-slate-600"
          }`}
        >
          {result.description}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-[var(--rhythm-stack)]">
          <span className="ui-chip ui-chip--accent">{result.rating.toFixed(1)}</span>
          <span className="ui-chip ui-chip--surface">{result.runtime}</span>
        </div>
      </div>
    </button>
  );
});
