import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isMissingAuthSession } from "@/lib/supabase/auth-errors";
import { progressRequestSchema } from "@/lib/validation";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Cloud progress is not configured." }, { status: 503 });
  }
  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError && !isMissingAuthSession(userError)) {
    console.error("Progress session verification failed.", userError);
    return NextResponse.json({ error: "Your session could not be verified." }, { status: 401 });
  }
  if (!userData.user) return NextResponse.json({ error: "Sign in to sync your progress." }, { status: 401 });

  const { data, error } = await supabase
    .from("lesson_progress")
    .select("lesson_id")
    .eq("user_id", userData.user.id);
  if (error) {
    console.error("Loading learning progress failed.", error);
    return NextResponse.json({ error: "Your progress could not be loaded." }, { status: 500 });
  }
  return NextResponse.json({ completedLessonIds: data.map((row) => row.lesson_id) });
}

export async function POST(request: Request) {
  const parsed = progressRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid progress request." }, { status: 400 });
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Cloud progress is not configured." }, { status: 503 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError && !isMissingAuthSession(userError)) {
    console.error("Progress session verification failed.", userError);
    return NextResponse.json({ error: "Your session could not be verified." }, { status: 401 });
  }
  if (!userData.user) return NextResponse.json({ error: "Sign in to sync your progress." }, { status: 401 });

  if (parsed.data.action === "complete") {
    const { error } = await supabase.from("lesson_progress").upsert(
      { user_id: userData.user.id, lesson_id: parsed.data.lessonId },
      { onConflict: "user_id,lesson_id", ignoreDuplicates: true },
    );
    if (error) {
      console.error("Saving lesson completion failed.", error);
      return NextResponse.json({ error: "Your lesson completion could not be saved." }, { status: 500 });
    }
  } else {
    const { error } = await supabase.rpc("import_local_progress", {
      p_lesson_ids: [...new Set(parsed.data.lessonIds)],
    });
    if (error) {
      console.error("Importing browser learning progress failed.", error);
      return NextResponse.json({ error: "Your previous browser progress could not be imported." }, { status: 500 });
    }
  }

  const { data, error } = await supabase
    .from("lesson_progress")
    .select("lesson_id")
    .eq("user_id", userData.user.id);
  if (error) {
    console.error("Reloading learning progress failed.", error);
    return NextResponse.json({ error: "Your saved progress could not be confirmed." }, { status: 500 });
  }
  return NextResponse.json({ completedLessonIds: data.map((row) => row.lesson_id) });
}
