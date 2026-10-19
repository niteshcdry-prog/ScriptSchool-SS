import Link from "next/link";
import AdminDashboard, { type AdminLesson } from "@/components/admin-dashboard";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireAdmin();
  const supabase = createSupabaseAdminClient();
  const [
    { data: courses, error: coursesError },
    { data: modules, error: modulesError },
    { data: lessons, error: lessonsError },
    { data: prerequisites, error: prerequisitesError },
    { data: activity, error: activityError },
  ] = await Promise.all([
    supabase.from("courses").select("id,title,description,language,difficulty_level,estimated_minutes,recommended_prerequisites,learning_outcomes,published").order("title").limit(100),
    supabase.from("modules").select("id,course_id,title,sort_order").order("sort_order").limit(500),
    supabase.from("lessons").select("id,module_id,title,icon,duration,level,description,explanation,code,tip,practice_prompt,practice_starter,practice_hint,practice_solution,quiz_explanation,sort_order,published,quiz_questions(prompt,quiz_options(id,label,sort_order),quiz_answers(correct_option_id))").order("sort_order").limit(500),
    supabase.from("lesson_prerequisites").select("lesson_id,prerequisite_lesson_id"),
    supabase.from("admin_audit_logs").select("id,action,entity_type,entity_id,created_at").order("created_at", { ascending: false }).limit(30),
  ]);
  if (coursesError || modulesError || lessonsError || prerequisitesError || activityError) {
    const error = coursesError || modulesError || lessonsError || prerequisitesError || activityError;
    throw new Error("Could not load the administration workspace.", { cause: error });
  }

  const prerequisiteIdsByLesson = new Map<string, string[]>();
  for (const prerequisite of prerequisites || []) {
    const current = prerequisiteIdsByLesson.get(prerequisite.lesson_id) || [];
    current.push(prerequisite.prerequisite_lesson_id);
    prerequisiteIdsByLesson.set(prerequisite.lesson_id, current);
  }

  const lessonRows = (lessons || []) as unknown as Array<{
    id: string;
    module_id: string;
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
    published: boolean;
    quiz_questions: Array<{
      prompt: string;
      quiz_options: Array<{ id: string; label: string; sort_order: number }>;
      quiz_answers: Array<{ correct_option_id: string }>;
    }>;
  }>;
  const adminLessons: AdminLesson[] = lessonRows.map((lesson) => {
    const question = lesson.quiz_questions[0];
    const options = [...(question?.quiz_options || [])].sort((left, right) => left.sort_order - right.sort_order);
    const answerId = question?.quiz_answers[0]?.correct_option_id;
    const answer = options.findIndex((option) => option.id === answerId);
    return {
      id: lesson.id,
      moduleId: lesson.module_id,
      title: lesson.title,
      icon: lesson.icon,
      duration: lesson.duration,
      level: lesson.level as AdminLesson["level"],
      description: lesson.description,
      explanation: lesson.explanation,
      code: lesson.code,
      tip: lesson.tip,
      practicePrompt: lesson.practice_prompt,
      practiceStarter: lesson.practice_starter,
      practiceHint: lesson.practice_hint,
      practiceSolution: lesson.practice_solution,
      quizExplanation: lesson.quiz_explanation,
      sortOrder: lesson.sort_order,
      published: lesson.published,
      prerequisiteIds: prerequisiteIdsByLesson.get(lesson.id) || [],
      quiz: question?.prompt || "",
      options: options.map((option) => option.label),
      answer: Math.max(0, answer ?? 0),
    };
  });

  return (
    <main className="admin-page">
      <header className="admin-topbar">
        <Link className="brand" href="/"><span className="brand-mark">{"</>"}</span><span>script<span className="brand-accent">school</span></span></Link>
        <div><span className="admin-mode">Administrator console</span><Link className="admin-back" href="/">← Back to learning</Link></div>
      </header>
      <div className="admin-content">
        <p className="welcome-kicker">SCRIPT SCHOOL · ADMINISTRATION</p>
        <h1>Manage the learning experience</h1>
        <p className="admin-intro">Edit curriculum and quizzes, manage learner access, and review progress. Unpublish courses or lessons to remove them from the learner catalog while preserving progress and history.</p>
        <AdminDashboard
          courses={(courses || []).map((course) => ({
            id: course.id,
            title: course.title,
            description: course.description,
            language: course.language,
            level: course.difficulty_level,
            estimatedMinutes: course.estimated_minutes,
            recommendedPrerequisites: course.recommended_prerequisites,
            learningOutcomes: course.learning_outcomes,
            published: course.published,
          }))}
          modules={modules || []}
          lessons={adminLessons}
          activity={(activity || []).map((event) => ({
            id: event.id,
            action: event.action,
            entityType: event.entity_type,
            entityId: event.entity_id || "",
            createdAt: event.created_at,
          }))}
        />
      </div>
    </main>
  );
}
