import { NextResponse } from "next/server";

import { createSupabaseServerAuthClient } from "@/lib/supabase/auth-server";
import { isCampaignExpired } from "@/lib/campaign-expiry";
import { isSameOriginMutation } from "@/lib/http-security";
import {
  buildSepayQrImageUrl,
  buildSepayTransferContent,
  createSepayPaymentReference,
  getSepayConfig,
} from "@/lib/sepay";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import type { DonationPayload } from "@/lib/types";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPayload(
  payload: Partial<DonationPayload>,
): payload is DonationPayload {
  return (
    typeof payload.donorName === "string" &&
    payload.donorName.trim() !== "" &&
    typeof payload.email === "string" &&
    isValidEmail(payload.email) &&
    typeof payload.amount === "number" &&
    payload.amount >= 10_000 &&
    payload.paymentMethod === "sepay_qr"
  );
}

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) {
    return NextResponse.json(
      { error: "Nguồn request không hợp lệ." },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => null)) as
    | Partial<DonationPayload>
    | null;

  if (!body || !isValidPayload(body)) {
    return NextResponse.json(
      { error: "Dữ liệu quyên góp không hợp lệ." },
      { status: 400 },
    );
  }

  const supabase = getSupabaseServiceClient();
  const { client: authClient } = await createSupabaseServerAuthClient();
  const sepayConfig = getSepayConfig();

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
    const paymentReference = createSepayPaymentReference();
    const qrContent = buildSepayTransferContent(paymentReference);

    return NextResponse.json({
      id: `demo_${Date.now()}`,
      demo: true,
      paymentReference,
      qrContent,
      qrImageUrl: buildSepayQrImageUrl(qrContent, body.amount, sepayConfig),
      instruction:
        "Quét mã QR và giữ nguyên nội dung chuyển khoản để Sepay xác minh tự động.",
    });
  }

  const paymentReference = createSepayPaymentReference();
  const qrContent = buildSepayTransferContent(paymentReference);
  const qrImageUrl = buildSepayQrImageUrl(qrContent, body.amount, sepayConfig);

  let campaignId: string | null = null;

  if (body.campaignSlug) {
    const { data: campaign } = await supabase
      .from("campaigns")
      .select("id, end_date")
      .eq("slug", body.campaignSlug)
      .eq("review_status", "published")
      .eq("status", "active")
      .maybeSingle();

    if (!campaign) {
      return NextResponse.json(
        { error: "Dự án chưa mở quyên góp hoặc không tồn tại." },
        { status: 400 },
      );
    }

    if (isCampaignExpired(campaign.end_date)) {
      return NextResponse.json(
        { error: "Dự án đã hết hạn nhận quyên góp." },
        { status: 400 },
      );
    }

    campaignId = campaign.id;
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
      payment_provider: "sepay",
      payment_reference: paymentReference,
      payment_content: qrContent,
      payment_qr_url: qrImageUrl,
      message: body.message ?? null,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Không thể tạo phiếu quyên góp. Vui lòng thử lại." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    id: data.id,
    paymentReference,
    qrContent,
    qrImageUrl,
    instruction:
      "Quét mã QR trong ứng dụng ngân hàng và giữ nguyên nội dung chuyển khoản để Sepay xác minh tự động.",
  });
}
