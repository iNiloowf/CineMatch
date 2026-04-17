import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, clientIp } from "@/server/rate-limit";
import { requireServerAdmin } from "@/server/admin-auth";
import { logSecurityAudit } from "@/server/security-audit";

type ProfileRow = {
  id: string;
  full_name: string;
  email: string;
  city: string;
};

type SwipeRow = {
  user_id: string;
  movie_id: string;
  decision: "accepted" | "rejected";
  created_at: string;
};

type LinkRow = {
  requester_id: string;
  target_id: string;
  status: "accepted" | "pending";
};

type MovieRow = {
  id: string;
  title: string;
};

type TicketRow = {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  priority: "low" | "normal" | "high";
  status: "open" | "in_progress" | "under_review" | "closed";
  created_at: string;
};

type SupabaseErrorLike = {
  message?: string;
  code?: string;
} | null;

const ADMIN_WINDOW_MS = 5 * 60 * 1000;
const ADMIN_MAX = 120;

function isMissingSupportTicketsError(error: SupabaseErrorLike) {
  if (!error) {
    return false;
  }

  const normalized = (error.message ?? "").toLowerCase();
  return (
    error.code === "PGRST204" ||
    (normalized.includes("support_tickets") &&
      normalized.includes("schema cache"))
  );
}

