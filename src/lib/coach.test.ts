import { describe, expect, it } from "vitest";
import type { PublicLesson } from "./curriculum";
import { getCoachInsight } from "./coach";

const sampleLessons = [
  {
    id: "lesson-1",
    title: "First lesson",
    category: "Core",
    description: "Intro",
    explanation: "",
    code: "",
    quiz: "",
    options: ["A"],
    tip: "",
    practicePrompt: "",
    practiceStarter: "",
    practiceHint: "",
    practiceSolution: "",
    quizExplanation: "",
    level: "Beginner",
    duration: 10,
    icon: "✎",
    prerequisiteIds: [],
    courseId: "javascript-foundations",
    courseTitle: "JavaScript Foundations",
    courseDescription: "",
    courseLanguage: "javascript",
    courseLevel: "Beginner",
    courseEstimatedMinutes: 120,
    courseRecommendedPrerequisites: [],
    courseLearningOutcomes: [],
    optionIds: ["option-1"],
    sortOrder: 1,
  },
  {
    id: "lesson-2",
    title: "Second lesson",
    category: "Core",
    description: "Next",
    explanation: "",
    code: "",
    quiz: "",
    options: ["A"],
    tip: "",
    practicePrompt: "",
    practiceStarter: "",
    practiceHint: "",
    practiceSolution: "",
    quizExplanation: "",
    level: "Beginner",
    duration: 12,
    icon: "✎",
    prerequisiteIds: ["lesson-1"],
    courseId: "javascript-foundations",
    courseTitle: "JavaScript Foundations",
    courseDescription: "",
    courseLanguage: "javascript",
    courseLevel: "Beginner",
    courseEstimatedMinutes: 120,
    courseRecommendedPrerequisites: [],
    courseLearningOutcomes: [],
    optionIds: ["option-2"],
    sortOrder: 2,
  },
] as PublicLesson[];

describe("getCoachInsight", () => {
  it("suggests starting with the first lesson when nothing is complete", () => {
    const insight = getCoachInsight({
      lessons: sampleLessons,
      completedIds: [],
      analytics: null,
      nextLesson: sampleLessons[0],
      strongestCategory: null,
    });

    expect(insight.title).toContain("Start with the fundamentals");
    expect(insight.lessonId).toBe("lesson-1");
  });

  it("adapts to low quiz accuracy by recommending review before moving on", () => {
    const insight = getCoachInsight({
      lessons: sampleLessons,
      completedIds: ["lesson-1"],
      analytics: {
        completedLessons: 1,
        publishedLessons: 2,
        quizAttempts: 10,
        correctAnswers: 4,
        recentQuizAttempts: [],
      },
      nextLesson: sampleLessons[1],
      strongestCategory: { category: "Core", complete: 1, total: 2 },
    });

    expect(insight.title).toContain("Next best step");
    expect(insight.summary).toContain("40%");
    expect(insight.lessonId).toBe("lesson-2");
  });

  it("recommends a review when the learner finishes the path and accuracy is still weak", () => {
    const insight = getCoachInsight({
      lessons: sampleLessons,
      completedIds: ["lesson-1", "lesson-2"],
      analytics: {
        completedLessons: 2,
        publishedLessons: 2,
        quizAttempts: 5,
        correctAnswers: 2,
        recentQuizAttempts: [],
      },
      nextLesson: null,
      strongestCategory: { category: "Core", complete: 2, total: 2 },
    });

    expect(insight.title).toContain("Refine the concept");
    expect(insight.summary).toContain("40%");
  });

  it("offers a streak-recovery recommendation when momentum is low", () => {
    const insight = getCoachInsight({
      lessons: sampleLessons,
      completedIds: ["lesson-1"],
      analytics: {
        completedLessons: 1,
        publishedLessons: 2,
        quizAttempts: 4,
        correctAnswers: 2,
        recentQuizAttempts: [],
      },
      nextLesson: sampleLessons[1],
      strongestCategory: { category: "Core", complete: 1, total: 2 },
      streak: 1,
    });

    expect(insight.title).toContain("Streak recovery");
    expect(insight.summary).toMatch(/20|minutes|session/i);
  });
});
