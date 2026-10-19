import { NextResponse } from "next/server";
import { getAdminActor } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { courseInputSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const actor = await getAdminActor();
  if (!actor) return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
  const parsed = courseInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid course." }, { status: 400 });

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.rpc("admin_save_course", {
    p_actor_id: actor.id,
    p_course: parsed.data,
  });
  if (error) {
    console.error("Saving course failed.", error);
    return NextResponse.json({ error: "The course could not be saved." }, { status: 500 });
  }
  return NextResponse.json({ saved: true });
}
