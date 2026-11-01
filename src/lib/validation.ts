import { z } from "zod";

export const progressRequestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("complete"),
    lessonId: z.string().min(1).max(100),
  }),
  z.object({
    action: z.literal("import"),
    lessonIds: z.array(z.string().min(1).max(100)).max(500),
  }),
]);

export const quizRequestSchema = z.object({
  lessonId: z.string().min(1).max(100),
  optionIndex: z.number().int().min(0).max(50),
});

export const lessonInputSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100),
  moduleId: z.string().min(1).max(100),
  title: z.string().trim().min(1).max(160),
  icon: z.string().trim().min(1).max(12),
  duration: z.number().int().min(1).max(600),
  level: z.enum(["Beginner", "Intermediate", "Advanced"]),
  description: z.string().trim().min(1).max(500),
  explanation: z.string().trim().min(1).max(5000),
  code: z.string().max(10000),
  tip: z.string().trim().min(1).max(1000),
  practicePrompt: z.string().trim().max(1000).default(""),
  practiceStarter: z.string().max(10000).default(""),
  practiceHint: z.string().trim().max(1000).default(""),
  practiceSolution: z.string().max(10000).default(""),
  quizExplanation: z.string().trim().max(1000).default(""),
  sortOrder: z.number().int().min(0).max(10000),
  published: z.boolean(),
  prerequisiteIds: z.array(z.string().min(1).max(100)).max(50).default([]),
  quiz: z.string().trim().min(1).max(1000),
  options: z.array(z.string().trim().min(1).max(500)).min(2).max(8),
  answer: z.number().int().min(0).max(7),
}).refine((lesson) => lesson.answer < lesson.options.length, {
  message: "The correct answer must refer to an existing option.",
  path: ["answer"],
}).refine((lesson) => !lesson.prerequisiteIds.includes(lesson.id), {
  message: "A lesson cannot be its own prerequisite.",
  path: ["prerequisiteIds"],
}).refine((lesson) => new Set(lesson.prerequisiteIds).size === lesson.prerequisiteIds.length, {
  message: "Prerequisites must be unique.",
  path: ["prerequisiteIds"],
});

export const courseInputSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100),
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).max(1000),
  language: z.string().trim().min(1).max(40),
  level: z.string().trim().min(1).max(80),
  estimatedMinutes: z.number().int().min(0).max(100_000),
  recommendedPrerequisites: z.array(z.string().trim().min(1).max(160)).max(20),
  learningOutcomes: z.array(z.string().trim().min(1).max(500)).max(20),
  published: z.boolean(),
});

export const moduleInputSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100),
  courseId: z.string().min(1).max(100),
  title: z.string().trim().min(1).max(160),
  sortOrder: z.number().int().min(0).max(10000),
});

export const contentVersionInputSchema = z.object({
  entityType: z.enum(["course", "module", "lesson"]),
  entityId: z.string().min(1).max(100),
  title: z.string().trim().min(1).max(160),
  published: z.boolean(),
  note: z.string().trim().max(500).default(""),
  snapshot: z.record(z.string(), z.unknown()).refine(
    (snapshot) => new TextEncoder().encode(JSON.stringify(snapshot)).length <= 100_000,
    "Version snapshot must be under 100 KB.",
  ),
});

export const profileUpdateSchema = z.object({
  displayName: z.string().trim().min(1).max(100),
});

export const accountPlanUpdateSchema = z.object({
  plan: z.enum(["free", "pro"]),
});

export const publishContentSchema = z.discriminatedUnion("entityType", [
  z.object({
    entityType: z.literal("course"),
    course: courseInputSchema,
    note: z.string().trim().max(500).default(""),
  }),
  z.object({
    entityType: z.literal("lesson"),
    lesson: lessonInputSchema,
    note: z.string().trim().max(500).default(""),
  }),
]);

export const roleInputSchema = z.object({
  role: z.enum(["learner", "admin"]),
});
