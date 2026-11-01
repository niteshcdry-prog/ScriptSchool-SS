import "server-only";

import { z } from "zod";
import curriculum from "@/data/curriculum.json";
import { getCourseScopedPrerequisiteIds, getOrderedCurriculumLessons } from "@/data/curriculum-order";
import { additionalCourses, additionalLessons, additionalModules } from "@/data/additional-curricula";
import { expandJavascriptLessons } from "@/data/javascript-practice";
import { isSupabaseConfigured } from "./supabase/config";
import { isMissingAuthSession } from "./supabase/auth-errors";
import { createSupabaseAdminClient } from "./supabase/admin";
import { createSupabaseServerClient } from "./supabase/server";

const lessonSchema = z.object({
  id: z.string(),
  title: z.string(),
  category: z.string(),
  icon: z.string(),
  duration: z.number(),
  level: z.string(),
  description: z.string(),
  explanation: z.string(),
  code: z.string(),
  quiz: z.string(),
  options: z.array(z.string()),
  tip: z.string(),
  practicePrompt: z.string().default(""),
  practiceStarter: z.string().default(""),
  practiceHint: z.string().default(""),
  practiceSolution: z.string().default(""),
  quizExplanation: z.string().default(""),
  prerequisiteIds: z.array(z.string()).default([]),
});

export type PublicLesson = z.infer<typeof lessonSchema> & {
  courseId: string;
  courseTitle: string;
  courseDescription: string;
  courseLanguage: string;
  courseLevel: string;
  courseEstimatedMinutes: number;
  courseRecommendedPrerequisites: string[];
  courseLearningOutcomes: string[];
  optionIds: string[];
  sortOrder: number;
};

const catalogCourses = [...curriculum.courses, ...additionalCourses];
const catalogModules = [...curriculum.modules, ...additionalModules];
const catalogLessons = [...expandJavascriptLessons(curriculum.lessons), ...additionalLessons];

type RemoteLesson = {
  id: string;
  title: string;
  icon: string;
  duration: number;
  level: string;
  description: string;
  explanation: string;
  code: string;
  tip: string;
  practice_prompt: string;
  practice_starter: string;
  practice_hint: string;
  practice_solution: string;
  quiz_explanation: string;
  sort_order: number;
  modules: {
    title: string;
    courses: {
      id: string;
      title: string;
      description: string;
      language: string;
      difficulty_level: string;
      estimated_minutes: number;
      recommended_prerequisites: string[];
      learning_outcomes: string[];
    } | null;
  } | null;
};

type RemoteQuizQuestion = {
  id: string;
  lesson_id: string;
  prompt: string;
  quiz_options: Array<{
    id: string;
    label: string;
    sort_order: number;
  }>;
};

export function getSeedLessons(): PublicLesson[] {
  const catalog = { courses: catalogCourses, modules: catalogModules, lessons: catalogLessons };
  const orderedLessons = getOrderedCurriculumLessons(catalog);
  const moduleByTitle = new Map(catalogModules.map((module) => [module.title, module]));
  const courseById = new Map(catalogCourses.map((course) => [course.id, course]));
  const prerequisitesByLesson = getCourseScopedPrerequisiteIds(orderedLessons, catalogModules);
  return orderedLessons.map((lesson, index) => {
    const curriculumModule = moduleByTitle.get(lesson.category);
    const course = curriculumModule ? courseById.get(curriculumModule.courseId) : undefined;
    if (!curriculumModule || !course) throw new Error(`Course or module missing for lesson "${lesson.id}".`);
    return {
      ...lessonSchema.parse({
        ...lesson,
        prerequisiteIds: prerequisitesByLesson.get(lesson.id) || [],
      }),
      courseId: course.id,
      courseTitle: course.title,
      courseDescription: course.description,
      courseLanguage: course.language,
      courseLevel: course.level,
      courseEstimatedMinutes: course.estimatedMinutes,
      courseRecommendedPrerequisites: course.recommendedPrerequisites,
      courseLearningOutcomes: course.learningOutcomes,
      optionIds: lesson.options.map((_, optionIndex) => `${lesson.id}-option-${optionIndex}`),
      sortOrder: index + 1,
    };
  });
}

