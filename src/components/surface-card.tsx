 "use client";

import { ReactNode } from "react";
import { useAppState } from "@/lib/app-state";

type SurfaceCardProps = {
  children: ReactNode;
  className?: string;
};

export function SurfaceCard({ children, className = "" }: SurfaceCardProps) {
  const { isDarkMode } = useAppState();

  return (
    <section
      className={`fade-up-enter rounded-[28px] p-5 backdrop-blur-xl hover:-translate-y-0.5 ${isDarkMode ? "border border-white/10 bg-white/8 shadow-[0_18px_50px_rgba(0,0,0,0.35)] hover:shadow-[0_24px_60px_rgba(0,0,0,0.42)]" : "border border-white/70 bg-white/90 shadow-[0_18px_50px_rgba(116,82,186,0.14)] hover:shadow-[0_24px_60px_rgba(116,82,186,0.18)]"} ${className}`}
    >
      {children}
    </section>
  );
}
