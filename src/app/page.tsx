import LearningApp from "@/components/learning-app";
import SignInGate from "@/components/sign-in-gate";
import { getLearnerAnalytics } from "@/lib/analytics";
import { getSignedInUser } from "@/lib/auth";
import { getCurrentProgress, getPublicLessons } from "@/lib/curriculum";
import { getPlanById, isPremiumCourse } from "@/lib/plans";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getSignedInUser();
  if (!user) return <SignInGate />;

  const adminSupabase = createSupabaseAdminClient();
  const [lessons, completedLessonIds, supabase, analytics, catalogResult] = await Promise.all([
    getPublicLessons(),
    getCurrentProgress(),
    createSupabaseServerClient(),
    getLearnerAnalytics(),
    adminSupabase
      .from("courses")
      .select("id,title,description,language,difficulty_level,estimated_minutes,recommended_prerequisites,learning_outcomes,modules(title,lessons(id,published))")
      .eq("published", true)
      .order("title"),
  ]);
  if (catalogResult.error) throw new Error("Could not load the course catalog.", { cause: catalogResult.error });
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("display_name,role,plan")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw new Error("Could not load your account profile.", { cause: error });

  const currentPlan = getPlanById(profile?.plan || "free");
  const accessibleLessons = lessons.filter((lesson) =>
    !isPremiumCourse(lesson.courseId) || currentPlan === "pro" || profile?.role === "admin",
  );
  const courseCatalog = (catalogResult.data || []).map((course) => ({
    id: course.id,
    title: course.title,
    description: course.description,
    language: course.language,
    level: course.difficulty_level,
    estimatedMinutes: course.estimated_minutes,
    recommendedPrerequisites: course.recommended_prerequisites,
    learningOutcomes: course.learning_outcomes,
    lessonCount: course.modules.reduce(
      (total, module) => total + module.lessons.filter((lesson) => lesson.published).length,
      0,
    ),
    topics: course.modules
      .filter((module) => module.lessons.some((lesson) => lesson.published))
      .map((module) => module.title),
  }));

  return (
    <LearningApp
      lessons={accessibleLessons}
      courseCatalog={courseCatalog}
      initialCompletedIds={completedLessonIds}
      analytics={analytics}
      initialPlan={currentPlan}
      user={{
        id: user.id,
        name: profile?.display_name || user.email?.split("@")[0] || "Learner",
        email: user.email || "",
        isAdmin: profile?.role === "admin",
      }}
    />
  );
}
