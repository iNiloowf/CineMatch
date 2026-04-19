import type { Achievement, AppData, Movie } from "@/lib/types";

export type AchievementMetrics = {
  acceptedCount: number;
  swipeCount: number;
  watchedSharedCount: number;
  acceptedLinksCount: number;
  mutualPickCount: number;
  hasProSubscription: number;
};

export function getAchievementMetrics(data: AppData, userId: string): AchievementMetrics {
  const acceptedCount = data.swipes.filter(
    (swipe) => swipe.userId === userId && swipe.decision === "accepted",
  ).length;
  const swipeCount = data.swipes.filter((swipe) => swipe.userId === userId).length;

  const links = data.links.filter(
    (link) => link.status === "accepted" && link.users.includes(userId),
  );
  const acceptedLinksCount = links.length;

  let watchedSharedCount = 0;
  for (const link of links) {
    watchedSharedCount += data.sharedWatch.filter(
      (entry) => entry.pairKey === link.id && entry.watched,
    ).length;
  }

  const userAccepts = new Set(
    data.swipes
      .filter((swipe) => swipe.userId === userId && swipe.decision === "accepted")
      .map((swipe) => swipe.movieId),
  );

  const partnerIds = links
    .map((link) => link.users.find((id) => id !== userId))
    .filter((id): id is string => Boolean(id));

  const mutualPickIds = new Set<string>();
  for (const partnerId of partnerIds) {
    const partnerAccepts = new Set(
      data.swipes
        .filter(
          (swipe) => swipe.userId === partnerId && swipe.decision === "accepted",
        )
        .map((swipe) => swipe.movieId),
    );
    userAccepts.forEach((movieId) => {
      if (partnerAccepts.has(movieId)) {
        mutualPickIds.add(movieId);
      }
    });
  }

  return {
    acceptedCount,
    swipeCount,
    watchedSharedCount,
    acceptedLinksCount,
    mutualPickCount: mutualPickIds.size,
    hasProSubscription:
      data.settings[userId]?.subscriptionTier === "pro" ||
      data.settings[userId]?.adminModeSimulatePro
        ? 1
        : 0,
  };
}

type AchievementKind = "accepts" | "swipes" | "watched" | "links" | "mutuals" | "pro";

type AchievementTemplate = {
  id: string;
  title: string;
  description: string;
  target: number;
  requiresIds?: string[];
  kind: AchievementKind;
};

/** Order matters: prerequisites must appear before dependents. */
const ACHIEVEMENT_TEMPLATES: AchievementTemplate[] = [
  {
    id: "first-pick",
    title: "First Pick",
    description: "Accept your first movie.",
    target: 1,
    kind: "accepts",
  },
  {
    id: "movie-collector",
    title: "Movie Collector",
    description: "Save 10 movies to your picks.",
    target: 10,
    kind: "accepts",
  },
  {
    id: "watch-party",
    title: "Watch Party",
    description: "Watch 5 shared movies together.",
    target: 5,
    kind: "watched",
  },
  {
    id: "connected",
    title: "Connected Circle",
    description: "Link with 3 people.",
    target: 3,
    kind: "links",
  },
  {
    id: "explorer",
    title: "Movie Explorer",
    description: "Swipe through 20 movies.",
    target: 20,
    kind: "swipes",
  },
  {
    id: "vault-25",
    title: "Deep Shelf",
    description: "Save 25 movies after filling your first shelf.",
    target: 25,
    requiresIds: ["movie-collector"],
    kind: "accepts",
  },
  {
    id: "watch-12",
    title: "Couch Crew",
    description: "Mark 12 shared watches complete after your first watch streak.",
    target: 12,
    requiresIds: ["watch-party"],
    kind: "watched",
  },
  {
    id: "swipe-60",
    title: "Discover Regular",
    description: "Swipe 60 cards after completing Explorer.",
    target: 60,
    requiresIds: ["explorer"],
    kind: "swipes",
  },
  {
    id: "mutual-12",
    title: "Same wavelength",
    description: "12 movies you and a linked friend both saved.",
    target: 12,
    requiresIds: ["connected"],
    kind: "mutuals",
  },
  {
    id: "pro-member",
    title: "Pro Member",
    description: "Unlock Pro by starting a subscription.",
    target: 1,
    kind: "pro",
  },
];

