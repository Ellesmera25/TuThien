import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const supabase = getSupabaseServiceClient();

  if (!supabase) {
    return NextResponse.json({
      connected: false,
      reason: "Supabase service client is not configured"
    });
  }

  const { error } = await supabase
    .from("donations")
    .select("id")
    .limit(1);

  if (error) {
    return NextResponse.json({
      connected: false,
      error: "Database check failed"
    });
  }

  return NextResponse.json({
    connected: true,
    message: "Supabase connected successfully"
  });
}
