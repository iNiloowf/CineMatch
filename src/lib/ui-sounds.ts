/**
 * Short, soft “water droplet” chime for positive in-app moments (no asset files).
 * Best-effort: skips if AudioContext is unavailable or autoplay blocks playback.
 */
export function playWaterDropletChime() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const Ctor =
      window.AudioContext ||
      (
        window as unknown as {
          webkitAudioContext?: typeof AudioContext;
        }
      ).webkitAudioContext;

    if (!Ctor) {
      return;
    }

    const ctx = new Ctor();
    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.11, now + 0.018);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
    master.connect(ctx.destination);

    const drop = ctx.createOscillator();
    drop.type = "sine";
    drop.frequency.setValueAtTime(920, now);
    drop.frequency.exponentialRampToValueAtTime(380, now + 0.09);
    drop.connect(master);
    drop.start(now);
    drop.stop(now + 0.11);

    const ripple = ctx.createOscillator();
    ripple.type = "sine";
    ripple.frequency.setValueAtTime(1320, now + 0.035);
    ripple.frequency.exponentialRampToValueAtTime(520, now + 0.11);
    ripple.connect(master);
    ripple.start(now + 0.035);
    ripple.stop(now + 0.13);

    void ctx.resume().then(() => {
      window.setTimeout(() => {
        void ctx.close().catch(() => {});
      }, 450);
    });
  } catch {
    // Autoplay policy or older browsers — ignore.
  }
}