export async function getPublicLessons(): Promise<PublicLesson[]> {
  if (!isSupabaseConfigured()) return getSeedLessons();

  const supabase = await createSupabaseServerClient();
  const [
    { data, error },
    { data: prerequisiteData, error: prerequisiteError },
  ] = await Promise.all([
    supabase
      .from("lessons")
      .select("id,title,icon,duration,level,description,explanation,code,tip,practice_prompt,practice_starter,practice_hint,practice_solution,quiz_explanation,sort_order,modules!inner(title,courses!inner(id,title,description,language,difficulty_level,estimated_minutes,recommended_prerequisites,learning_outcomes,published))")
      .eq("published", true)
      .eq("modules.courses.published", true)
      .order("sort_order"),
    supabase.from("lesson_prerequisites").select("lesson_id,prerequisite_lesson_id"),
  ]);

  if (error || prerequisiteError) {
    throw new Error("Could not load the published curriculum.", { cause: error || prerequisiteError });
  }
  const remoteLessons = (data || []) as unknown as RemoteLesson[];
  const lessonIds = remoteLessons.map((lesson) => lesson.id);
  // Scope the privileged lookup to lessons already visible through learner RLS.
  const { data: quizQuestionData, error: quizQuestionError } = lessonIds.length
    ? await createSupabaseAdminClient()
      .from("quiz_questions")
      .select("id,lesson_id,prompt,quiz_options(id,label,sort_order)")
      .in("lesson_id", lessonIds)
    : { data: [], error: null };
  if (quizQuestionError) {
    throw new Error("Could not load quiz questions for the published curriculum.", { cause: quizQuestionError });
  }
  const quizQuestionsByLesson = new Map<string, RemoteQuizQuestion[]>();
  for (const question of (quizQuestionData || []) as RemoteQuizQuestion[]) {
    const current = quizQuestionsByLesson.get(question.lesson_id) || [];
    current.push(question);
    quizQuestionsByLesson.set(question.lesson_id, current);
  }
  const prerequisitesByLesson = new Map<string, string[]>();
  for (const prerequisite of prerequisiteData || []) {
    const current = prerequisitesByLesson.get(prerequisite.lesson_id) || [];
    current.push(prerequisite.prerequisite_lesson_id);
    prerequisitesByLesson.set(prerequisite.lesson_id, current);
  }

  return remoteLessons.map((lesson) => {
    const question = quizQuestionsByLesson.get(lesson.id)?.[0];
    const options = [...(question?.quiz_options || [])].sort((left, right) => left.sort_order - right.sort_order);
    const validated = lessonSchema.parse({
      ...lesson,
      category: lesson.modules?.title || "Lessons",
      quiz: question?.prompt || "This lesson has no quiz yet.",
      options: options.map((option) => option.label),
      practicePrompt: lesson.practice_prompt,
      practiceStarter: lesson.practice_starter,
      practiceHint: lesson.practice_hint,
      practiceSolution: lesson.practice_solution,
      quizExplanation: lesson.quiz_explanation,
      prerequisiteIds: prerequisitesByLesson.get(lesson.id) || [],
    });
    return {
      ...validated,
      courseId: lesson.modules?.courses?.id || "",
      courseTitle: lesson.modules?.courses?.title || "Course",
      courseDescription: lesson.modules?.courses?.description || "",
      courseLanguage: lesson.modules?.courses?.language || "",
      courseLevel: lesson.modules?.courses?.difficulty_level || "",
      courseEstimatedMinutes: lesson.modules?.courses?.estimated_minutes || 0,
      courseRecommendedPrerequisites: lesson.modules?.courses?.recommended_prerequisites || [],
      courseLearningOutcomes: lesson.modules?.courses?.learning_outcomes || [],
      optionIds: options.map((option) => option.id),
      sortOrder: lesson.sort_order,
    };
  });
}

export async function getCurrentProgress(): Promise<string[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError && !isMissingAuthSession(userError)) throw new Error("Could not verify the current session.", { cause: userError });
  if (!userData.user) return [];

  const { data, error } = await supabase
    .from("lesson_progress")
    .select("lesson_id")
    .eq("user_id", userData.user.id);
  if (error) throw new Error("Could not load your saved learning progress.", { cause: error });
  return data.map((row) => row.lesson_id);
}
