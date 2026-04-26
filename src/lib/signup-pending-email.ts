const STORAGE_KEY = "cinematch_signup_pending";

export type SignupPendingPayload = {
  name: string;
  publicHandle: string;
  email: string;
  password: string;
  /** Cooldown from API (seconds) after last send */
  resendCooldownSeconds?: number;
};

export function writeSignupPendingEmail(payload: SignupPendingPayload): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore quota / private mode
  }
}

export function readSignupPendingEmail(): SignupPendingPayload | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as SignupPendingPayload;
    if (
      typeof parsed?.email !== "string" ||
      typeof parsed?.name !== "string" ||
      typeof parsed?.password !== "string" ||
      typeof parsed?.publicHandle !== "string"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearSignupPendingEmail(): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
