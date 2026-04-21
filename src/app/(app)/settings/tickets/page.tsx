"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { SurfaceCard } from "@/components/surface-card";
import { AppRouteEmptyCard } from "@/components/app-route-status";
import type { ConversationEntry } from "@/lib/support-ticket-conversation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAppState } from "@/lib/app-state";
import { useEscapeToClose } from "@/lib/use-escape-to-close";

type UserTicket = {
  id: string;
  subject: string;
  message: string;
  priority: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  adminReply: string | null;
  adminRepliedAt: string | null;
  conversation: ConversationEntry[];
};

const statusLabel: Record<string, string> = {
  open: "Open",
  in_progress: "In progress",
  under_review: "Under review",
  closed: "Closed",
};

function followUpsForDisplay(ticket: UserTicket): ConversationEntry[] {
  if (ticket.conversation.length > 0) {
    return ticket.conversation;
  }
  if (ticket.adminReply) {
    return [
      {
        from: "admin",
        body: ticket.adminReply,
        at: ticket.adminRepliedAt ?? ticket.createdAt,
      },
    ];
  }
  return [];
}

export default function MyTicketsPage() {
  const { isDarkMode, isReady } = useAppState();
  const [tickets, setTickets] = useState<UserTicket[]>([]);
  const [unavailable, setUnavailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<UserTicket | null>(null);
  const [followUpDraft, setFollowUpDraft] = useState("");
  const [followUpBusy, setFollowUpBusy] = useState(false);
  const [followUpFeedback, setFollowUpFeedback] = useState<string | null>(null);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = getSupabaseBrowserClient();
    const sessionResult = supabase
      ? await supabase.auth.getSession()
      : { data: { session: null } };
    const accessToken = sessionResult.data.session?.access_token ?? null;
    if (!accessToken) {
      setLoading(false);
      setError("Please sign in to view your tickets.");
      return;
    }

    try {
      const response = await fetch("/api/tickets", {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        tickets?: UserTicket[];
        ticketsUnavailable?: boolean;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not load tickets.");
      }
      setTickets(payload.tickets ?? []);
      setUnavailable(Boolean(payload.ticketsUnavailable));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load tickets.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isReady) {
      void loadTickets();
    }
  }, [isReady, loadTickets]);

  useEffect(() => {
    setFollowUpDraft("");
    setFollowUpFeedback(null);
  }, [selected?.id]);

  useEscapeToClose(Boolean(selected), () => setSelected(null));

  const sendFollowUp = useCallback(async () => {
    if (!selected) {
      return;
    }
    const text = followUpDraft.trim();
    if (!text) {
      setFollowUpFeedback("Write a message first.");
      return;
    }

    const supabase = getSupabaseBrowserClient();
    const sessionResult = supabase
      ? await supabase.auth.getSession()
      : { data: { session: null } };
    const accessToken = sessionResult.data.session?.access_token ?? null;
    if (!accessToken) {
      setFollowUpFeedback("Please sign in again.");
      return;
    }

    setFollowUpBusy(true);
    setFollowUpFeedback(null);

    try {
      const response = await fetch(`/api/tickets/${selected.id}/reply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ message: text }),
      });
      const payload = (await response.json()) as {
        error?: string;
        conversation?: ConversationEntry[];
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not send your message.");
      }

      const nextConversation = payload.conversation ?? [];
      const updated: UserTicket = {
        ...selected,
        conversation: nextConversation,
      };
      setSelected(updated);
      setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setFollowUpDraft("");
      setFollowUpFeedback("Message sent.");
    } catch (e) {
      setFollowUpFeedback(e instanceof Error ? e.message : "Could not send.");
    } finally {
      setFollowUpBusy(false);
    }
  }, [followUpDraft, selected]);

  const eyebrow = isDarkMode
    ? "text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-300/90"
    : "text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-600/90";

  if (!isReady) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-4">
        <div
          className={`h-10 w-10 animate-spin rounded-full border-2 border-t-transparent ${
            isDarkMode ? "border-white/20 border-t-violet-300" : "border-slate-200 border-t-violet-600"
          }`}
          aria-hidden
        />
        <p className={`text-sm font-medium ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
          Loading…
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-4">
      <div className="flex items-center gap-2">
        <Link
          href="/settings"
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition hover:brightness-110 ${
            isDarkMode
              ? "bg-white/10 text-slate-100 hover:bg-white/14"
              : "bg-white text-slate-800 shadow-sm ring-1 ring-slate-200/90"
          }`}
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Settings
        </Link>
      </div>

      <PageHeader
        eyebrow="Support"
        title="My tickets"
        description="Full thread with the team. After an admin replies, you can send follow-ups here unless the ticket is closed."
      />

      {loading ? (
        <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>Loading your tickets…</p>
      ) : error ? (
        <SurfaceCard className="space-y-3 px-5 py-4">
          <p className={`text-sm ${isDarkMode ? "text-rose-200" : "text-rose-700"}`}>{error}</p>
          <button type="button" onClick={() => void loadTickets()} className="ui-btn ui-btn-secondary text-sm">
            Try again
          </button>
        </SurfaceCard>
      ) : unavailable ? (
        <AppRouteEmptyCard
          title="Tickets not available yet"
          description="The support database is not set up on this server. Ask an admin to run migrations."
          isDarkMode={isDarkMode}
          primaryAction={{ label: "Back to Settings", href: "/settings" }}
        />
      ) : tickets.length === 0 ? (
        <AppRouteEmptyCard
          title="No tickets yet"
          description="Open Settings → Account actions → Contact admin to send your first message."
          isDarkMode={isDarkMode}
          primaryAction={{ label: "New ticket", href: "/settings" }}
        />
      ) : (
        <ul className="space-y-3">
          {tickets.map((ticket) => {
            const hasReply =
              followUpsForDisplay(ticket).some((e) => e.from === "admin") || Boolean(ticket.adminReply);
            return (
              <li key={ticket.id}>
                <button
                  type="button"
                  onClick={() => setSelected(ticket)}
                  className={`w-full rounded-[22px] border px-4 py-4 text-left transition hover:brightness-[1.02] active:scale-[0.99] ${
                    isDarkMode
                      ? "border-white/12 bg-white/[0.05] hover:border-violet-400/25"
                      : "border-slate-200/90 bg-white shadow-sm hover:border-violet-200"
                  }`}
                >
                  <p className={eyebrow}>Ticket</p>
                  <p className={`mt-1 font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                    {ticket.subject}
                  </p>
                  <p className={`mt-1 text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                    {new Date(ticket.createdAt).toLocaleString()} · {statusLabel[ticket.status] ?? ticket.status}
                    {hasReply ? " · Has replies" : ""}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {selected ? (
        <div className="ui-overlay z-[var(--z-modal-backdrop)] bg-slate-950/50 backdrop-blur-md">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 cursor-default bg-transparent"
            onClick={() => setSelected(null)}
          />
          <div
            className={`ui-popup-motion relative z-10 mx-auto flex max-h-[min(92dvh,40rem)] w-[min(94vw,26rem)] flex-col overflow-hidden rounded-[28px] border shadow-[0_24px_70px_rgba(15,23,42,0.22)] ${
              isDarkMode ? "border-white/12 bg-slate-950 text-slate-100" : "border-slate-200/90 bg-white text-slate-900"
            }`}
          >
            <span className="ui-modal-accent-bar" aria-hidden />
            <div className={`flex shrink-0 items-start justify-between gap-3 border-b px-5 py-4 ${isDarkMode ? "border-white/10" : "border-slate-200/80"}`}>
              <div className="min-w-0">
                <p className={eyebrow}>Ticket</p>
                <h2 className="mt-1 text-lg font-bold leading-tight">{selected.subject}</h2>
                <p className={`mt-1 text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                  {statusLabel[selected.status] ?? selected.status}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className={`ui-shell-close shrink-0 ${isDarkMode ? "bg-white/10 text-slate-200" : "bg-slate-100 text-slate-600"}`}
                aria-label="Close"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="ui-icon-md ui-icon-stroke" aria-hidden>
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
              <div
                className={`rounded-[16px] border p-3 text-sm leading-relaxed ${
                  isDarkMode ? "border-slate-500/25 bg-slate-900/40 text-slate-100" : "border-slate-200 bg-slate-50 text-slate-800"
                }`}
              >
                <p className={`text-[10px] font-semibold uppercase tracking-wide ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                  You
                </p>
                <p className="mt-1 whitespace-pre-wrap">{selected.message}</p>
                <p className={`mt-2 text-[11px] ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}>
                  {new Date(selected.createdAt).toLocaleString()}
                </p>
              </div>

              {followUpsForDisplay(selected).map((entry, index) => (
                <div
                  key={`${entry.at}-${index}`}
                  className={`rounded-[16px] border p-3 text-sm leading-relaxed ${
                    entry.from === "admin"
                      ? isDarkMode
                        ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-50"
                        : "border-emerald-200/90 bg-emerald-50 text-emerald-900"
                      : isDarkMode
                        ? "border-slate-500/25 bg-slate-900/40 text-slate-100"
                        : "border-slate-200 bg-slate-50 text-slate-800"
                  }`}
                >
                  <p className={`text-[10px] font-semibold uppercase tracking-wide ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                    {entry.from === "admin" ? "Support" : "You"}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap">{entry.body}</p>
                  <p className={`mt-2 text-[11px] ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}>
                    {new Date(entry.at).toLocaleString()}
                  </p>
                </div>
              ))}

              {followUpsForDisplay(selected).length === 0 ? (
                <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                  No reply yet. When support responds, the thread appears here.
                </p>
              ) : null}
            </div>

            {selected.status !== "closed" ? (
              <div className={`shrink-0 border-t px-5 py-4 ${isDarkMode ? "border-white/10" : "border-slate-200/80"}`}>
                <label htmlFor="ticket-follow-up" className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${eyebrow}`}>
                  Your reply
                </label>
                <textarea
                  id="ticket-follow-up"
                  value={followUpDraft}
                  onChange={(e) => setFollowUpDraft(e.target.value)}
                  rows={4}
                  disabled={followUpBusy}
                  placeholder="Add a follow-up message…"
                  className={`mt-2 w-full resize-y rounded-[16px] border px-3 py-2.5 text-sm leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 disabled:opacity-60 ${
                    isDarkMode
                      ? "border-white/14 bg-white/[0.06] text-slate-100 placeholder:text-slate-500"
                      : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
                  }`}
                />
                <button
                  type="button"
                  disabled={followUpBusy}
                  onClick={() => void sendFollowUp()}
                  className="ui-btn ui-btn-primary mt-3 w-full disabled:opacity-60"
                >
                  {followUpBusy ? "Sending…" : "Send follow-up"}
                </button>
                {followUpFeedback ? (
                  <p
                    className={`mt-2 text-center text-xs ${
                      followUpFeedback.includes("sent") || followUpFeedback.includes("Sent")
                        ? isDarkMode
                          ? "text-emerald-300"
                          : "text-emerald-700"
                        : isDarkMode
                          ? "text-rose-300"
                          : "text-rose-700"
                    }`}
                  >
                    {followUpFeedback}
                  </p>
                ) : null}
              </div>
            ) : (
              <div className={`shrink-0 border-t px-5 py-3 ${isDarkMode ? "border-white/10" : "border-slate-200/80"}`}>
                <p className={`text-center text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                  This ticket is closed. Open a new one from Settings if you need more help.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
