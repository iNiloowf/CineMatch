/**
 * Partner gift codes are stored as CM-GIFT-XXXX-XXXX (see Stripe webhook).
 * The redeem field accepts only A–Z / a–z / 0–9; this maps the 14-letter
 * compact form (CMGIFT + 8) to the canonical dashed code for lookup.
 */
export function normalizePartnerGiftCode(raw: string): string {
  const alnum = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (alnum.startsWith("CMGIFT") && alnum.length === 14) {
    const rest = alnum.slice(6);
    return `CM-GIFT-${rest.slice(0, 4)}-${rest.slice(4, 8)}`;
  }
  return alnum;
}

/** Allowed while typing / pasting: English letters and digits only. */
export function sanitizePartnerGiftCodeInput(raw: string): string {
  return raw.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}
