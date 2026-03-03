import { NextResponse } from "next/server";

import { createSupabaseServerAuthClient } from "@/lib/supabase/auth-server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import type { DonationPayload } from "@/lib/types";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPayload(payload: Partial<DonationPayload>): payload is DonationPayload {
  if (typeof payload.donorName !== "string" || payload.donorName.trim() === "") {
    return false;
  }

  if (typeof payload.email !== "string" || !isValidEmail(payload.email)) {
    return false;
  }

  if (typeof payload.amount !== "number" || payload.amount < 10_000) {
    return false;
  }

  return (
    payload.paymentMethod === "bank_transfer" ||
    payload.paymentMethod === "momo" ||
    payload.paymentMethod === "zalo_pay"
  );
}

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<DonationPayload>;

  if (!isValidPayload(body)) {
    return NextResponse.json({ error: "Du lieu quyen gop khong hop le." }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient();
  const { client: authClient } = await createSupabaseServerAuthClient();

  let authUserId: string | null = null;
  let authUserEmail: string | null = null;

  if (authClient) {
    const {
      data: { user },
    } = await authClient.auth.getUser();
    authUserId = user?.id ?? null;
    authUserEmail = user?.email ?? null;
  }

  if (!supabase) {
    return NextResponse.json({
      id: `demo_${Date.now()}`,
      demo: true,
    });
  }

  let campaignId: string | null = null;

  if (body.campaignSlug) {
    const { data: campaign } = await supabase
      .from("campaigns")
      .select("id")
      .eq("slug", body.campaignSlug)
      .maybeSingle();

    campaignId = campaign?.id ?? null;
  }

  const { data, error } = await supabase
    .from("donations")
    .insert({
      user_id: authUserId,
      donor_name: body.donorName,
      email: authUserEmail ?? body.email,
      amount: body.amount,
      campaign_id: campaignId,
      campaign_slug: body.campaignSlug ?? null,
      payment_method: body.paymentMethod,
      message: body.message ?? null,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Khong the tao phieu quyen gop. Vui long thu lai." },
      { status: 500 },
    );
  }

  return NextResponse.json({ id: data.id });
}
