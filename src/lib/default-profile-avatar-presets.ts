/** Curated TMDb poster art — used as one-tap default profile avatars. */

const S = (path: string) => `https://image.tmdb.org/t/p/w500${path}`;

export type DefaultProfileAvatarPreset = {
  id: string;
  label: string;
  imageUrl: string;
};

/**
 * Well-known film & series posters (stable `poster_path` values on TMDb).
 */
export const DEFAULT_PROFILE_AVATAR_PRESETS: DefaultProfileAvatarPreset[] = [
  { id: "matrix", label: "The Matrix", imageUrl: S("/f89U3ADr1oiB1s9GkdpoEpTcyU8.jpg") },
  { id: "godfather", label: "The Godfather", imageUrl: S("/3bhkrj58Vtu7enYsRolD1fZdja1.jpg") },
  { id: "breaking-bad", label: "Breaking Bad", imageUrl: S("/ztkUQFL1C19ccjR6Qs2clEWEGtu.jpg") },
  { id: "inception", label: "Inception", imageUrl: S("/lXhgCODAbBXL5bU9R02h4g51nXk.jpg") },
  { id: "parasite", label: "Parasite", imageUrl: S("/7IiTTgIURZm5SExPGruxkVDuuWG.jpg") },
  { id: "pulp", label: "Pulp Fiction", imageUrl: S("/d5iElFn0GSTb4z0JoUpi0WVvm1E.jpg") },
  { id: "stranger", label: "Stranger Things", imageUrl: S("/49WJfeN0moxb2IPFjnwR60OKyL.jpg") },
  { id: "spirited", label: "Spirited Away", imageUrl: S("/39wmItIWsg5sZmyRUHLkWBcuVCM.jpg") },
  { id: "dune", label: "Dune", imageUrl: S("/d5NXSklXo0qyIYipV0NUlKKoCqN.jpg") },
  { id: "got", label: "Game of Thrones", imageUrl: S("/u3bZgnGQ9T01sWNhyveQz0wH0Hl.jpg") },
  { id: "interstellar", label: "Interstellar", imageUrl: S("/gEU2QniE6E77NI6lMC6xYKEVKHq.jpg") },
  { id: "office", label: "The Office (US)", imageUrl: S("/daUsM9B0J1qPCLzGVrU59zD9A2e.jpg") },
];
