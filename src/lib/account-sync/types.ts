import type { ProProfileStyle } from "@/lib/types";
import type { SwipeDecision } from "@/lib/types";

export type ProfileRow = {
  id: string;
  email: string;
  full_name: string;
  avatar_text: string;
  avatar_image_url?: string | null;
  bio: string;
  city: string;
  profile_style?: ProProfileStyle | null;
  favorite_movie_id?: string | null;
  favorite_movie_title?: string | null;
  favorite_movie_year?: number | null;
  favorite_movie_poster_url?: string | null;
  favorite_movie_media_type?: "movie" | "series" | null;
};

export type SettingsRow = {
  user_id: string;
  dark_mode: boolean;
  notifications: boolean;
  autoplay_trailers: boolean;
  hide_spoilers: boolean;
  cellular_sync: boolean;
  reduce_motion?: boolean | null;
  subscription_tier?: "free" | "pro" | null;
  admin_mode_simulate_pro?: boolean | null;
};

export type SwipeRow = {
  user_id: string;
  movie_id: string;
  decision: SwipeDecision;
  created_at: string;
};

export type LinkRow = {
  id: string;
  requester_id: string;
  target_id: string;
  status: "accepted" | "pending";
  created_at: string;
};

export type InviteRow = {
  id: string;
  inviter_id: string;
  token: string;
  created_at: string;
  used_at: string | null;
  link_code: string | null;
};

export type SharedWatchRow = {
  id: string;
  linked_user_id: string;
  movie_id: string;
  watched: boolean;
  updated_at: string;
};

export type MovieRow = {
  id: string;
  title: string;
  release_year: number;
  runtime: string;
  rating: number;
  genres: string[];
  description: string;
  poster_eyebrow: string;
  poster_image_url?: string | null;
  accent_from: string;
  accent_to: string;
  trailer_url?: string | null;
};

export type AccountSyncPayload = {
  profile: ProfileRow | null;
  settings: SettingsRow | null;
  links: LinkRow[];
  invites: InviteRow[];
  partnerProfiles: ProfileRow[];
  swipes: SwipeRow[];
  sharedWatch: SharedWatchRow[];
  movies: MovieRow[];
};

export const DEFAULT_SETTINGS_ROW_BASE = {
  dark_mode: false,
  notifications: true,
  autoplay_trailers: false,
  hide_spoilers: true,
  cellular_sync: true,
} as const;
