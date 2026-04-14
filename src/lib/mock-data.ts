import { AppData } from "@/lib/types";

export const defaultSettings = {
  darkMode: false,
  notifications: true,
  autoplayTrailers: false,
  hideSpoilers: true,
  cellularSync: true,
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
  links: [
    {
      id: "link-admin-alex",
      users: ["user-admin", "user-alex"],
      status: "accepted",
      createdAt: "2026-04-09T19:00:00.000Z",
    },
    {
      id: "link-admin-jordan",
      users: ["user-admin", "user-jordan"],
      status: "pending",
      createdAt: "2026-04-11T11:30:00.000Z",
    },
  ],
  sharedWatch: [],
  invites: [
    {
      id: "invite-admin-1",
      inviterId: "user-admin",
      token: "invite-admin-main",
      createdAt: "2026-04-10T12:00:00.000Z",
      usedAt: null,
    },
  ],
  settings: {
    "user-admin": { ...defaultSettings },
    "user-alex": { darkMode: true, notifications: true, autoplayTrailers: true, hideSpoilers: false, cellularSync: true },
    "user-jordan": { darkMode: false, notifications: false, autoplayTrailers: false, hideSpoilers: true, cellularSync: false },
  },
};
