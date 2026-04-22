/** Next shuffle seed for Discover queue (`buildDiscoverQueue` session key). */
export function nextDiscoverShuffleSeedForUser(userId: string | null): string {
  if (userId && typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${userId}-${crypto.randomUUID()}`;
  }
  if (userId) {
    return `${userId}-${Date.now()}-${Math.random()}`;
  }
  return `${Date.now()}-${Math.random()}`;
}

/** Rotation offset passed into `buildDiscoverQueue` (persisted with Discover session). */
export function nextDiscoverStartOffset(): number {
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    return crypto.getRandomValues(new Uint32Array(1))[0]!;
  }
  return Math.floor(Math.random() * 100000);
}
