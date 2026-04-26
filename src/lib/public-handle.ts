const HANDLE_PATTERN = /^[a-z][a-z0-9_]{2,31}$/;

export const PUBLIC_HANDLE_MAX_LEN = 32;
export const PUBLIC_HANDLE_MIN_LEN = 3;

/** Normalizes a raw input to lowercase trimmed (does not validate). */
export function normalizePublicHandleInput(input: string): string {
  return input.trim().toLowerCase();
}

export function isValidPublicHandleFormat(value: string): boolean {
  return HANDLE_PATTERN.test(value);
}

export function publicHandleFormatHint(): string {
  return "3–32 characters: start with a letter, then letters, numbers, or underscores.";
}

/**
 * Validates a candidate after normalization. Returns an error message or null if OK.
 */
export function describePublicHandleValidationError(
  normalized: string,
): string | null {
  if (!normalized) {
    return "Choose a User ID.";
  }
  if (normalized.length < PUBLIC_HANDLE_MIN_LEN) {
    return `Use at least ${PUBLIC_HANDLE_MIN_LEN} characters.`;
  }
  if (normalized.length > PUBLIC_HANDLE_MAX_LEN) {
    return `Use at most ${PUBLIC_HANDLE_MAX_LEN} characters.`;
  }
  if (!HANDLE_PATTERN.test(normalized)) {
    return publicHandleFormatHint();
  }
  return null;
}
