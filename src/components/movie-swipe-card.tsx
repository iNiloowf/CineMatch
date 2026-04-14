"use client";

import { useState } from "react";
import { SurfaceCard } from "@/components/surface-card";
import { Movie } from "@/lib/types";

type MovieSwipeCardProps = {
  movie: Movie;
  onAccept: () => void;
  onReject: () => void;
};

export function MovieSwipeCard({
  movie,
  onAccept,
  onReject,
}: MovieSwipeCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const shouldClamp = movie.description.length > 110;
  const previewText =
    shouldClamp && !isExpanded
      ? `${movie.description.slice(0, 110).trimEnd()}...`
      : movie.description;

  return (
    <SurfaceCard className="flex min-h-[calc(100dvh-15.5rem)] flex-col gap-3 overflow-hidden p-4 sm:min-h-[calc(100dvh-16.5rem)]">
      <div
        className="relative overflow-hidden rounded-[26px] p-4 text-white shadow-[0_22px_60px_rgba(107,70,193,0.28)]"
        style={{
          backgroundImage: movie.poster.imageUrl
            ? `linear-gradient(145deg, rgba(30, 20, 50, 0.3), rgba(20, 16, 30, 0.76)), url(${movie.poster.imageUrl})`
            : `linear-gradient(145deg, ${movie.poster.accentFrom}, ${movie.poster.accentTo})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.3),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.16),transparent_30%)]" />
        <div className="relative flex min-h-[15.5rem] flex-col justify-between">
          <div className="flex items-center justify-between gap-3">
            <span
              className="rounded-full bg-white/18 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/92"
            >
              {movie.mediaType === "series" ? "Series" : "Movie"}
            </span>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-black/18 px-2.5 py-1 text-[11px] font-semibold text-white/88">
                {movie.year}
              </span>
              <span className="rounded-full bg-black/18 px-2.5 py-1 text-[11px] font-semibold text-white/88">
                {movie.rating.toFixed(1)}
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium text-white/76">
              {movie.genre.slice(0, 3).join(" • ")}
            </p>
            <h2 className="max-w-[13rem] text-3xl font-semibold leading-tight">
              {movie.title}
            </h2>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
          {movie.rating.toFixed(1)} rating
        </span>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
          {movie.runtime}
        </span>
        {movie.genre.slice(0, 3).map((entry) => (
          <span
            key={entry}
            className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
          >
            {entry}
          </span>
        ))}
      </div>

      <div className="flex min-h-0 flex-1 flex-col justify-between gap-3">
        <div className="min-h-0">
          <p className="text-sm leading-6 text-slate-600">{previewText}</p>
          {shouldClamp ? (
            <button
              type="button"
              onClick={() => setIsExpanded((current) => !current)}
              className="mt-2 text-sm font-semibold text-violet-600"
            >
              {isExpanded ? "Less" : "More"}
            </button>
          ) : null}
        </div>
        <div className="mt-auto grid grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            onClick={onReject}
            className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
          >
            Reject
          </button>
          <button
            type="button"
            onClick={onAccept}
            className="rounded-[22px] bg-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_30px_rgba(124,58,237,0.3)] transition hover:bg-violet-500"
          >
            Accept
          </button>
        </div>
      </div>
    </SurfaceCard>
  );
}
