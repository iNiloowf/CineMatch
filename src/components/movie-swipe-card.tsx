 "use client";

import { useState } from "react";
import { MoviePoster } from "@/components/movie-poster";
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
  const shouldClamp = movie.description.length > 150;
  const previewText =
    shouldClamp && !isExpanded
      ? `${movie.description.slice(0, 150).trimEnd()}...`
      : movie.description;

  return (
    <div className="space-y-4">
      <MoviePoster movie={movie} />
      <SurfaceCard className="flex min-h-[19rem] flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
            {movie.rating.toFixed(1)} rating
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            {movie.runtime}
          </span>
          {movie.genre.map((entry) => (
            <span
              key={entry}
              className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
            >
              {entry}
            </span>
          ))}
        </div>
        <div className="flex min-h-[8.5rem] flex-1 flex-col justify-between">
          <p className="text-sm leading-7 text-slate-600">{previewText}</p>
          {shouldClamp ? (
            <button
              type="button"
              onClick={() => setIsExpanded((current) => !current)}
              className="text-sm font-semibold text-violet-600"
            >
              {isExpanded ? "Less" : "More"}
            </button>
          ) : (
            <div className="h-5" aria-hidden="true" />
          )}
        </div>
        <div className="mt-auto grid grid-cols-2 gap-3">
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
      </SurfaceCard>
    </div>
  );
}
