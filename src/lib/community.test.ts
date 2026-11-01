import { describe, expect, it } from "vitest";
import { getCommunitySnapshot } from "./community";

describe("getCommunitySnapshot", () => {
  it("builds a leaderboard, challenge, and discussion feed", () => {
    const snapshot = getCommunitySnapshot({ completedCount: 7, percentage: 62, streak: 4 });

    expect(snapshot.leaderboard[0].name).toBe("You");
    expect(snapshot.challenge.title).toBe("Cohort learning sprint");
    expect(snapshot.discussions[0].tag).toBe("Help");
    expect(snapshot.challenge.target).toBe(100);
  });

  it("elevates challenge messaging for strong learners", () => {
    const snapshot = getCommunitySnapshot({ completedCount: 15, percentage: 90, streak: 10 });

    expect(snapshot.challenge.reward).toContain("community round-up");
    expect(snapshot.challenge.progress).toBeGreaterThanOrEqual(0);
  });

  it("presents a recovery challenge for learners with weak momentum", () => {
    const snapshot = getCommunitySnapshot({ completedCount: 2, percentage: 25, streak: 1 });

    expect(snapshot.challenge.title).toMatch(/recovery|streak/i);
    expect(snapshot.challenge.description).toMatch(/focus|short session|streak/i);
  });
});
