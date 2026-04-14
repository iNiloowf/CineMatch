"use client";

import { ChangeEventHandler, useState } from "react";

type PasswordInputProps = {
  name: string;
  placeholder: string;
  defaultValue?: string;
  value?: string;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  required?: boolean;
};

export function PasswordInput({
  name,
  placeholder,
  defaultValue,
  value,
  onChange,
  required = true,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        name={name}
        type={visible ? "text" : "password"}
        required={required}
        defaultValue={defaultValue}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3 pr-12 text-sm outline-none transition focus:border-violet-400 focus:bg-white"
      />
      <button
        type="button"
        onMouseDown={(event) => event.preventDefault()}
        onTouchStart={(event) => event.preventDefault()}
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? "Hide password" : "Show password"}
        className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-500"
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
