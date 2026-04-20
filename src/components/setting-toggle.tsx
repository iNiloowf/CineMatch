"use client";

import { useAppState } from "@/lib/app-state";

type SettingToggleProps = {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

export function SettingToggle({
  label,
  description,
  checked,
  onChange,
}: SettingToggleProps) {
  const { isDarkMode } = useAppState();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`flex w-full min-w-0 items-start justify-between gap-4 rounded-[24px] px-4 py-4 text-left ${
        isDarkMode ? "bg-white/6" : "bg-slate-50/80 ring-1 ring-slate-200/70"
      }`}
    >
      <div className="min-w-0 flex-1 space-y-1">
        <p
          className={`text-sm font-semibold ${
            isDarkMode ? "text-slate-100" : "text-slate-800"
          }`}
        >
          {label}
        </p>
        <p
          className={`text-xs leading-5 ${
            isDarkMode ? "text-slate-300" : "text-slate-500"
          }`}
        >
          {description}
        </p>
      </div>
      <span
        className={`relative mt-0.5 inline-flex h-8 w-14 shrink-0 rounded-full transition ${
          checked ? "bg-violet-600" : isDarkMode ? "bg-slate-500 ring-1 ring-white/10" : "bg-slate-300"
        }`}
      >
        <span
          aria-hidden
          className={`pointer-events-none absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-[left] duration-200 ease-out ${
            checked ? "left-[calc(100%-1.75rem)]" : "left-1"
          }`}
        />
      </span>
    </button>
  );
}
