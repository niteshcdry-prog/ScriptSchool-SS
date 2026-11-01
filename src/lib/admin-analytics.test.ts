import { describe, expect, it } from "vitest";
import { adminAnalyticsSchema } from "./admin-analytics";

describe("adminAnalyticsSchema", () => {
  it("accepts aggregate metrics from the admin analytics RPC", () => {
    expect(adminAnalyticsSchema.parse({
      totalAccounts: 12,
      learnerCount: 10,
      adminCount: 2,
      averageCompletion: 4,
      cohortCompletionRate: 25,
      topLearnerEmail: "learner@example.com",
      freePlanCount: 8,
      proPlanCount: 2,
      quizAccuracy: 76,
      quizAttempts: 25,
      totalCompletedLessons: 40,
    })).toMatchObject({
      learnerCount: 10,
      quizAccuracy: 76,
      proPlanCount: 2,
    });
  });

  it("rejects invalid percentage metrics", () => {
    expect(adminAnalyticsSchema.safeParse({
      totalAccounts: 1,
      learnerCount: 1,
      adminCount: 0,
      averageCompletion: 0,
      cohortCompletionRate: 101,
      topLearnerEmail: null,
      freePlanCount: 1,
      proPlanCount: 0,
      quizAccuracy: 0,
      quizAttempts: 0,
      totalCompletedLessons: 0,
    }).success).toBe(false);
  });
});
