import { NextResponse } from "next/server";
import { getSignedInUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { profileUpdateSchema } from "@/lib/validation";

export async function PATCH(request: Request) {
  const user = await getSignedInUser();
  if (!user) return NextResponse.json({ error: "Sign in to update your profile." }, { status: 401 });

  const parsed = profileUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid profile details." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({ display_name: parsed.data.displayName, updated_at: new Date().toISOString() })
    .eq("id", user.id)
    .select("id")
    .maybeSingle();
  if (error) {
    console.error("Updating learner profile failed.", error);
    return NextResponse.json({ error: "Your profile could not be updated." }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "Your profile was not found." }, { status: 404 });

  return NextResponse.json({ displayName: parsed.data.displayName, saved: true });
}
