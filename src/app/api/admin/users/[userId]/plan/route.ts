import { NextResponse } from "next/server";
import { getAdminActor } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { accountPlanUpdateSchema } from "@/lib/validation";

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

  const parsed = accountPlanUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Select a valid account plan." }, { status: 400 });

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.rpc("admin_set_user_plan", {
    p_actor_id: actor.id,
    p_user_id: userId,
    p_plan: parsed.data.plan,
  });
  if (error) {
    console.error("Updating account plan failed.", error);
    const status = error.message === "Account not found" ? 404 : 500;
    return NextResponse.json({
      error: status === 404 ? error.message : "The account plan could not be updated.",
    }, { status });
  }

  return NextResponse.json({ plan: parsed.data.plan, saved: true });
}
