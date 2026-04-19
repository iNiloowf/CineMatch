import { AppData } from "@/lib/types";

export const defaultSettings = {
  darkMode: false,
  notifications: true,
  autoplayTrailers: false,
  hideSpoilers: true,
  cellularSync: true,
  reduceMotion: false,
  subscriptionTier: "free" as const,
  adminModeSimulatePro: false,
};

export const initialAppData: AppData = {
  users: [
    {
      id: "user-admin",
      name: "Admin",
      email: "admin@cinematch.app",
      password: "admin123",
      avatar: "AD",
      bio: "Default admin account for reviewing matches and keeping the watchlists tidy.",
      city: "Denver, CO",
    },
    {
      id: "user-alex",
      name: "Alex Rivera",
      email: "alex@cinematch.app",
      password: "password123",
      avatar: "AR",
      bio: "Action, auteur comedies, and anything with a midnight vibe.",
      city: "Austin, TX",
    },
    {
      id: "user-jordan",
      name: "Jordan Lee",
      email: "jordan@cinematch.app",
      password: "password123",
      avatar: "JL",
      bio: "Collector of comfort movies and beautifully shot dramas.",
      city: "Portland, OR",
    },
  ],
  movies: [],
  swipes: [],
  links: [],
  sharedWatch: [],
  sharedHiddenMovies: [],
  watchedPickReviews: [],
  invites: [],
  settings: {
    "user-admin": { ...defaultSettings },
    "user-alex": {
      darkMode: true,
      notifications: true,
      autoplayTrailers: true,
      hideSpoilers: false,
      cellularSync: true,
      reduceMotion: false,
      subscriptionTier: "free",
      adminModeSimulatePro: false,
    },
    "user-jordan": {
      darkMode: false,
      notifications: false,
      autoplayTrailers: false,
      hideSpoilers: true,
      cellularSync: false,
      reduceMotion: true,
      subscriptionTier: "free",
      adminModeSimulatePro: false,
    },
  },
};
