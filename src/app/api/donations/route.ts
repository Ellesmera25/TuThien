import { NextResponse } from "next/server";

import { createSupabaseServerAuthClient } from "@/lib/supabase/auth-server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import type { DonationPayload } from "@/lib/types";
import {
  buildSepayQrImageUrl,
  buildSepayTransferContent,
  createSepayPaymentReference,
  getSepayConfig,
} from "@/lib/sepay";
import {
  createBlockchainRecord,
  getGenesisBlockHash,
} from "@/lib/blockchain";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPayload(
  payload: Partial<DonationPayload>,
): payload is DonationPayload {
  if (
    typeof payload.donorName !== "string" ||
    payload.donorName.trim() === ""
  ) {
    return false;
  }

  if (typeof payload.email !== "string" || !isValidEmail(payload.email)) {
    return false;
  }

  if (typeof payload.amount !== "number" || payload.amount < 10_000) {
    return false;
  }

  return (
    payload.paymentMethod === "sepay_qr"
  );
}

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<DonationPayload>;

  if (!isValidPayload(body)) {
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

    const blockchainRecord = createBlockchainRecord(
      paymentReference,
      body.amount,
      body.donorName,
      body.email,
      getGenesisBlockHash(),
    );

    return NextResponse.json({
      id: `demo_${Date.now()}`,
      demo: true,
      paymentReference,
      qrContent,
      qrImageUrl: buildSepayQrImageUrl(qrContent, body.amount, sepayConfig),
      blockchainHash: blockchainRecord.hash,
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
      .select("id")
      .eq("slug", body.campaignSlug)
      .maybeSingle();

    campaignId = campaign?.id ?? null;
  }

  // Get the last blockchain hash to link this new donation
  let previousBlockchainHash = getGenesisBlockHash();
  const { data: lastDonation } = await supabase
    .from("donations")
    .select("blockchain_hash")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastDonation?.blockchain_hash) {
    previousBlockchainHash = lastDonation.blockchain_hash;
  }

  // Create blockchain record for donation with previous hash linkage
  const blockchainRecord = createBlockchainRecord(
    paymentReference,
    body.amount,
    body.donorName,
    authUserEmail ?? body.email,
    previousBlockchainHash,
  );

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
      blockchain_hash: blockchainRecord.hash,
      message: body.message ?? null,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) {
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
    blockchainHash: blockchainRecord.hash,
    instruction:
      "Quét mã QR trong ứng dụng ngân hàng và giữ nguyên nội dung chuyển khoản để Sepay xác minh tự động.",
  });
}
