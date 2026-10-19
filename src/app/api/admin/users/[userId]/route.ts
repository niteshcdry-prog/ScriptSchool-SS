import { NextResponse } from "next/server";
import { getAdminActor } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { roleInputSchema } from "@/lib/validation";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const actor = await getAdminActor();
  if (!actor) return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
  const { userId } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)) {
    return NextResponse.json({ error: "Select a valid account." }, { status: 400 });
  }
  if (userId === actor.id) return NextResponse.json({ error: "You cannot change your own administrator role." }, { status: 400 });
  const parsed = roleInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Select a valid account role." }, { status: 400 });

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.rpc("admin_set_user_role", {
    p_actor_id: actor.id,
    p_user_id: userId,
    p_role: parsed.data.role,
  });
  if (error) {
    console.error("Updating account role failed.", error);
    const status = error.message.includes("At least one administrator") ? 409
      : error.message === "Account not found" ? 404
        : error.message.includes("cannot change their own role") ? 400 : 500;
    return NextResponse.json({
      error: status === 500 ? "The account role could not be updated." : error.message,
    }, { status });
  }
  return NextResponse.json({ saved: true });
}
