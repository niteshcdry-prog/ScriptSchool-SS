import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isMissingAuthSession } from "@/lib/supabase/auth-errors";
import { consumeRequestRateLimit } from "@/lib/rate-limit";
import { quizRequestSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const parsed = quizRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid quiz answer." }, { status: 400 });

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Quiz access requires an enabled account." }, { status: 503 });
  }

  const sessionClient = await createSupabaseServerClient();
  const { data: userData, error: userError } = await sessionClient.auth.getUser();
  if (userError && !isMissingAuthSession(userError)) {
    console.error("Quiz session verification failed.", userError);
    return NextResponse.json({ error: "Your session could not be verified." }, { status: 401 });
  }
  if (!userData.user) return NextResponse.json({ error: "Sign in to access course content." }, { status: 401 });

  const clientKey = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";
  let allowed: boolean;
  try {
    allowed = await consumeRequestRateLimit("quiz-check", clientKey, 30, 60);
  } catch (error) {
    console.error("Quiz rate limit check failed.", error);
    return NextResponse.json({ error: "Quiz checking is temporarily unavailable." }, { status: 503 });
  }
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many quiz attempts. Please wait a minute and try again." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  const supabase = createSupabaseAdminClient();
  const { data: isCorrect, error } = await supabase.rpc("check_lesson_answer", {
    p_lesson_id: parsed.data.lessonId,
    p_option_index: parsed.data.optionIndex,
    p_user_id: userData.user.id,
  });
  if (error) {
    console.error("Quiz answer check failed.", error);
    const status = error.message.includes("not found") ? 404
      : error.message.includes("Pro plan") ? 403 : 500;
    return NextResponse.json({
      error: status === 404 ? "That quiz question could not be found."
        : status === 403 ? "An active Pro plan is required for this course."
          : "The quiz answer could not be checked.",
    }, { status });
  }

  return NextResponse.json({ isCorrect });
}
