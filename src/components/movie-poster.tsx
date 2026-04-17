import { PosterBackdrop } from "@/components/poster-backdrop";
import { Movie } from "@/lib/types";

export function MoviePoster({ movie }: { movie: Movie }) {
  return (
    <div
      className="relative overflow-hidden rounded-[28px] p-5 text-white shadow-[0_25px_70px_rgba(107,70,193,0.32)]"
      style={{
        backgroundImage: movie.poster.imageUrl
          ? undefined
          : `linear-gradient(145deg, ${movie.poster.accentFrom}, ${movie.poster.accentTo})`,
        backgroundSize: movie.poster.imageUrl ? undefined : "cover",
        backgroundPosition: "center",
      }}
    >
      <PosterBackdrop imageUrl={movie.poster.imageUrl} profile="hero" objectFit="cover" />
      <div className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.35),transparent_36%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.18),transparent_30%)]" />
      <div className="relative z-[2] flex min-h-64 flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-white/18 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/92">
            {movie.poster.eyebrow}
          </span>
          <span className="rounded-full bg-black/16 px-3 py-1 text-xs font-medium">
            {movie.year}
          </span>
        </div>
        <div className="space-y-2">
          <p className="text-sm text-white/78">{movie.genre.join(" • ")}</p>
          <h3 className="max-w-[13rem] text-3xl font-semibold leading-tight">
            {movie.title}
          </h3>
        </div>
      </div>
    </div>
  );
}
