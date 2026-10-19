import LearningApp from "@/components/learning-app";
import SignInGate from "@/components/sign-in-gate";
import { getLearnerAnalytics } from "@/lib/analytics";
import { getSignedInUser } from "@/lib/auth";
import { getCurrentProgress, getPublicLessons } from "@/lib/curriculum";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getSignedInUser();
  if (!user) return <SignInGate />;

  const [lessons, completedLessonIds, supabase, analytics] = await Promise.all([
    getPublicLessons(),
    getCurrentProgress(),
    createSupabaseServerClient(),
    getLearnerAnalytics(),
  ]);
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("display_name,role")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw new Error("Could not load your account profile.", { cause: error });

  return (
    <LearningApp
      lessons={lessons}
      initialCompletedIds={completedLessonIds}
      analytics={analytics}
      user={{
        id: user.id,
        name: profile?.display_name || user.email?.split("@")[0] || "Learner",
        email: user.email || "",
        isAdmin: profile?.role === "admin",
      }}
    />
  );
}
