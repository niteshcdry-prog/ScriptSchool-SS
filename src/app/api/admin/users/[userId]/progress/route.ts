import { NextResponse } from "next/server";
import { getAdminActor } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const actor = await getAdminActor();
  if (!actor) return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
  const { userId } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)) {
    return NextResponse.json({ error: "Select a valid account." }, { status: 400 });
  }
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.rpc("admin_reset_progress", {
    p_actor_id: actor.id,
    p_user_id: userId,
  });
  if (error) {
    console.error("Resetting learner progress failed.", error);
    const status = error.message === "Account not found" ? 404 : 500;
    return NextResponse.json({ error: status === 404 ? error.message : "The learner progress could not be reset." }, { status });
  }
  return NextResponse.json({ reset: true });
}
