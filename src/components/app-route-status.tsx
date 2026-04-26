"use client";

import Link from "next/link";
import type { ComponentProps, CSSProperties, ReactNode } from "react";
import { NetworkStatusBlock } from "@/components/network-status-block";
import { SurfaceCard } from "@/components/surface-card";
import { DiscoverCardSkeleton } from "@/components/ui-skeleton";

/**
 * Shared layout for route-level loading (Discover shell, profile gate, etc.).
 */
export function AppRouteLoading({
  message,
  ariaLabel,
  isDarkMode,
  visual = "skeleton",
  frameClassName,
}: {
  message: string;
  ariaLabel: string;
  isDarkMode: boolean;
  visual?: "skeleton" | "spinner";
  /** Outer wrapper; default fills the protected route shell. */
  frameClassName?: string;
}) {
  return (
    <div
      className={frameClassName ?? "flex flex-1 items-center justify-center p-[var(--app-page-px)]"}
    >
      <div
        className="mx-auto w-full max-w-md space-y-4"
        role="status"
        aria-live="polite"
        aria-label={ariaLabel}
      >
        {visual === "skeleton" ? (
          <DiscoverCardSkeleton />
        ) : (
          <div className="flex justify-center">
            <div
              className={`h-10 w-10 shrink-0 animate-spin rounded-full border-2 border-t-transparent ${
                isDarkMode ? "border-white/20 border-t-violet-300" : "border-slate-200 border-t-violet-600"
              }`}
              aria-hidden
            />
          </div>
        )}
        <p
          className={`text-center text-sm font-medium ${
            isDarkMode ? "text-slate-300" : "text-slate-600"
          }`}
        >
          {message}
        </p>
      </div>
    </div>
  );
}

type EmptyPrimary =
  | { label: string; href: string }
  | { label: string; onClick: () => void };

/**
 * Inline empty card (Shared list, Picks queue, etc.) — matches existing SurfaceCard patterns.
 */
export function AppRouteEmptyCard({
  title,
  description,
  isDarkMode,
  className,
  style,
  tone = "compact",
  primaryAction,
  children,
}: {
  title: string;
  description: string;
  isDarkMode: boolean;
  className?: string;
  style?: CSSProperties;
  tone?: "compact" | "comfortable";
  primaryAction?: EmptyPrimary;
  children?: ReactNode;
}) {
  const titleClass =
    tone === "comfortable"
      ? `text-lg font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`
      : `text-base font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`;
  const descriptionClass =
    tone === "comfortable"
      ? `text-sm leading-6 ${isDarkMode ? "text-slate-300" : "text-slate-500"}`
      : `text-xs leading-relaxed ${isDarkMode ? "text-slate-300" : "text-slate-500"}`;

  return (
    <SurfaceCard className={className ?? "space-y-2 text-center"} style={style}>
      <p className={titleClass}>{title}</p>
      <p className={descriptionClass}>{description}</p>
      {primaryAction ? (
        "href" in primaryAction ? (
          <Link href={primaryAction.href} className="ui-btn ui-btn-primary mt-2 inline-flex">
            {primaryAction.label}
          </Link>
        ) : (
          <button
            type="button"
            onClick={primaryAction.onClick}
            className="ui-btn ui-btn-primary mt-2 w-full sm:mx-auto sm:w-auto"
          >
            {primaryAction.label}
          </button>
        )
      ) : null}
      {children}
    </SurfaceCard>
  );
}

/**
 * Centers {@link NetworkStatusBlock} for full-area empty/error states (e.g. Discover deck exhausted).
 */
export function AppRouteNetworkStatus(props: ComponentProps<typeof NetworkStatusBlock>) {
  return (
    <div
      className={`flex w-full flex-1 flex-col items-center justify-center px-[var(--app-page-px)] ${
        props.compact ? "min-h-[30vh] py-5 sm:min-h-[34vh] sm:py-6" : "min-h-[40vh] py-8"
      }`}
    >
      <NetworkStatusBlock {...props} />
    </div>
  );
}
