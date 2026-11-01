import type { LearnerAnalytics } from "./analytics-schema";
import type { PublicLesson } from "./curriculum";

export type CoachInsight = {
  title: string;
  summary: string;
  actionLabel: string;
  lessonId?: string;
};

export function getCoachInsight({
  lessons,
  completedIds,
  analytics,
  nextLesson,
  strongestCategory,
  streak,
}: {
  lessons: PublicLesson[];
  completedIds: Iterable<string>;
  analytics: LearnerAnalytics | null;
  nextLesson?: PublicLesson | null;
  strongestCategory?: { category: string; complete: number; total: number } | null;
  streak?: number;
}): CoachInsight {
  const completedSet = new Set(completedIds);
  const completedCount = lessons.filter((lesson) => completedSet.has(lesson.id)).length;
  const accuracy = analytics && analytics.quizAttempts > 0
    ? Math.round((analytics.correctAnswers / analytics.quizAttempts) * 100)
    : null;
  const momentumStreak = typeof streak === "number" ? streak : Number.POSITIVE_INFINITY;

  if (completedCount === 0) {
    return {
      title: "Start with the fundamentals",
      summary: "Your first one or two lessons will create a stronger base than trying to jump ahead. Build confidence with a short, focused session before moving into more complex topics.",
      actionLabel: "Open first lesson",
      lessonId: lessons[0]?.id,
    };
  }

  if (momentumStreak <= 2 && completedCount <= 1 && accuracy !== null && accuracy < 60) {
    return {
      title: "Streak recovery",
      summary: `Your recent accuracy is ${accuracy}%, so a short 20-minute review will do more for your momentum than rushing ahead. Revisit ${nextLesson?.title || lessons[0]?.title || "the next unlocked concept"} and focus on one clear idea before you continue.`,
      actionLabel: "Resume short session",
      lessonId: nextLesson?.id || lessons[0]?.id,
    };
  }

  if (nextLesson) {
    const reviewMessage = accuracy !== null && accuracy < 75
      ? `Your quiz accuracy is ${accuracy}%. A quick review of ${nextLesson.title} and the surrounding concept will reinforce your weakest areas before you keep moving.`
      : `Continue with ${nextLesson.title} in ${nextLesson.courseTitle}. This is the best next step based on your unlocked progress and learning path.`;

    return {
      title: "Next best step",
      summary: reviewMessage,
      actionLabel: "Open next lesson",
      lessonId: nextLesson.id,
    };
  }

  if (accuracy !== null && accuracy < 75) {
    const topic = strongestCategory?.category || "your strongest topic";
    return {
      title: "Refine the concept that needs extra attention",
      summary: `Your quiz accuracy is ${accuracy}%. Revisit ${topic} and try one more practice round to turn shaky recall into steady confidence.`,
      actionLabel: "Review topic",
      lessonId: lessons[0]?.id,
    };
  }

  return {
    title: "You are building strong momentum",
    summary: "You’ve completed the current path. Repeat a concept with an example exercise or return to your strongest topic to lock in the ideas before taking on new work.",
    actionLabel: "Review strong topic",
    lessonId: lessons[0]?.id,
  };
}
