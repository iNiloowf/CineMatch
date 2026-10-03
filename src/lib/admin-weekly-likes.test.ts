import { describe, expect, it } from "vitest";
import {
  rankMoviesByWeeklyLikes,
  utcWeekRange,
} from "@/lib/admin-weekly-likes";

describe("utcWeekRange", () => {
  it("starts on Monday 00:00 UTC", () => {
    const now = new Date("2026-10-03T21:00:00.000Z"); // Saturday
    const { start, end } = utcWeekRange(now);
    expect(start.toISOString()).toBe("2026-09-28T00:00:00.000Z");
    expect(end.toISOString()).toBe(now.toISOString());
  });

  it("treats Sunday as the end of the current Monday-start week", () => {
    const now = new Date("2026-10-04T12:00:00.000Z"); // Sunday
    const { start } = utcWeekRange(now);
    expect(start.toISOString()).toBe("2026-09-28T00:00:00.000Z");
  });
});

describe("rankMoviesByWeeklyLikes", () => {
  it("counts distinct users per movie and ranks the most liked first", () => {
    const ranked = rankMoviesByWeeklyLikes(
      [
        { movieId: "a", userId: "u1" },
        { movieId: "a", userId: "u2" },
        { movieId: "a", userId: "u1" },
        { movieId: "b", userId: "u3" },
        { movieId: "c", userId: "u1" },
        { movieId: "c", userId: "u2" },
        { movieId: "c", userId: "u3" },
      ],
      10,
    );
    expect(ranked).toEqual([
      { movieId: "c", likeCount: 3 },
      { movieId: "a", likeCount: 2 },
      { movieId: "b", likeCount: 1 },
    ]);
  });

  it("caps the list at the requested limit", () => {
    const ranked = rankMoviesByWeeklyLikes(
      [
        { movieId: "a", userId: "u1" },
        { movieId: "b", userId: "u1" },
        { movieId: "c", userId: "u1" },
      ],
      2,
    );
    expect(ranked).toHaveLength(2);
  });
});
