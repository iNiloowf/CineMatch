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
    <label
      className={`flex items-center justify-between gap-4 rounded-[24px] px-4 py-4 ${
        isDarkMode ? "bg-white/6" : "bg-slate-50"
      }`}
    >
      <div className="space-y-1">
        <p
          className={`text-sm font-semibold ${
            isDarkMode ? "text-slate-100" : "text-slate-800"
          }`}
        >
          {label}
        </p>
        <p
          className={`text-xs leading-5 ${
            isDarkMode ? "text-slate-400" : "text-slate-500"
          }`}
        >
          {description}
        </p>
      </div>
      <span
        className={`relative inline-flex h-8 w-14 items-center rounded-full transition ${
          checked ? "bg-violet-600" : "bg-slate-300"
        }`}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="sr-only"
        />
        <span
          className={`inline-block h-6 w-6 rounded-full bg-white shadow transition ${
            checked ? "translate-x-7" : "translate-x-1"
          }`}
        />
      </span>
    </label>
  );
}
