"use client";

import { useAppState } from "@/lib/app-state";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description: string;
  action?: React.ReactNode;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: PageHeaderProps) {
  const { isDarkMode } = useAppState();

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-2">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-500">
            {eyebrow}
          </p>
        ) : null}
        <div className="space-y-1">
          <h1
            className={`text-3xl font-semibold tracking-tight ${
              isDarkMode ? "text-slate-50" : "text-slate-900"
            }`}
          >
            {title}
          </h1>
          <p
            className={`max-w-xs text-sm leading-6 ${
              isDarkMode ? "text-slate-400" : "text-slate-500"
            }`}
          >
            {description}
          </p>
        </div>
      </div>
      {action}
    </div>
  );
}
