import { NextResponse } from "next/server";
import { getAdminActor } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { publishContentSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const actor = await getAdminActor();
  if (!actor) return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });

  const parsed = publishContentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid content for publishing." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const result = parsed.data.entityType === "course"
    ? await supabase.rpc("admin_publish_course", {
      p_actor_id: actor.id,
      p_course: parsed.data.course,
      p_note: parsed.data.note || "Published to learners",
    })
    : await supabase.rpc("admin_publish_lesson", {
      p_actor_id: actor.id,
      p_lesson: {
        ...parsed.data.lesson,
        published: true,
      },
      p_note: parsed.data.note || "Published to learners",
    });

  if (result.error) {
    console.error("Publishing content transaction failed.", result.error);
    return NextResponse.json({ error: "The content could not be published." }, { status: 500 });
  }

  return NextResponse.json({ versionId: result.data, published: true });
}
