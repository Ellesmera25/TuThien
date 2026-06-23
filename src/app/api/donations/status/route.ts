import { NextResponse } from "next/server";

import { noStoreHeaders } from "@/lib/cache-revalidation";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const paymentReference = url.searchParams.get("paymentReference");

  if (!paymentReference) {
    return NextResponse.json(
      { error: "Missing paymentReference" },
      { status: 400, headers: noStoreHeaders },
    );
  }

  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 500, headers: noStoreHeaders },
    );
  }

  const { data, error } = await supabase
    .from("donations")
    .select("id, status, confirmed_at")
    .eq("payment_reference", paymentReference)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: "DB error" },
      { status: 500, headers: noStoreHeaders },
    );
  }

  if (!data) {
    return NextResponse.json({ status: "not_found" }, { headers: noStoreHeaders });
  }

  return NextResponse.json(
    { id: data.id, status: data.status, confirmedAt: data.confirmed_at },
    { headers: noStoreHeaders },
  );
}
