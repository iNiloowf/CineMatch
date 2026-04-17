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
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      className={`flex items-center justify-between gap-5 rounded-[24px] px-4 py-4 ${
        isDarkMode ? "bg-white/6" : "bg-slate-50"
      }`}
    >
      <div className="min-w-0 flex-1 space-y-1 text-left">
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
        className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full transition ${
          checked ? "bg-violet-600" : "bg-slate-300"
        }`}
      >
        <span
          className={`inline-block h-6 w-6 rounded-full bg-white shadow transition ${
            checked ? "translate-x-7" : "translate-x-1"
          }`}
        />
      </span>
    </button>
  );
}
