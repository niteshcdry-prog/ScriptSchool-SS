import { z } from "zod";

export const learnerAnalyticsSchema = z.object({
  completedLessons: z.number().int().nonnegative(),
  publishedLessons: z.number().int().nonnegative(),
  quizAttempts: z.number().int().nonnegative(),
  correctAnswers: z.number().int().nonnegative(),
  recentQuizAttempts: z.array(z.object({
    lessonTitle: z.string(),
    isCorrect: z.boolean(),
    answeredAt: z.string().datetime({ offset: true }),
  })).max(5),
}).refine((analytics) => analytics.correctAnswers <= analytics.quizAttempts, {
  message: "Correct answers cannot exceed total quiz attempts.",
});

export type LearnerAnalytics = z.infer<typeof learnerAnalyticsSchema>;
