import type { AccountSyncPayload, ProfileRow } from "@/lib/account-sync/types";

export function redactPeerProfileEmail(profile: ProfileRow): ProfileRow {
  return { ...profile, email: "" };
}

/** Ensures linked users' emails are not kept in client state or snapshots. */
export function sanitizeAccountSyncPayloadForClient(
  activeUserId: string,
  payload: AccountSyncPayload,
): AccountSyncPayload {
  return {
    ...payload,
    partnerProfiles: (payload.partnerProfiles ?? []).map(redactPeerProfileEmail),
    profile:
      payload.profile && payload.profile.id !== activeUserId
        ? redactPeerProfileEmail(payload.profile)
        : payload.profile,
  };
}
