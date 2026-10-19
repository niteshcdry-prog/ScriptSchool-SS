import { existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import curriculum from "../src/data/curriculum.json";
import { additionalCourses, additionalLessons, additionalModules } from "../src/data/additional-curricula";
import { expandJavascriptLessons } from "../src/data/javascript-practice";
import { getCourseScopedPrerequisiteIds, getOrderedCurriculumLessons } from "../src/data/curriculum-order";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function assertSuccess(error: { message: string } | null, operation: string) {
  if (error) throw new Error(`${operation} failed: ${error.message}`);
}

const courses = [...curriculum.courses, ...additionalCourses];
const modules = [...curriculum.modules, ...additionalModules];
const lessons = [...expandJavascriptLessons(curriculum.lessons), ...additionalLessons];
const orderedLessons = getOrderedCurriculumLessons({ courses, modules, lessons });

async function seed() {
  const { error: legacyCourseError } = await supabase
    .from("courses")
    .update({ published: false })
    .in("id", [
      "browser-dom-development",
      "modern-javascript",
      "asynchronous-javascript",
      "advanced-javascript-practice",
    ]);
  assertSuccess(legacyCourseError, "Archiving superseded JavaScript course entries");

  for (const course of courses) {
    const { error } = await supabase.from("courses").upsert({
      id: course.id,
      title: course.title,
      description: course.description,
      language: course.language,
      difficulty_level: course.level,
      estimated_minutes: course.estimatedMinutes,
      recommended_prerequisites: course.recommendedPrerequisites,
      learning_outcomes: course.learningOutcomes,
      published: true,
    });
    assertSuccess(error, `Seeding course "${course.title}"`);
  }

  const moduleByTitle = new Map(modules.map((module) => [module.title, module]));
  for (const curriculumModule of modules) {
    const { error } = await supabase.from("modules").upsert({
      id: curriculumModule.id,
      course_id: curriculumModule.courseId,
      title: curriculumModule.title,
      sort_order: curriculumModule.sortOrder,
    });
    assertSuccess(error, `Seeding module "${curriculumModule.title}"`);
  }

  for (const [index, lesson] of orderedLessons.entries()) {
    const curriculumModule = moduleByTitle.get(lesson.category);
    if (!curriculumModule) throw new Error(`No module found for lesson "${lesson.id}".`);

    const { error: lessonError } = await supabase.from("lessons").upsert({
      id: lesson.id,
      module_id: curriculumModule.id,
      title: lesson.title,
      icon: lesson.icon,
      duration: lesson.duration,
      level: lesson.level,
      description: lesson.description,
      explanation: lesson.explanation,
      code: lesson.code,
      tip: lesson.tip,
      practice_prompt: lesson.practicePrompt || "",
      practice_starter: lesson.practiceStarter || "",
      practice_hint: lesson.practiceHint || "",
      practice_solution: lesson.practiceSolution || "",
      quiz_explanation: lesson.quizExplanation || "",
      sort_order: index + 1,
      published: true,
    });
    assertSuccess(lessonError, `Seeding lesson "${lesson.id}"`);

    const { data: question, error: questionError } = await supabase
      .from("quiz_questions")
      .upsert({ lesson_id: lesson.id, prompt: lesson.quiz }, { onConflict: "lesson_id" })
      .select("id")
      .single();
    assertSuccess(questionError, `Seeding quiz question for "${lesson.id}"`);
    if (!question) throw new Error(`Could not create quiz question for "${lesson.id}".`);

    const { data: existingOptions, error: existingOptionsError } = await supabase
      .from("quiz_options")
      .select("id,sort_order")
      .eq("question_id", question.id);
    assertSuccess(existingOptionsError, `Reading existing quiz options for "${lesson.id}"`);

    const { data: options, error: optionsError } = await supabase
      .from("quiz_options")
      .upsert(lesson.options.map((label, sortOrder) => ({
        question_id: question.id,
        label,
        sort_order: sortOrder,
      })), { onConflict: "question_id,sort_order" })
      .select("id,sort_order");
    assertSuccess(optionsError, `Updating quiz options for "${lesson.id}"`);
    const correctOption = options?.find((option) => option.sort_order === lesson.answer);
    if (!correctOption) throw new Error(`Could not resolve correct quiz answer for "${lesson.id}".`);

    const obsoleteOptionIds = (existingOptions || [])
      .filter((option) => option.sort_order >= lesson.options.length)
      .map((option) => option.id);
    if (obsoleteOptionIds.length) {
      const { error: deleteOptionsError } = await supabase
        .from("quiz_options")
        .delete()
        .in("id", obsoleteOptionIds);
      assertSuccess(deleteOptionsError, `Removing obsolete quiz options for "${lesson.id}"`);
    }

    const { error: answerError } = await supabase.from("quiz_answers").upsert({
      question_id: question.id,
      correct_option_id: correctOption.id,
    });
    assertSuccess(answerError, `Seeding correct answer for "${lesson.id}"`);
  }

  const lessonIds = orderedLessons.map((lesson) => lesson.id);
  const { error: clearPrerequisitesError } = await supabase
    .from("lesson_prerequisites")
    .delete()
    .in("lesson_id", lessonIds);
  assertSuccess(clearPrerequisitesError, "Resetting bundled lesson prerequisites");

  const prerequisitesByLesson = getCourseScopedPrerequisiteIds(orderedLessons, modules);
  const prerequisiteRows = [];
  for (const lesson of orderedLessons) {
    for (const prerequisiteLessonId of prerequisitesByLesson.get(lesson.id) || []) {
      prerequisiteRows.push({ lesson_id: lesson.id, prerequisite_lesson_id: prerequisiteLessonId });
    }
  }
  if (prerequisiteRows.length) {
    const { error } = await supabase.from("lesson_prerequisites").insert(prerequisiteRows);
    assertSuccess(error, "Saving course-scoped lesson prerequisites");
  }

  console.log(`Seeded ${courses.length} courses, ${modules.length} modules, and ${lessons.length} lessons.`);
}

seed().catch((error: unknown) => {
  console.error("Curriculum seeding failed.", error);
  process.exitCode = 1;
});
