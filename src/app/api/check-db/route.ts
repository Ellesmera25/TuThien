import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const envStatus = {
    hasSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    hasSupabaseAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    hasSupabaseServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  };
  const supabase = getSupabaseServiceClient();

  if (!supabase) {
    return NextResponse.json({
      connected: false,
      env: envStatus,
      reason: "Supabase service client is not configured",
    });
  }

  const tables = [
    "donations",
    "reels",
    "reel_likes",
    "reel_comments",
    "campaign_follows",
  ];
  const checks = await Promise.all(
    tables.map(async (table) => {
      const { error } = await supabase.from(table).select("id").limit(1);
      return {
        ok: !error,
        table,
        error: error ? `${error.code ?? "ERR"}: ${error.message}` : null,
      };
    }),
  );

  return NextResponse.json({
    connected: checks.every((check) => check.ok),
    env: envStatus,
    tables: checks,
    message: "Supabase check completed",
  });
}
