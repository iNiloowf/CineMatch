/**
 * Discover A/B: two full-page implementations share the same data model.
 * - `discover1` — original layout (see `src/app/(app)/discover/discover-1-content.tsx`).
 * - `discover2` — alternate layout (see `discover-2-content.tsx`).
 *
 * `/discover` renders `DISCOVER_DEFAULT_VARIANT`. To make discover1 the default again, set this
 * to `"discover1"` only — no other file or route renames are required.
 */
export type DiscoverAbVariant = "discover1" | "discover2";

export const DISCOVER_DEFAULT_VARIANT: DiscoverAbVariant = "discover2";
