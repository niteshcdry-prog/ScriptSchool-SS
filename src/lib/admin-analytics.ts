import { z } from "zod";

export const adminAnalyticsSchema = z.object({
  totalAccounts: z.number().int().nonnegative(),
  learnerCount: z.number().int().nonnegative(),
  adminCount: z.number().int().nonnegative(),
  averageCompletion: z.number().int().nonnegative(),
  cohortCompletionRate: z.number().int().min(0).max(100),
  topLearnerEmail: z.string().nullable().default(null),
  freePlanCount: z.number().int().nonnegative(),
  proPlanCount: z.number().int().nonnegative(),
  quizAccuracy: z.number().int().min(0).max(100),
  quizAttempts: z.number().int().nonnegative(),
  totalCompletedLessons: z.number().int().nonnegative(),
});

export type AdminAnalytics = z.infer<typeof adminAnalyticsSchema>;
