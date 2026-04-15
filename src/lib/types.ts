export type Movie = {
  id: string;
  title: string;
  mediaType: "movie" | "series";
  year: number;
  runtime: string;
  rating: number;
  genre: string[];
  description: string;
  poster: {
    eyebrow: string;
    accentFrom: string;
    accentTo: string;
    imageUrl?: string;
  };
};

export type User = {
  id: string;
  name: string;
  email: string;
  avatar: string;
  avatarImageUrl?: string;
  bio: string;
  city: string;
};

export type AuthUser = User & {
  password: string;
};

export type SwipeDecision = "accepted" | "rejected";

export type SwipeRecord = {
  userId: string;
  movieId: string;
  decision: SwipeDecision;
  createdAt: string;
};

export type LinkedUser = {
  id: string;
  users: [string, string];
  status: "accepted" | "pending";
  createdAt: string;
};

export type SharedWatch = {
  id: string;
  pairKey: string;
  movieId: string;
  watched: boolean;
  progress: number;
  updatedAt: string;
};

export type SharedHiddenMovie = {
  id: string;
  pairKey: string;
  movieId: string;
  hiddenAt: string;
};

export type InviteLink = {
  id: string;
  inviterId: string;
  token: string;
  createdAt: string;
  usedAt: string | null;
};

export type ProfileSettings = {
  darkMode: boolean;
  notifications: boolean;
  autoplayTrailers: boolean;
  hideSpoilers: boolean;
  cellularSync: boolean;
};

export type AppData = {
  users: AuthUser[];
  movies: Movie[];
  swipes: SwipeRecord[];
  links: LinkedUser[];
  sharedWatch: SharedWatch[];
  sharedHiddenMovies: SharedHiddenMovie[];
  invites: InviteLink[];
  settings: Record<string, ProfileSettings>;
};

export type SharedMovieView = {
  linkId: string;
  partner: User;
  movie: Movie;
  watched: boolean;
  progress: number;
};

export type SharedMovieGroup = {
  linkId: string;
  partner: User;
  movies: SharedMovieView[];
};

export type Achievement = {
  id: string;
  title: string;
  description: string;
  progress: number;
  target: number;
};
