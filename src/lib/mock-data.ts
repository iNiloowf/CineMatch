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
  movies: [
    {
      id: "movie-dune-two",
      title: "Dune: Part Two",
      year: 2024,
      runtime: "2h 46m",
      rating: 8.7,
      genre: ["Sci-Fi", "Adventure"],
      description:
        "Paul Atreides unites with Chani and the Fremen while destiny, revenge, and prophecy collide across Arrakis.",
      poster: {
        eyebrow: "Epic",
        accentFrom: "#4a245f",
        accentTo: "#c595ff",
      },
    },
    {
      id: "movie-past-lives",
      title: "Past Lives",
      year: 2023,
      runtime: "1h 46m",
      rating: 8.1,
      genre: ["Romance", "Drama"],
      description:
        "Two childhood friends reconnect years later and confront what time, distance, and love have shaped between them.",
      poster: {
        eyebrow: "Tender",
        accentFrom: "#7c3aed",
        accentTo: "#f9c4ff",
      },
    },
    {
      id: "movie-spiderverse",
      title: "Across the Spider-Verse",
      year: 2023,
      runtime: "2h 20m",
      rating: 8.5,
      genre: ["Animation", "Action"],
      description:
        "Miles Morales leaps through the multiverse, meeting new Spider-heroes while struggling to protect his own future.",
      poster: {
        eyebrow: "Vibrant",
        accentFrom: "#5b21b6",
        accentTo: "#60a5fa",
      },
    },
    {
      id: "movie-holdovers",
      title: "The Holdovers",
      year: 2023,
      runtime: "2h 13m",
      rating: 8,
      genre: ["Comedy", "Drama"],
      description:
        "A cranky teacher, a grieving cook, and a stranded student form an unexpected bond over a snowed-in holiday break.",
      poster: {
        eyebrow: "Warm",
        accentFrom: "#8b5cf6",
        accentTo: "#fde68a",
      },
    },
    {
      id: "movie-challengers",
      title: "Challengers",
      year: 2024,
      runtime: "2h 11m",
      rating: 7.8,
      genre: ["Drama", "Sports"],
      description:
        "A fiery triangle of ambition, rivalry, and desire plays out on and off the tennis court.",
      poster: {
        eyebrow: "Charged",
        accentFrom: "#6d28d9",
        accentTo: "#fca5a5",
      },
    },
    {
      id: "movie-poor-things",
      title: "Poor Things",
      year: 2023,
      runtime: "2h 21m",
      rating: 8.3,
      genre: ["Fantasy", "Comedy"],
      description:
        "Bella Baxter embarks on a dazzlingly strange journey of self-discovery through surreal cities and new freedoms.",
      poster: {
        eyebrow: "Bold",
        accentFrom: "#9333ea",
        accentTo: "#93c5fd",
      },
    },
    {
      id: "movie-arrival",
      title: "Arrival",
      year: 2016,
      runtime: "1h 56m",
      rating: 8.2,
      genre: ["Sci-Fi", "Drama"],
      description:
        "A linguist is recruited to communicate with mysterious visitors whose language changes humanity's sense of time.",
      poster: {
        eyebrow: "Smart",
        accentFrom: "#4c1d95",
        accentTo: "#d8b4fe",
      },
    },
    {
      id: "movie-portrait",
      title: "Portrait of a Lady on Fire",
      year: 2019,
      runtime: "2h 2m",
      rating: 8.1,
      genre: ["Romance", "Period"],
      description:
        "A painter and her subject fall into a luminous, secretive connection on an isolated island.",
      poster: {
        eyebrow: "Lush",
        accentFrom: "#581c87",
        accentTo: "#fbcfe8",
      },
    },
  ],
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
