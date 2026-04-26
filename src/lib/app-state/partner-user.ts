import type { User } from "@/lib/types";

/**
 * Snapshot of a `User` for link/shared list rows. Keeps a single shape when mapping
 * from `data.users` in shared watch + friend link flows (avoids duplicated object literals).
 */
export function toPartnerViewUser(partner: User): User {
  return {
    id: partner.id,
    publicHandle: partner.publicHandle,
    name: partner.name,
    email: partner.email,
    avatar: partner.avatar,
    avatarImageUrl: partner.avatarImageUrl,
    bio: partner.bio,
    city: partner.city,
    favoriteMovie: partner.favoriteMovie,
    profileHeaderMovie: partner.profileHeaderMovie,
    profileStyle: partner.profileStyle,
  };
}
