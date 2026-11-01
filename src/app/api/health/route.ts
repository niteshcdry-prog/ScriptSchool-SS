import { NextResponse } from "next/server";
import { isSupabaseAdminConfigured } from "@/lib/supabase/config";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const timestamp = new Date().toISOString();

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json(
      {
        service: "script-school",
        status: "degraded",
        checks: { database: false },
        timestamp,
      },
      { status: 503 },
    );
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("courses").select("id", { head: true, count: "exact" }).limit(1);
  if (error) {
    console.error("Health check database query failed.", error);
    return NextResponse.json(
      {
        service: "script-school",
        status: "degraded",
        checks: { database: false },
        timestamp,
      },
      { status: 503 },
    );
  }

  return NextResponse.json({
    service: "script-school",
    status: "ok",
    checks: { database: true },
    timestamp,
  });
}
