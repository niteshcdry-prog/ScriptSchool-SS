import { NextResponse } from "next/server";
import { getAdminActor } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { contentVersionInputSchema } from "@/lib/validation";

const entityTypes = new Set(["course", "module", "lesson"]);

export async function GET(request: Request) {
  const actor = await getAdminActor();
  if (!actor) return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });

  const params = new URL(request.url).searchParams;
  const entityType = params.get("entityType");
  const entityId = params.get("entityId");
  if (!entityType || !entityTypes.has(entityType) || !entityId || entityId.length > 100) {
    return NextResponse.json({ error: "A valid content item is required." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("content_versions")
    .select("id,entity_type,entity_id,title,published,note,snapshot,created_at")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false })
    .limit(8);

  if (error) {
    console.error("Loading content version history failed.", error);
    return NextResponse.json({ error: "Version history could not be loaded." }, { status: 500 });
  }

  return NextResponse.json({
    versions: (data || []).map((version) => ({
      id: version.id,
      entityType: version.entity_type,
      entityId: version.entity_id,
      title: version.title,
      published: version.published,
      note: version.note,
      snapshot: version.snapshot,
      createdAt: version.created_at,
    })),
  });
}

export async function POST(request: Request) {
  const actor = await getAdminActor();
  if (!actor) return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });

  const parsed = contentVersionInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid content version." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc("admin_save_content_version", {
    p_actor_id: actor.id,
    p_entity_type: parsed.data.entityType,
    p_entity_id: parsed.data.entityId,
    p_title: parsed.data.title,
    p_published: parsed.data.published,
    p_note: parsed.data.note,
    p_snapshot: parsed.data.snapshot,
  });
  if (error) {
    console.error("Saving content version failed.", error);
    return NextResponse.json({ error: "The content version could not be saved." }, { status: 500 });
  }

  return NextResponse.json({ id: data, saved: true });
}
