import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = getSupabaseServiceClient();

  if (!supabase) {
    return NextResponse.json({
      connected: false,
      reason: "Supabase client is null (ENV missing)"
    });
  }

  const { data, error } = await supabase
    .from("donations")
    .select("id")
    .limit(1);

  if (error) {
    return NextResponse.json({
      connected: false,
      error: error.message
    });
  }

  return NextResponse.json({
    connected: true,
    message: "Supabase connected successfully"
  });
}