/**
 * Parse `Authorization: Bearer <access_token>` only. Does not validate the JWT; callers must use
 * Supabase admin `auth.getUser(token)` for signature and session validation.
 */
export function getBearerAccessToken(authorizationHeader: string): string | null {
  if (!authorizationHeader.startsWith("Bearer ")) {
    return null;
  }

  const accessToken = authorizationHeader.slice(7).trim();
  return accessToken || null;
}
