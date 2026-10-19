import { describe, expect, it } from "vitest";
import { learnerAnalyticsSchema } from "./analytics-schema";

describe("learnerAnalyticsSchema", () => {
  it("accepts scoped quiz summaries and a bounded recent history", () => {
    const result = learnerAnalyticsSchema.safeParse({
      completedLessons: 2,
      publishedLessons: 30,
      quizAttempts: 4,
      correctAnswers: 3,
      recentQuizAttempts: [{
        lessonTitle: "Variables",
        isCorrect: true,
        answeredAt: "2026-10-16T12:00:00.000Z",
      }],
    });

    expect(result.success).toBe(true);
  });

  it("rejects impossible accuracy totals and oversized histories", () => {
    const base = {
      completedLessons: 2,
      publishedLessons: 30,
      quizAttempts: 1,
      correctAnswers: 2,
      recentQuizAttempts: [],
    };
    expect(learnerAnalyticsSchema.safeParse(base).success).toBe(false);
    expect(learnerAnalyticsSchema.safeParse({
      ...base,
      correctAnswers: 0,
      recentQuizAttempts: Array.from({ length: 6 }, () => ({
        lessonTitle: "Variables",
        isCorrect: true,
        answeredAt: "2026-10-16T12:00:00.000Z",
      })),
    }).success).toBe(false);
  });
});
