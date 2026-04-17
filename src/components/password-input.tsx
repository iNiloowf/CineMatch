"use client";

import { ChangeEventHandler, FocusEventHandler, useState } from "react";

type PasswordInputProps = {
  name: string;
  placeholder: string;
  defaultValue?: string;
  value?: string;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  onBlur?: FocusEventHandler<HTMLInputElement>;
  required?: boolean;
  /** When set, matches email inputs on auth screens in light/dark. */
  isDarkMode?: boolean;
  invalid?: boolean;
};

export function PasswordInput({
  name,
  placeholder,
  defaultValue,
  value,
  onChange,
  onBlur,
  required = true,
  isDarkMode = false,
  invalid = false,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  const surface = isDarkMode
    ? invalid
      ? "border-rose-400/55 bg-white/8 text-white ring-2 ring-rose-500/30 placeholder:text-slate-400 focus:border-rose-300 focus:bg-white/10"
      : "border-white/10 bg-white/8 text-white placeholder:text-slate-400 focus:border-violet-400 focus:bg-white/10"
    : invalid
      ? "border-rose-300 bg-rose-50/50 text-slate-900 ring-2 ring-rose-200 placeholder:text-slate-400 focus:border-rose-400 focus:bg-white"
      : "border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:border-violet-400 focus:bg-white";

  const toggleTone = isDarkMode
    ? "text-slate-400 hover:bg-white/10 hover:text-white"
    : "text-slate-500 hover:bg-slate-100 hover:text-slate-800";

  return (
    <div className="relative">
      <input
        name={name}
        type={visible ? "text" : "password"}
        required={required}
        defaultValue={defaultValue}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        aria-invalid={invalid || undefined}
        className={`w-full rounded-[20px] border px-4 py-3 pr-12 text-sm outline-none transition ${surface}`}
      />
      <button
        type="button"
        onMouseDown={(event) => event.preventDefault()}
        onTouchStart={(event) => event.preventDefault()}
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? "Hide password" : "Show password"}
        className={`absolute right-2 top-1/2 flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-full transition ${toggleTone}`}
      >
        {visible ? (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.8 21.8 0 0 1 5.06-5.94" />
            <path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a21.78 21.78 0 0 1-3.17 4.36" />
            <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
            <path d="m1 1 22 22" />
          </svg>
        ) : (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path d="M2.06 12S6 4 12 4s9.94 8 9.94 8S18 20 12 20 2.06 12 2.06 12Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}
