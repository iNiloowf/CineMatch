"use client";

import { ComponentPropsWithoutRef, ReactNode } from "react";
import { useAppState } from "@/lib/app-state";

type SurfaceCardProps = {
  children: ReactNode;
  className?: string;
} & ComponentPropsWithoutRef<"section">;

export function SurfaceCard({
  children,
  className = "",
  ...props
}: SurfaceCardProps) {
  const { isDarkMode } = useAppState();

  return (
    <section
      {...props}
      className={`fade-up-enter rounded-[28px] p-5 backdrop-blur-xl hover:-translate-y-0.5 ${isDarkMode ? "border border-white/10 bg-white/8 shadow-[0_18px_50px_rgba(0,0,0,0.35)] hover:shadow-[0_24px_60px_rgba(0,0,0,0.42)]" : "border border-white/85 bg-white/92 shadow-[0_20px_56px_rgba(126,94,197,0.12)] hover:shadow-[0_26px_66px_rgba(126,94,197,0.18)]"} ${className}`}
    >
      {children}
    </section>
  );
}
