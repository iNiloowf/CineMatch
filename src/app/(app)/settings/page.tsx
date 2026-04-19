"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { AvatarBadge } from "@/components/avatar-badge";
import { PageHeader } from "@/components/page-header";
import { SettingToggle } from "@/components/setting-toggle";
import { SurfaceCard } from "@/components/surface-card";
import { getAchievementBadgeMeta } from "@/lib/achievement-badge-meta";
import type { Achievement } from "@/lib/types";
import { partitionAchievements } from "@/lib/achievement-utils";
import { useAppState } from "@/lib/app-state";
import { useEscapeToClose } from "@/lib/use-escape-to-close";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type SubscriptionPlanType = "pro_monthly" | "pro_yearly" | "pro_partner_gift";

function AchievementRow({
  achievement,
  isDarkMode,
}: {
  achievement: Achievement;
  isDarkMode: boolean;
}) {
  const percent = achievement.isLocked
    ? 0
    : Math.min(100, Math.round((achievement.progress / achievement.target) * 100));
  const inProgress = !achievement.isLocked && achievement.progress < achievement.target;
  const badgeMeta = getAchievementBadgeMeta(achievement.id);

  return (
    <div
      className={`rounded-[22px] border px-4 py-4 ${
        isDarkMode ? "border-white/10 bg-white/[0.04]" : "border-slate-200/80 bg-white/80"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={`relative mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br shadow-[0_6px_16px_rgba(15,23,42,0.24)] ring-1 ${
            achievement.isLocked
              ? isDarkMode
                ? "from-slate-600 to-slate-800 ring-white/12"
                : "from-slate-300 to-slate-500 ring-slate-300/90"
              : `${badgeMeta.gradient} ring-white/35`
          }`}
          aria-hidden
        >
          <span className="pointer-events-none absolute inset-x-1 top-1 h-2 rounded-full bg-white/30 blur-[1px]" />
          <span className="text-[10px] font-black uppercase tracking-tight text-white drop-shadow-sm">
            {badgeMeta.glyph}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p
            className={`text-sm font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}
          >
            {achievement.title}
            {achievement.isLocked ? (
              <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-amber-500">
                Locked
              </span>
            ) : null}
          </p>
          <p
            className={`text-xs leading-5 ${isDarkMode ? "text-slate-300" : "text-slate-500"}`}
          >
            {achievement.description}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
            achievement.isLocked
              ? isDarkMode
                ? "bg-white/8 text-slate-400"
                : "bg-slate-100 text-slate-500"
              : inProgress
                ? isDarkMode
                  ? "bg-violet-500/20 text-violet-100 ring-1 ring-violet-400/22"
                  : "bg-violet-100 text-violet-700"
                : isDarkMode
                  ? "bg-white/8 text-slate-400"
                  : "bg-slate-100 text-slate-500"
          }`}
        >
          {achievement.isLocked ? "—" : `${achievement.progress}/${achievement.target}`}
        </span>
      </div>
      {!achievement.isLocked && inProgress ? (
        <div
          className={`mt-3 h-2 overflow-hidden rounded-full ${
            isDarkMode ? "bg-white/10" : "bg-slate-200/90"
          }`}
        >
          <div className="h-full rounded-full bg-violet-600" style={{ width: `${percent}%` }} />
        </div>
      ) : null}
    </div>
  );
}

export default function SettingsPage() {
  const {
    currentUserId,
    currentUser,
    data,
    achievements,
    isDarkMode,
    logout,
    hasProAccess,
    linkedUsers,
    refreshAccountData,
    adminSubscriptionPreviewModeEnabled,
    setAdminSubscriptionPreviewMode,
    updateSettings,
  } = useAppState();
  const settings = currentUserId ? data.settings[currentUserId] : null;
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketMessage, setTicketMessage] = useState("");
  const [ticketPriority, setTicketPriority] = useState<"low" | "normal" | "high">("normal");
  const [ticketState, setTicketState] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [ticketFeedback, setTicketFeedback] = useState("");
  const [isContactAdminModalOpen, setIsContactAdminModalOpen] = useState(false);
  const [legalModal, setLegalModal] = useState<"privacy" | "terms" | null>(null);
  const [billingFeedback, setBillingFeedback] = useState("");
  const [selectedGiftPartnerId, setSelectedGiftPartnerId] = useState("none");
  const [selectedPlanType, setSelectedPlanType] = useState<SubscriptionPlanType>("pro_monthly");
  const [isOpeningCheckout, setIsOpeningCheckout] = useState(false);
  const [myActiveGiftCode, setMyActiveGiftCode] = useState<{
    code: string;
    expiresAt: string;
  } | null>(null);
  const [isLoadingGiftCode, setIsLoadingGiftCode] = useState(false);
  const [giftRedeemCode, setGiftRedeemCode] = useState("");
  const [giftRedeemState, setGiftRedeemState] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [giftRedeemFeedback, setGiftRedeemFeedback] = useState("");
  const [isGiftRedeemModalOpen, setIsGiftRedeemModalOpen] = useState(false);

  const sectionEyebrow = isDarkMode
    ? "text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-300/90"
    : "text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-600/90";

  const preferencesDivider = isDarkMode
    ? "border-t border-white/10 pt-8 mt-2"
    : "border-t border-slate-200/90 pt-8 mt-2";

  const { incomplete: achievementsInProgress } = useMemo(
    () => partitionAchievements(achievements),
    [achievements],
  );
  const acceptedConnectedPartners = useMemo(
    () =>
      linkedUsers
        .filter((entry) => entry.status === "accepted")
        .map((entry) => entry.user)
        .sort((left, right) => left.name.localeCompare(right.name)),
    [linkedUsers],
  );
  const selectedGiftPartner = useMemo(
    () =>
      selectedGiftPartnerId === "none"
        ? null
        : acceptedConnectedPartners.find((entry) => entry.id === selectedGiftPartnerId) ?? null,
    [acceptedConnectedPartners, selectedGiftPartnerId],
  );

  useEffect(() => {
    if (selectedGiftPartnerId === "none") {
      return;
    }
    const stillLinked = acceptedConnectedPartners.some(
      (partner) => partner.id === selectedGiftPartnerId,
    );
    if (!stillLinked) {
      setSelectedGiftPartnerId("none");
    }
  }, [acceptedConnectedPartners, selectedGiftPartnerId]);

  useEffect(() => {
    if (selectedPlanType !== "pro_partner_gift") {
      setSelectedGiftPartnerId("none");
    }
  }, [selectedPlanType]);

  useEscapeToClose(isContactAdminModalOpen, () => setIsContactAdminModalOpen(false));
  useEscapeToClose(Boolean(legalModal), () => setLegalModal(null));
  useEscapeToClose(isGiftRedeemModalOpen, () => setIsGiftRedeemModalOpen(false));

  const handleSubmitTicket = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const subject = ticketSubject.trim();
    const message = ticketMessage.trim();

    if (!subject || !message) {
      setTicketState("error");
      setTicketFeedback("Please fill out both subject and message.");
      return;
    }

    const supabase = getSupabaseBrowserClient();
    const sessionResult = supabase
      ? await supabase.auth.getSession()
      : { data: { session: null } };
    const accessToken = sessionResult.data.session?.access_token ?? null;

    if (!accessToken) {
      setTicketState("error");
      setTicketFeedback("Please sign in again, then submit your ticket.");
      return;
    }

    setTicketState("saving");
    setTicketFeedback("");

    try {
      const response = await fetch("/api/tickets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          subject,
          message,
          priority: ticketPriority,
        }),
      });

      const payload = (await response.json()) as { error?: string; ticketId?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Ticket could not be submitted.");
      }

      setTicketSubject("");
      setTicketMessage("");
      setTicketPriority("normal");
      setTicketState("success");
      setTicketFeedback("Ticket sent to admin successfully.");
    } catch (error) {
      setTicketState("error");
      setTicketFeedback(
        error instanceof Error ? error.message : "Ticket could not be submitted.",
      );
    }
  };

  const resolveAccessToken = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    const sessionResult = supabase
      ? await supabase.auth.getSession()
      : { data: { session: null } };
    return sessionResult.data.session?.access_token ?? null;
  }, []);

  const loadMyActiveGiftCode = useCallback(async () => {
    const accessToken = await resolveAccessToken();
    if (!accessToken) {
      return;
    }

    setIsLoadingGiftCode(true);
    try {
      const response = await fetch("/api/subscription/gift-code?activeOnly=true", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        giftCode?: { code: string; expiresAt: string } | null;
      };

      if (response.ok && payload.giftCode?.code) {
        setMyActiveGiftCode({
          code: payload.giftCode.code,
          expiresAt: payload.giftCode.expiresAt,
        });
        return;
      }

      setMyActiveGiftCode(null);
    } catch {
      setMyActiveGiftCode(null);
    } finally {
      setIsLoadingGiftCode(false);
    }
  }, [resolveAccessToken]);

  useEffect(() => {
    if (!currentUserId) {
      return;
    }
    void loadMyActiveGiftCode();
  }, [currentUserId, loadMyActiveGiftCode]);

  const handleOpenCheckout = async () => {
    if (hasProAccess) {
      setBillingFeedback("You already have Pro access on this account.");
      return;
    }

    if (
      selectedPlanType === "pro_partner_gift" &&
      (!selectedGiftPartner || selectedGiftPartnerId === "none")
    ) {
      setBillingFeedback("Pick one connected partner for the Partner Gift plan.");
      return;
    }

    const accessToken = await resolveAccessToken();

    if (!accessToken) {
      setBillingFeedback("Please sign in again, then try Pro checkout.");
      return;
    }

    setIsOpeningCheckout(true);
    setBillingFeedback("");

    try {
      const response = await fetch("/api/subscription/create-intent", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planType: selectedPlanType,
          partnerUserId:
            selectedPlanType === "pro_partner_gift"
              ? selectedGiftPartner?.id
              : undefined,
        }),
      });
      const payload = (await response.json()) as { error?: string; checkoutUrl?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Could not open checkout right now.");
      }

      if (!payload.checkoutUrl) {
        throw new Error("Checkout URL is missing.");
      }

      window.open(payload.checkoutUrl, "_blank", "noopener,noreferrer");
      setBillingFeedback(
        selectedPlanType === "pro_partner_gift"
          ? "Checkout opened. After successful payment, your one-time gift code appears here."
          : "Checkout opened. Pro activates after Stripe confirms payment.",
      );
    } catch (error) {
      setBillingFeedback(
        error instanceof Error ? error.message : "Could not open checkout right now.",
      );
    } finally {
      setIsOpeningCheckout(false);
    }
  };

  const handleRedeemGiftCode = async () => {
    const code = giftRedeemCode.trim();
    if (!code) {
      setGiftRedeemState("error");
      setGiftRedeemFeedback("Enter a gift code first.");
      return;
    }

    const accessToken = await resolveAccessToken();
    if (!accessToken) {
      setGiftRedeemState("error");
      setGiftRedeemFeedback("Please sign in again, then redeem your gift code.");
      return;
    }

    setGiftRedeemState("saving");
    setGiftRedeemFeedback("");

    try {
      const response = await fetch("/api/subscription/redeem-gift-code", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Could not redeem this code.");
      }

      setGiftRedeemState("success");
      setGiftRedeemFeedback("Pro is now active on your account.");
      setGiftRedeemCode("");
      refreshAccountData();
    } catch (error) {
      setGiftRedeemState("error");
      setGiftRedeemFeedback(
        error instanceof Error ? error.message : "Could not redeem this code.",
      );
    }
  };

  if (!settings) {
    return null;
  }

  return (
    <div className="space-y-5">
      {isContactAdminModalOpen ? (
        <div className="ui-overlay z-[var(--z-modal-backdrop)] bg-slate-950/45 backdrop-blur-md">
          <button
            type="button"
            aria-label="Close"
            onClick={() => setIsContactAdminModalOpen(false)}
            className="absolute inset-0 cursor-default bg-transparent"
          />
          <div
            className={`ui-shell ui-shell--dialog-md relative z-10 mx-auto max-w-xl overflow-hidden rounded-[28px] border shadow-[0_24px_70px_rgba(15,23,42,0.22)] ${
              isDarkMode
                ? "border-white/12 bg-slate-950 text-slate-100"
                : "border-slate-200/90 bg-white text-slate-900"
            }`}
            role="dialog"
            aria-modal="true"
            aria-label="Contact admin"
          >
            <span className="ui-modal-accent-bar" aria-hidden />
            <div className={`ui-shell-header ${isDarkMode ? "!border-b-white/10" : "!border-b-slate-100"}`}>
              <div className="min-w-0 flex-1">
                <p className="text-lg font-semibold text-inherit">Contact admin</p>
                {currentUser ? (
                  <p className={`mt-1 truncate text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                    Sending as {currentUser.name} ({currentUser.email})
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setIsContactAdminModalOpen(false)}
                aria-label="Close"
                className={`ui-shell-close ${
                  isDarkMode ? "bg-white/10 text-slate-200" : "bg-slate-100 text-slate-600"
                }`}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  className="ui-icon-md ui-icon-stroke"
                  aria-hidden
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>
            <form className="ui-shell-body space-y-3 !pt-4" onSubmit={handleSubmitTicket}>
              <label className="block space-y-2 text-sm font-semibold">
                Subject
                <input
                  value={ticketSubject}
                  onChange={(event) => setTicketSubject(event.target.value)}
                  maxLength={120}
                  placeholder="Example: Discover page is not loading"
                  className={`w-full rounded-[14px] border px-3 py-2.5 text-sm outline-none ${
                    isDarkMode
                      ? "border-white/12 bg-white/8 text-white placeholder:text-slate-400"
                      : "border-slate-200 bg-white text-slate-900"
                  }`}
                />
              </label>
              <label className="block space-y-2 text-sm font-semibold">
                Message
                <textarea
                  value={ticketMessage}
                  onChange={(event) => setTicketMessage(event.target.value)}
                  rows={4}
                  maxLength={1200}
                  placeholder="Describe the issue and steps to reproduce."
                  className={`w-full rounded-[14px] border px-3 py-2.5 text-sm outline-none ${
                    isDarkMode
                      ? "border-white/12 bg-white/8 text-white placeholder:text-slate-400"
                      : "border-slate-200 bg-white text-slate-900"
                  }`}
                />
              </label>
              <label className="block space-y-2 text-sm font-semibold">
                Priority
                <select
                  value={ticketPriority}
                  onChange={(event) =>
                    setTicketPriority(event.target.value as "low" | "normal" | "high")
                  }
                  className={`w-full rounded-[14px] border px-3 py-2.5 text-sm outline-none ${
                    isDarkMode
                      ? "border-white/12 bg-white/8 text-white"
                      : "border-slate-200 bg-white text-slate-900"
                  }`}
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                </select>
              </label>
              {ticketFeedback ? (
                <p
                  className={`text-sm ${
                    ticketState === "success"
                      ? isDarkMode
                        ? "text-emerald-300"
                        : "text-emerald-700"
                      : isDarkMode
                        ? "text-rose-300"
                        : "text-rose-700"
                  }`}
                >
                  {ticketFeedback}
                </p>
              ) : null}
              <div className="ui-shell-footer !px-0 !pt-3">
                <button
                  type="button"
                  onClick={() => setIsContactAdminModalOpen(false)}
                  className="ui-btn ui-btn-secondary min-w-0 flex-1"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={ticketState === "saving"}
                  className="ui-btn ui-btn-primary min-w-0 flex-1 disabled:opacity-70"
                >
                  {ticketState === "saving" ? "Sending ticket..." : "Send ticket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
      {legalModal ? (
        <div className="ui-overlay z-[var(--z-modal-backdrop)] bg-slate-950/45 backdrop-blur-md">
          <button
            type="button"
            aria-label="Close"
            onClick={() => setLegalModal(null)}
            className="absolute inset-0 cursor-default bg-transparent"
          />
          <div
            className={`ui-shell ui-shell--dialog-md relative z-10 mx-auto max-w-xl overflow-hidden rounded-[28px] border shadow-[0_24px_70px_rgba(15,23,42,0.22)] ${
              isDarkMode
                ? "border-white/12 bg-slate-950 text-slate-100"
                : "border-slate-200/90 bg-white text-slate-900"
            }`}
            role="dialog"
            aria-modal="true"
            aria-label={legalModal === "privacy" ? "Privacy Policy" : "Terms of Service"}
          >
            <span className="ui-modal-accent-bar" aria-hidden />
            <div className={`ui-shell-header ${isDarkMode ? "!border-b-white/10" : "!border-b-slate-100"}`}>
              <div className="min-w-0 flex-1">
                <p className="text-lg font-semibold text-inherit">
                  {legalModal === "privacy" ? "Privacy Policy" : "Terms of Service"}
                </p>
                <p className={`mt-1 text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                  {legalModal === "privacy"
                    ? "Simple summary for CineMatch users."
                    : "Basic usage terms for CineMatch."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLegalModal(null)}
                aria-label="Close"
                className={`ui-shell-close ${
                  isDarkMode ? "bg-white/10 text-slate-200" : "bg-slate-100 text-slate-600"
                }`}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  className="ui-icon-md ui-icon-stroke"
                  aria-hidden
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>
            <div className="ui-shell-body space-y-3 !pt-4 text-sm leading-6">
              {legalModal === "privacy" ? (
                <>
                  <p>
                    We collect only the data needed to run CineMatch: account info, profile details,
                    movie interactions, and support tickets.
                  </p>
                  <p>
                    Your data is used for app features (matching, shared watchlists, support) and is
                    stored in Supabase.
                  </p>
                  <p>
                    You can request account/data deletion by contacting support from this Settings
                    page.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    By using CineMatch, you agree to use the app lawfully and avoid abuse, spam, or
                    attempts to access other users’ private data.
                  </p>
                  <p>
                    Features may change over time. We can suspend access for misuse or violations.
                  </p>
                  <p>
                    The service is provided as-is, and we aim for reliability but cannot guarantee
                    uninterrupted availability.
                  </p>
                </>
              )}
            </div>
            <div className="ui-shell-footer !pt-3">
              <Link
                href={legalModal === "privacy" ? "/privacy" : "/terms"}
                className="ui-btn ui-btn-secondary min-w-0 flex-1 text-center"
              >
                Open full page
              </Link>
              <button
                type="button"
                onClick={() => setLegalModal(null)}
                className="ui-btn ui-btn-primary min-w-0 flex-1"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {isGiftRedeemModalOpen ? (
        <div className="ui-overlay z-[var(--z-modal-backdrop)] bg-slate-950/50 backdrop-blur-md">
          <button
            type="button"
            aria-label="Close"
            onClick={() => {
              setIsGiftRedeemModalOpen(false);
              queueMicrotask(() => {
                if (giftRedeemState !== "saving") {
                  setGiftRedeemState("idle");
                  setGiftRedeemFeedback("");
                }
              });
            }}
            className="absolute inset-0 cursor-default bg-transparent"
          />
          <div
            className={`ui-shell ui-shell--dialog-md relative z-10 mx-auto w-full max-w-[min(92vw,26rem)] overflow-hidden rounded-[28px] border shadow-[0_24px_70px_rgba(15,23,42,0.28)] ${
              isDarkMode
                ? "border-white/12 bg-slate-950 text-slate-100"
                : "border-slate-200/90 bg-white text-slate-900"
            }`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="gift-redeem-title"
          >
            <span className="ui-modal-accent-bar" aria-hidden />
            <div className={`ui-shell-header relative ${isDarkMode ? "!border-b-white/10" : "!border-b-slate-100"}`}>
              <div className="min-w-0 flex-1 pt-0.5">
                <p id="gift-redeem-title" className="text-lg font-semibold text-inherit">
                  Redeem partner gift
                </p>
                <p className={`mt-1 text-xs leading-snug ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                  Enter the one-time code your partner shared from Pro + Partner Gift.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsGiftRedeemModalOpen(false);
                  queueMicrotask(() => {
                    if (giftRedeemState !== "saving") {
                      setGiftRedeemState("idle");
                      setGiftRedeemFeedback("");
                    }
                  });
                }}
                disabled={giftRedeemState === "saving"}
                aria-label="Close"
                className={`ui-shell-close ${
                  isDarkMode ? "bg-white/10 text-slate-200" : "bg-slate-100 text-slate-600"
                } disabled:opacity-50`}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="ui-icon-md ui-icon-stroke" aria-hidden>
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void handleRedeemGiftCode();
              }}
            >
              <div className="ui-shell-body space-y-4 !pt-5">
                <label className="block space-y-2">
                  <span className={`text-sm font-semibold ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>
                    Partner gift code
                  </span>
                  <input
                    value={giftRedeemCode}
                    onChange={(event) => setGiftRedeemCode(event.target.value.toUpperCase())}
                    placeholder="CM-GIFT-XXXX-XXXX"
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    className={`w-full rounded-[16px] border px-3.5 py-3 text-sm font-medium tracking-wide outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-500/25 ${
                      isDarkMode
                        ? "border-white/14 bg-white/[0.06] text-white placeholder:text-slate-500"
                        : "border-slate-200 bg-slate-50/90 text-slate-900 placeholder:text-slate-400"
                    }`}
                  />
                </label>
                {giftRedeemFeedback ? (
                  <p
                    className={`rounded-[14px] px-3 py-2.5 text-sm leading-snug ${
                      giftRedeemState === "success"
                        ? isDarkMode
                          ? "bg-emerald-500/15 text-emerald-100 ring-1 ring-emerald-400/25"
                          : "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80"
                        : isDarkMode
                          ? "bg-rose-500/12 text-rose-100 ring-1 ring-rose-400/22"
                          : "bg-rose-50 text-rose-800 ring-1 ring-rose-200/80"
                    }`}
                  >
                    {giftRedeemFeedback}
                  </p>
                ) : null}
              </div>
              <div className="ui-shell-footer !flex !flex-col !flex-nowrap !gap-2 !px-4 !pt-3 sm:!px-5">
                <button
                  type="submit"
                  disabled={giftRedeemState === "saving"}
                  className="ui-btn ui-btn-primary order-2 w-full justify-center px-3 py-2.5 text-xs font-semibold leading-tight tracking-tight disabled:opacity-70 sm:text-[13px]"
                >
                  {giftRedeemState === "saving" ? "Applying…" : "Redeem"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsGiftRedeemModalOpen(false);
                    queueMicrotask(() => {
                      if (giftRedeemState !== "saving") {
                        setGiftRedeemState("idle");
                        setGiftRedeemFeedback("");
                      }
                    });
                  }}
                  disabled={giftRedeemState === "saving"}
                  className="ui-btn ui-btn-secondary order-1 w-full justify-center px-3 py-2.5 text-xs font-semibold leading-tight tracking-tight disabled:opacity-70 sm:text-[13px]"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <PageHeader
        eyebrow="Preferences"
        title="Settings"
        description="Account and preferences. In-progress goals stay here; earned badges live on Profile."
      />

      {currentUser ? (
        <SurfaceCard className="fade-up-enter !p-0 overflow-hidden" style={{ animationDelay: "0ms" }}>
          <div
            className={`flex items-start gap-4 px-5 py-4 sm:px-6 sm:py-5 ${
              isDarkMode
                ? "bg-gradient-to-br from-violet-950/40 to-white/[0.04]"
                : "bg-gradient-to-br from-violet-50/90 via-white to-sky-50/30"
            }`}
          >
            <AvatarBadge
              initials={currentUser.avatar}
              imageUrl={currentUser.avatarImageUrl}
              sizeClassName="h-14 w-14 sm:h-16 sm:w-16"
              textClassName="text-lg font-bold"
            />
            <div className="min-w-0 flex-1">
              <p className={sectionEyebrow}>Signed in as</p>
              <p className={`truncate text-lg font-bold leading-tight sm:text-xl ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                {currentUser.name}
              </p>
              <p className={`truncate text-sm ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>{currentUser.email}</p>
              <p className={`mt-2 text-sm leading-6 ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                {currentUser.bio}
              </p>
            </div>
          </div>
          <div className={`border-t px-5 py-3 sm:px-6 ${isDarkMode ? "border-white/10" : "border-slate-200/80"}`}>
            <Link href="/profile" className="ui-btn ui-btn-secondary inline-flex">
              Edit profile details
            </Link>
          </div>
        </SurfaceCard>
      ) : null}

      <SurfaceCard className="fade-up-enter space-y-4" style={{ animationDelay: "40ms" }}>
        <p className={sectionEyebrow}>Appearance</p>
        <div className="space-y-4">
          <SettingToggle
            label="Dark mode"
            description="Switch the app to a darker evening-friendly theme."
            checked={isDarkMode}
            onChange={(checked) => updateSettings({ darkMode: checked })}
          />
          <SettingToggle
            label="Less motion"
            description="Use simpler fades and fewer moving effects. The system “reduce motion” setting also applies automatically."
            checked={settings.reduceMotion}
            onChange={(checked) => updateSettings({ reduceMotion: checked })}
          />
          <SettingToggle
            label="Autoplay trailers"
            description="When a trailer opens, start playback automatically when the network allows."
            checked={settings.autoplayTrailers}
            onChange={(checked) => updateSettings({ autoplayTrailers: checked })}
          />
        </div>
      </SurfaceCard>

      <SurfaceCard className="fade-up-enter space-y-4" style={{ animationDelay: "75ms" }}>
        <p className={sectionEyebrow}>Notifications</p>
        <div className="space-y-4">
          <SettingToggle
            label="Notifications"
            description="Get nudges when new shared matches appear."
            checked={settings.notifications}
            onChange={(checked) => updateSettings({ notifications: checked })}
          />
        </div>
      </SurfaceCard>

      <SurfaceCard className="fade-up-enter space-y-4" style={{ animationDelay: "110ms" }}>
        <p className={sectionEyebrow}>Subscription</p>
        <div
          className={`rounded-[18px] border px-4 py-4 ${
            isDarkMode ? "border-white/12 bg-white/[0.05]" : "border-slate-200/90 bg-slate-50/90"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className={`text-sm font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
              Current plan
            </p>
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] ${
                hasProAccess
                  ? isDarkMode
                    ? "bg-emerald-500/18 text-emerald-100 ring-1 ring-emerald-400/28"
                    : "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200/80"
                  : isDarkMode
                    ? "bg-white/10 text-slate-200 ring-1 ring-white/12"
                    : "bg-slate-200 text-slate-700 ring-1 ring-slate-300/70"
              }`}
            >
              {hasProAccess ? "Pro" : "Free"}
            </span>
          </div>
          <p className={`mt-2 text-xs leading-6 ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
            Free users keep core matching features. Pro unlocks advanced shared controls, premium
            insights, and priority support.
          </p>
          <div
            className={`mt-3 rounded-[14px] border px-3 py-3 text-xs leading-6 ${
              hasProAccess
                ? isDarkMode
                  ? "border-violet-400/25 bg-violet-500/10 text-violet-100"
                  : "border-violet-200 bg-violet-50 text-violet-800"
                : isDarkMode
                  ? "border-white/10 bg-white/5 text-slate-300"
                  : "border-slate-200 bg-white text-slate-600"
            }`}
          >
            Pro users can choose public profile looks in Profile (Pro Studio).
            <Link href="/profile" className="ml-1 font-semibold underline underline-offset-2">
              Open Pro Studio
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {[
                {
                  id: "pro_monthly" as const,
                  title: "Pro Monthly",
                  price: "$5.99 / month",
                  note: "Flexible billing",
                },
                {
                  id: "pro_yearly" as const,
                  title: "Pro Yearly",
                  price: "$49.99 / year",
                  note: "Best value",
                },
                {
                  id: "pro_partner_gift" as const,
                  title: "Pro + Partner Gift",
                  price: "$9.99 one-time",
                  note: "Includes one redeem code",
                },
              ].map((plan) => (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setSelectedPlanType(plan.id)}
                  className={`rounded-[14px] border px-3 py-3 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-violet-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950 ${
                    selectedPlanType === plan.id
                      ? isDarkMode
                        ? "border-violet-400/50 bg-violet-500/12 shadow-[inset_0_0_0_1px_rgba(167,139,250,0.35)]"
                        : "border-violet-400/80 bg-violet-50 shadow-[inset_0_0_0_1px_rgba(139,92,246,0.22)]"
                      : isDarkMode
                        ? "border-white/10 bg-white/[0.03]"
                        : "border-slate-200/90 bg-white"
                  }`}
                >
                  <p className={`text-sm font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                    {plan.title}
                  </p>
                  <p className={`mt-1 text-xs font-semibold ${isDarkMode ? "text-violet-200" : "text-violet-700"}`}>
                    {plan.price}
                  </p>
                  <p className={`mt-1 text-[11px] ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                    {plan.note}
                  </p>
                </button>
              ))}
            </div>

            {selectedPlanType === "pro_partner_gift" ? (
              acceptedConnectedPartners.length > 0 ? (
                <label className="block space-y-2 text-sm font-semibold">
                  Choose the connected partner for this gift
                  <select
                    value={selectedGiftPartnerId}
                    onChange={(event) => setSelectedGiftPartnerId(event.target.value)}
                    className={`w-full rounded-[14px] border px-3 py-2.5 text-sm outline-none ${
                      isDarkMode
                        ? "border-white/12 bg-white/8 text-white"
                        : "border-slate-200 bg-white text-slate-900"
                    }`}
                  >
                    <option value="none">Select partner</option>
                    {acceptedConnectedPartners.map((partner) => (
                      <option key={partner.id} value={partner.id}>
                        {partner.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <p className={`text-xs ${isDarkMode ? "text-amber-300" : "text-amber-700"}`}>
                  You need at least one accepted connection to use Partner Gift.
                </p>
              )
            ) : null}

            <button
              type="button"
              onClick={() => void handleOpenCheckout()}
              disabled={hasProAccess || isOpeningCheckout}
              className="ui-btn ui-btn-primary w-full disabled:opacity-70"
            >
              {hasProAccess
                ? "Pro is active"
                : isOpeningCheckout
                  ? "Opening checkout..."
                  : "Continue to secure checkout"}
            </button>

            {billingFeedback ? (
              <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                {billingFeedback}
              </p>
            ) : null}

            <div
              className={`rounded-[14px] border px-3 py-3 text-xs ${
                isDarkMode ? "border-white/10 bg-white/[0.03] text-slate-300" : "border-slate-200 bg-white text-slate-600"
              }`}
            >
              Secure flow: Pro activates only after Stripe confirms payment via webhook.
            </div>

            {isLoadingGiftCode ? (
              <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                Loading your partner gift code...
              </p>
            ) : myActiveGiftCode ? (
              <div
                className={`rounded-[14px] border px-3 py-3 ${
                  isDarkMode
                    ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-100"
                    : "border-emerald-200/90 bg-emerald-50 text-emerald-800"
                }`}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.12em]">Your active gift code</p>
                <p className="mt-1 text-base font-bold">{myActiveGiftCode.code}</p>
                <p className="mt-1 text-xs">
                  Expires on {new Date(myActiveGiftCode.expiresAt).toLocaleDateString()}.
                </p>
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => {
                setGiftRedeemState("idle");
                setGiftRedeemFeedback("");
                setIsGiftRedeemModalOpen(true);
              }}
              className={`w-full rounded-[14px] border px-4 py-3 text-left text-sm font-semibold transition active:scale-[0.99] ${
                isDarkMode
                  ? "border-emerald-400/28 bg-emerald-500/10 text-emerald-50 hover:bg-emerald-500/16"
                  : "border-emerald-200/90 bg-emerald-50/90 text-emerald-900 hover:bg-emerald-100/90"
              }`}
            >
              <span
                className={`block text-xs font-bold uppercase tracking-[0.14em] ${
                  isDarkMode ? "text-emerald-200/90" : "text-emerald-700/90"
                }`}
              >
                Have a code?
              </span>
              <span className="mt-1 block">Redeem partner gift code</span>
            </button>

            <SettingToggle
              label="Admin mode (simulate Pro purchase)"
              description="For testing flows only. Turning this on behaves like an active Pro subscription."
              checked={adminSubscriptionPreviewModeEnabled}
              onChange={(checked) => setAdminSubscriptionPreviewMode(checked)}
            />
          </div>
        </div>
      </SurfaceCard>

      <SurfaceCard className="fade-up-enter space-y-4" style={{ animationDelay: "120ms" }}>
        <p className={sectionEyebrow}>Privacy</p>
        <div className="space-y-4">
          <SettingToggle
            label="Hide spoilers"
            description="Keep descriptions gentle and spoiler-light."
            checked={settings.hideSpoilers}
            onChange={(checked) => updateSettings({ hideSpoilers: checked })}
          />
          <SettingToggle
            label="Cellular sync"
            description="Allow background account sync on mobile data (when available)."
            checked={settings.cellularSync}
            onChange={(checked) => updateSettings({ cellularSync: checked })}
          />
        </div>
      </SurfaceCard>

      <div className={preferencesDivider}>
        <SurfaceCard className="fade-up-enter space-y-5" style={{ animationDelay: "140ms" }}>
          <div className="space-y-1">
            <p className={sectionEyebrow}>Progress</p>
            <p
              className={`text-sm font-semibold ${
                isDarkMode ? "text-white" : "text-slate-900"
              }`}
            >
              Achievements
            </p>
            <p
              className={`text-sm leading-6 ${
                isDarkMode ? "text-slate-300" : "text-slate-500"
              }`}
            >
              Only goals you haven’t finished yet. Completed ones move to your Profile as badges.
            </p>
          </div>
          {achievementsInProgress.length === 0 ? (
            <p
              className={`rounded-[20px] border px-4 py-4 text-center text-sm ${
                isDarkMode
                  ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-100"
                  : "border-emerald-200/90 bg-emerald-50/90 text-emerald-900"
              }`}
            >
              You’re caught up on every goal — check your Profile for badges.
            </p>
          ) : (
            <div className="space-y-3">
              {achievementsInProgress.map((achievement) => (
                <AchievementRow key={achievement.id} achievement={achievement} isDarkMode={isDarkMode} />
              ))}
            </div>
          )}
        </SurfaceCard>

        <SurfaceCard className="fade-up-enter mt-4 space-y-4" style={{ animationDelay: "150ms" }}>
          <p className={sectionEyebrow}>Legal</p>
          <p className={`text-sm leading-6 ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
            Review app policies and terms before using CineMatch.
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setLegalModal("privacy")}
              className="ui-btn ui-btn-secondary w-full"
            >
              Privacy Policy
            </button>
            <button
              type="button"
              onClick={() => setLegalModal("terms")}
              className="ui-btn ui-btn-secondary w-full"
            >
              Terms of Service
            </button>
          </div>
        </SurfaceCard>
      </div>

      <div
        className={`rounded-[26px] border px-5 py-6 sm:px-6 ${
          isDarkMode
            ? "border-white/10 bg-slate-950/55 shadow-[0_12px_40px_rgba(0,0,0,0.35)]"
            : "border-slate-200/90 bg-slate-50/80 shadow-sm"
        }`}
      >
        <p className={sectionEyebrow}>Account actions</p>
        <p className={`mt-2 text-sm font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
          Contact admin
        </p>
        <p
          className={`mt-2 text-sm leading-6 ${
            isDarkMode ? "text-slate-300" : "text-slate-600"
          }`}
        >
          If you find a bug or need help, send a support ticket from here. It will appear in the
          Admin Desktop page.
        </p>
        <button
          type="button"
          onClick={() => setIsContactAdminModalOpen(true)}
          className="ui-btn ui-btn-primary mt-4 w-full"
        >
          Open contact admin form
        </button>
        {ticketSubject || ticketMessage ? (
          <p className={`mt-2 text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
            Draft saved. Reopen the popup to continue.
          </p>
        ) : null}
        {ticketFeedback ? (
          <p
            className={`mt-2 text-sm ${
              ticketState === "success"
                ? isDarkMode
                  ? "text-emerald-300"
                  : "text-emerald-700"
                : isDarkMode
                  ? "text-rose-300"
                  : "text-rose-700"
            }`}
          >
            {ticketFeedback}
          </p>
        ) : null}
        <div
          className={`my-6 h-px w-full ${isDarkMode ? "bg-white/10" : "bg-slate-200/90"}`}
          aria-hidden
        />
        <button
          type="button"
          onClick={logout}
          className={`w-full rounded-[20px] border px-4 py-3.5 text-sm font-semibold ${
            isDarkMode
              ? "border-rose-400/40 bg-rose-500/14 text-rose-50 hover:bg-rose-500/22"
              : "border-rose-200 bg-white text-rose-600 shadow-sm hover:bg-rose-50"
          }`}
        >
          Log out
        </button>
      </div>
    </div>
  );
}
