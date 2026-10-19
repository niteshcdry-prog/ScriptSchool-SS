import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminActor } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const pageSize = 50;
const progressCountsSchema = z.array(z.object({
  user_id: z.string().uuid(),
  completed_count: z.union([z.number().int().nonnegative(), z.string().regex(/^\d+$/)]),
}));

export async function GET(request: Request) {
  const actor = await getAdminActor();
  if (!actor) return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
  const url = new URL(request.url);
  const page = Math.max(1, Math.min(10000, Number(url.searchParams.get("page")) || 1));
  const supabase = createSupabaseAdminClient();
  const { data: authData, error: authError } = await supabase.auth.admin.listUsers({ page, perPage: pageSize });
  if (authError) {
    console.error("Listing user accounts failed.", authError);
    return NextResponse.json({ error: "User accounts could not be loaded." }, { status: 500 });
  }

  const userIds = authData.users.map((user) => user.id);
  if (!userIds.length) return NextResponse.json({ users: [], nextPage: null });

  const [{ data: profiles, error: profilesError }, { data: progressCounts, error: progressError }] = await Promise.all([
    supabase.from("profiles").select("id,display_name,role").in("id", userIds),
    supabase.rpc("admin_get_progress_counts", { p_user_ids: userIds }),
  ]);
  if (profilesError || progressError) {
    console.error("Loading user administration data failed.", profilesError || progressError);
    return NextResponse.json({ error: "User profiles or progress could not be loaded." }, { status: 500 });
  }

  const parsedProgressCounts = progressCountsSchema.safeParse(progressCounts);
  if (!parsedProgressCounts.success) {
    console.error("The progress count query returned an invalid response.", parsedProgressCounts.error);
    return NextResponse.json({ error: "User progress counts could not be loaded." }, { status: 500 });
  }

  const progressCountByUser = new Map(
    parsedProgressCounts.data.map((row) => [row.user_id, Number(row.completed_count)]),
  );
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  return NextResponse.json({
    users: authData.users.map((user) => {
      const profile = profileById.get(user.id);
      return {
        id: user.id,
        email: user.email || "",
        name: profile?.display_name || user.user_metadata?.full_name || "",
        role: profile?.role || "learner",
        completedCount: progressCountByUser.get(user.id) || 0,
        createdAt: user.created_at,
      };
    }),
    nextPage: authData.users.length === pageSize ? page + 1 : null,
  });
}
