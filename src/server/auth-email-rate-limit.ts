const cooldownMap = new Map<string, number>();

const DEFAULT_COOLDOWN_SECONDS = 60;

export function checkEmailCooldown(key: string, cooldownSeconds = DEFAULT_COOLDOWN_SECONDS) {
  const now = Date.now();
  const nextAllowedAt = cooldownMap.get(key) ?? 0;

  if (nextAllowedAt > now) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((nextAllowedAt - now) / 1000),
    };
  }

  cooldownMap.set(key, now + cooldownSeconds * 1000);

  return {
    allowed: true,
    retryAfterSeconds: cooldownSeconds,
  };
}