export async function POST(request: NextRequest) {
  const adminRate = checkRateLimit({
    key: `admin:dashboard:${clientIp(request)}`,
    max: ADMIN_MAX,
    windowMs: ADMIN_WINDOW_MS,
  });

  if (!adminRate.ok) {
    return NextResponse.json(
      { error: "Too many admin requests. Try again shortly." },
      {
        status: 429,
        headers: { "Retry-After": String(adminRate.retryAfterSec) },
      },
    );
  }

  const adminAuth = await requireServerAdmin(request);
  if (!adminAuth.ok) {
    return adminAuth.response;
  }
  const { supabaseAdmin, identity } = adminAuth;

  const [
    usersCountResult,
    moviesCountResult,
    swipesCountResult,
    acceptedSwipesCountResult,
    rejectedSwipesCountResult,
    acceptedLinksCountResult,
    pendingLinksCountResult,
    watchedEntriesCountResult,
    profilesResult,
    swipesResult,
    linksResult,
    recentSwipesResult,
  ] = await Promise.all([
    supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("movies").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("swipes").select("user_id", { count: "exact", head: true }),
    supabaseAdmin
      .from("swipes")
      .select("user_id", { count: "exact", head: true })
      .eq("decision", "accepted"),
    supabaseAdmin
      .from("swipes")
      .select("user_id", { count: "exact", head: true })
      .eq("decision", "rejected"),
    supabaseAdmin
      .from("linked_users")
      .select("requester_id", { count: "exact", head: true })
      .eq("status", "accepted"),
    supabaseAdmin
      .from("linked_users")
      .select("requester_id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabaseAdmin
      .from("shared_watchlist")
      .select("id", { count: "exact", head: true })
      .eq("watched", true),
    supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, city")
      .order("created_at", { ascending: true }),
    supabaseAdmin.from("swipes").select("user_id, decision"),
    supabaseAdmin.from("linked_users").select("requester_id, target_id, status"),
    supabaseAdmin
      .from("swipes")
      .select("user_id, movie_id, decision, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const firstError =
    usersCountResult.error ??
    moviesCountResult.error ??
    swipesCountResult.error ??
    acceptedSwipesCountResult.error ??
    rejectedSwipesCountResult.error ??
    acceptedLinksCountResult.error ??
    pendingLinksCountResult.error ??
    watchedEntriesCountResult.error ??
    profilesResult.error ??
    swipesResult.error ??
    linksResult.error ??
    recentSwipesResult.error;

  if (firstError) {
    return NextResponse.json({ error: firstError.message }, { status: 500 });
  }

  const profiles = (profilesResult.data ?? []) as ProfileRow[];
  const swipes = (swipesResult.data ?? []) as Pick<SwipeRow, "user_id" | "decision">[];
  const links = (linksResult.data ?? []) as LinkRow[];
  const recentSwipes = (recentSwipesResult.data ?? []) as SwipeRow[];
  let recentTickets: TicketRow[] = [];
  let openTicketsCount = 0;
  let ticketsUnavailable = false;

  const [openTicketsCountResult, recentTicketsResult] = await Promise.all([
    supabaseAdmin
      .from("support_tickets")
      .select("id", { count: "exact", head: true })
      .eq("status", "open"),
    supabaseAdmin
      .from("support_tickets")
      .select("id, user_id, subject, message, priority, status, created_at")
      .order("created_at", { ascending: false })
      .limit(40),
  ]);

  const ticketsError =
    (openTicketsCountResult.error as SupabaseErrorLike) ??
    (recentTicketsResult.error as SupabaseErrorLike);

  if (ticketsError) {
    if (isMissingSupportTicketsError(ticketsError)) {
      ticketsUnavailable = true;
    } else {
      return NextResponse.json({ error: ticketsError.message }, { status: 500 });
    }
  } else {
    openTicketsCount = openTicketsCountResult.count ?? 0;
    recentTickets = (recentTicketsResult.data ?? []) as TicketRow[];
  }

  const movieIds = Array.from(new Set(recentSwipes.map((swipe) => swipe.movie_id)));
  const movieTitlesResult =
    movieIds.length > 0
      ? await supabaseAdmin.from("movies").select("id, title").in("id", movieIds)
      : { data: [] as MovieRow[], error: null };

  if (movieTitlesResult.error) {
    return NextResponse.json(
      { error: movieTitlesResult.error.message },
      { status: 500 },
    );
  }

  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const movieById = new Map(
    (((movieTitlesResult.data ?? []) as MovieRow[]) ?? []).map((movie) => [
      movie.id,
      movie,
    ]),
  );

  const userRows = profiles.map((profile) => {
    const accepted = swipes.filter(
      (swipe) => swipe.user_id === profile.id && swipe.decision === "accepted",
    ).length;
    const rejected = swipes.filter(
      (swipe) => swipe.user_id === profile.id && swipe.decision === "rejected",
    ).length;
    const totalLinks = links.filter(
      (link) =>
        link.requester_id === profile.id || link.target_id === profile.id,
    ).length;

    return {
      id: profile.id,
      name: profile.full_name,
      email: profile.email,
      city: profile.city,
      accepted,
      rejected,
      links: totalLinks,
    };
  });

  void logSecurityAudit({
    action: "admin_dashboard_view",
    ip: clientIp(request),
    metadata: {
      actor: identity.email ?? identity.userId,
      users: profiles.length,
      openTickets: openTicketsCount,
      ticketsUnavailable,
    },
  });

  return NextResponse.json({
    stats: {
      users: usersCountResult.count ?? 0,
      movies: moviesCountResult.count ?? 0,
      swipes: swipesCountResult.count ?? 0,
      acceptedSwipes: acceptedSwipesCountResult.count ?? 0,
      rejectedSwipes: rejectedSwipesCountResult.count ?? 0,
      acceptedLinks: acceptedLinksCountResult.count ?? 0,
      pendingLinks: pendingLinksCountResult.count ?? 0,
      watchedEntries: watchedEntriesCountResult.count ?? 0,
      openTickets: openTicketsCount,
    },
    ticketsUnavailable,
    userRows,
    recentSwipes: recentSwipes.map((swipe) => ({
      userId: swipe.user_id,
      userName: profileById.get(swipe.user_id)?.full_name ?? swipe.user_id,
      movieId: swipe.movie_id,
      movieTitle: movieById.get(swipe.movie_id)?.title ?? swipe.movie_id,
      decision: swipe.decision,
      createdAt: swipe.created_at,
    })),
    tickets: recentTickets.map((ticket) => ({
      id: ticket.id,
      userId: ticket.user_id,
      userName: profileById.get(ticket.user_id)?.full_name ?? ticket.user_id,
      userEmail: profileById.get(ticket.user_id)?.email ?? "",
      subject: ticket.subject,
      message: ticket.message,
      priority: ticket.priority,
      status: ticket.status,
      createdAt: ticket.created_at,
    })),
  });
}