function rawMetric(template: AchievementTemplate, metrics: AchievementMetrics): number {
  switch (template.kind) {
    case "accepts":
      return metrics.acceptedCount;
    case "swipes":
      return metrics.swipeCount;
    case "watched":
      return metrics.watchedSharedCount;
    case "links":
      return metrics.acceptedLinksCount;
    case "mutuals":
      return metrics.mutualPickCount;
    case "pro":
      return metrics.hasProSubscription;
    default:
      return 0;
  }
}

function prerequisiteTitles(requiresIds: string[] | undefined): string {
  if (!requiresIds?.length) {
    return "";
  }

  return requiresIds
    .map((id) => ACHIEVEMENT_TEMPLATES.find((entry) => entry.id === id)?.title)
    .filter(Boolean)
    .join(", ");
}

function buildDetailExplanation(
  template: AchievementTemplate,
  metrics: AchievementMetrics,
  isLocked: boolean,
  completed: boolean,
): string {
  if (isLocked) {
    const names = prerequisiteTitles(template.requiresIds);
    return names
      ? `This goal unlocks after you complete: ${names}.`
      : template.description;
  }

  if (completed) {
    switch (template.id) {
      case "first-pick":
        return "You saved at least one movie from Discover to your picks.";
      case "movie-collector":
        return "You reached 10 saved picks — your shelf is getting serious.";
      case "watch-party":
        return "You marked 5 shared titles as watched with a linked friend.";
      case "connected":
        return "You have three active friend links.";
      case "explorer":
        return "You swiped on 20 Discover cards (any direction counts).";
      case "vault-25":
        return "After Movie Collector, you kept saving until you hit 25 picks.";
      case "watch-12":
        return "After Watch Party, you finished 12 shared watches together.";
      case "swipe-60":
        return "After Explorer, you kept browsing until 60 swipes.";
      case "mutual-12":
        return "With active links, you and friends overlapped on 12+ titles.";
      case "pro-member":
        return "You activated Pro and unlocked premium account features.";
      default:
        return template.description;
    }
  }

  const v = rawMetric(template, metrics);
  switch (template.kind) {
    case "accepts":
      return `You have ${v} saved pick${v === 1 ? "" : "s"}; reach ${template.target} to unlock.`;
    case "swipes":
      return `You have ${v} swipes; reach ${template.target} in Discover.`;
    case "watched":
      return `You completed ${v} shared watches; reach ${template.target} on Shared.`;
    case "links":
      return `You have ${v} active friend link${v === 1 ? "" : "s"}; reach ${template.target}.`;
    case "mutuals":
      return `You share ${v} mutual saved title${v === 1 ? "" : "s"} with friends; reach ${template.target}.`;
    case "pro":
      return v >= 1
        ? "Pro is active on your account."
        : "Activate Pro in Settings > Subscription to unlock this badge.";
    default:
      return template.description;
  }
}

export function computeAchievements(data: AppData, userId: string): Achievement[] {
  const metrics = getAchievementMetrics(data, userId);
  const completedById = new Map<string, boolean>();

  return ACHIEVEMENT_TEMPLATES.map((template) => {
    const raw = rawMetric(template, metrics);
    const prereqsMet =
      !template.requiresIds?.length ||
      template.requiresIds.every((reqId) => completedById.get(reqId));

    const capped = Math.min(raw, template.target);
    const progress = prereqsMet ? capped : 0;
    const completed = prereqsMet && progress >= template.target;
    completedById.set(template.id, completed);

    const isLocked = !prereqsMet;

    return {
      id: template.id,
      title: template.title,
      description: template.description,
      progress,
      target: template.target,
      isLocked,
      detailExplanation: buildDetailExplanation(template, metrics, isLocked, completed),
    };
  });
}

export function getSavedMoviesForUser(data: AppData, userId: string): Movie[] {
  const acceptedIds = new Set(
    data.swipes
      .filter((swipe) => swipe.userId === userId && swipe.decision === "accepted")
      .map((swipe) => swipe.movieId),
  );

  return data.movies.filter((movie) => acceptedIds.has(movie.id));
}
