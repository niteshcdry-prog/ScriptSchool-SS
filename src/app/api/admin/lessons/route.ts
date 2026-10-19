import { NextResponse } from "next/server";
import { getAdminActor } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { lessonInputSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const actor = await getAdminActor();
  if (!actor) return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
  const parsed = lessonInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid lesson." }, { status: 400 });
  const lesson = parsed.data;
  const supabase = createSupabaseAdminClient();

  const { error } = await supabase.rpc("admin_save_lesson", {
    p_actor_id: actor.id,
    p_lesson: {
      id: lesson.id,
      moduleId: lesson.moduleId,
      title: lesson.title,
      icon: lesson.icon,
      duration: lesson.duration,
      level: lesson.level,
      description: lesson.description,
      explanation: lesson.explanation,
      code: lesson.code,
      tip: lesson.tip,
      practicePrompt: lesson.practicePrompt,
      practiceStarter: lesson.practiceStarter,
      practiceHint: lesson.practiceHint,
      practiceSolution: lesson.practiceSolution,
      quizExplanation: lesson.quizExplanation,
      sortOrder: lesson.sortOrder,
      published: lesson.published,
      prerequisiteIds: lesson.prerequisiteIds,
      quiz: lesson.quiz,
      options: lesson.options,
      answer: lesson.answer,
    },
  });
  if (error) {
    console.error("Saving lesson and quiz transaction failed.", error);
    return NextResponse.json({ error: "The lesson could not be saved." }, { status: 500 });
  }

  return NextResponse.json({ saved: true });
}
