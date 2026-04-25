/** Curated TMDb poster art — used as one-tap default profile avatars. */

const S = (path: string) => `https://image.tmdb.org/t/p/w500${path}`;

export type DefaultProfileAvatarPreset = {
  id: string;
  label: string;
  imageUrl: string;
};

/**
 * TMDb replaces poster files over time. Paths below were refreshed to match
 * the current `poster_path` on TMDB (see `scripts/fetch-tmdb-posters.mjs`).
 */
export const DEFAULT_PROFILE_AVATAR_PRESETS: DefaultProfileAvatarPreset[] = [
  { id: "matrix", label: "The Matrix", imageUrl: S("/aOIuZAjPaRIE6CMzbazvcHuHXDc.jpg") },
  { id: "godfather", label: "The Godfather", imageUrl: S("/3bhkrj58Vtu7enYsRolD1fZdja1.jpg") },
  { id: "breaking-bad", label: "Breaking Bad", imageUrl: S("/ztkUQFLlC19CCMYHW9o1zWhJRNq.jpg") },
  { id: "inception", label: "Inception", imageUrl: S("/xlaY2zyzMfkhk0HSC5VUwzoZPU1.jpg") },
  { id: "parasite", label: "Parasite", imageUrl: S("/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg") },
  { id: "pulp", label: "Pulp Fiction", imageUrl: S("/vQWk5YBFWF4bZaofAbv0tShwBvQ.jpg") },
  { id: "stranger", label: "Stranger Things", imageUrl: S("/uOOtwVbSr4QDjAGIifLDwpb2Pdl.jpg") },
  { id: "spirited", label: "Spirited Away", imageUrl: S("/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg") },
  { id: "dune", label: "Dune", imageUrl: S("/gDzOcq0pfeCeqMBwKIJlSmQpjkZ.jpg") },
  { id: "got", label: "Game of Thrones", imageUrl: S("/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg") },
  { id: "interstellar", label: "Interstellar", imageUrl: S("/yQvGrMoipbRoddT0ZR8tPoR7NfX.jpg") },
  { id: "office", label: "The Office (US)", imageUrl: S("/7DJKHzAi83BmQrWLrYYOqcoKfhR.jpg") },
];
