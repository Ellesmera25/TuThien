import { NextResponse } from "next/server";

import {
  createSupabaseServerAuthClient,
  getCurrentUserRole,
} from "@/lib/supabase/auth-server";
import { adminCacheTags } from "@/lib/cache-tags";
import { revalidateCacheTags } from "@/lib/cache-revalidation";
import { isSameOriginMutation } from "@/lib/http-security";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

const allowedSupportTypes = [
  "implementation",
  "financial",
  "goods",
  "volunteer",
  "media",
  "location",
  "expertise",
  "other",
];

function isSafeStoragePath(value?: string | null) {
  if (!value) {
    return true;
  }

  const path = value.trim();

  if (!path) {
    return true;
  }

  return !path.includes("..") && !path.startsWith("/") && !path.startsWith("\\");
}

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) {
    return NextResponse.json(
      { error: "Nguồn request không hợp lệ." },
      { status: 403 },
    );
  }

  const { client: authClient } = await createSupabaseServerAuthClient();

  if (!authClient) {
    return NextResponse.json(
      { error: "Chưa cấu hình Supabase Auth." },
      { status: 503 },
    );
  }

  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Bạn cần đăng nhập để đăng ký đồng hành." },
      { status: 401 },
    );
  }

  const role = await getCurrentUserRole();

  if (role !== "partner_org") {
    return NextResponse.json(
      {
        error:
          "Chỉ đơn vị đồng hành mới được đăng ký thực hiện dự án.",
      },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => null)) as
    | {
        campaignId?: string;
        disbursementRoundId?: string;
        title?: string;
        supportType?: string;
        description?: string;
        estimatedValue?: number | null;
        contactName?: string;
        contactPhone?: string;
        contactEmail?: string;
        proofUrl?: string | null;
      }
    | null;

  if (!body) {
    return NextResponse.json(
      { error: "Nội dung request không hợp lệ." },
      { status: 400 },
    );
  }

  const campaignId = body.campaignId?.trim() ?? "";
  const disbursementRoundId = body.disbursementRoundId?.trim() ?? "";
  const title = body.title?.trim() ?? "";
  const supportType = body.supportType?.trim() || "implementation";
  const description = body.description?.trim() ?? "";
  const estimatedValue =
    body.estimatedValue === null || body.estimatedValue === undefined
      ? null
      : Number(body.estimatedValue);
  const contactName = body.contactName?.trim() ?? "";
  const contactPhone = body.contactPhone?.trim() ?? "";
  const contactEmail = body.contactEmail?.trim() || user.email || "";
  const proofUrl = body.proofUrl?.trim() || null;

  if (!campaignId) {
    return NextResponse.json(
      { error: "Vui lòng chọn dự án muốn đồng hành." },
      { status: 400 },
    );
  }

  if (!disbursementRoundId) {
    return NextResponse.json(
      { error: "Vui lòng chọn phạm vi đồng hành." },
      { status: 400 },
    );
  }

  if (!title) {
    return NextResponse.json(
      { error: "Vui lòng nhập tên phương án thực hiện." },
      { status: 400 },
    );
  }

  if (!allowedSupportTypes.includes(supportType)) {
    return NextResponse.json(
      { error: "Loại đăng ký đồng hành không hợp lệ." },
      { status: 400 },
    );
  }

  if (!description) {
    return NextResponse.json(
      { error: "Vui lòng mô tả phương án đồng hành thực hiện." },
      { status: 400 },
    );
  }

  if (
    estimatedValue !== null &&
    (!Number.isFinite(estimatedValue) || estimatedValue < 0)
  ) {
    return NextResponse.json(
      { error: "Ngân sách thực hiện dự kiến không hợp lệ." },
      { status: 400 },
    );
  }

  if (!isSafeStoragePath(proofUrl)) {
    return NextResponse.json(
      { error: "Đường dẫn minh chứng không hợp lệ." },
      { status: 400 },
    );
  }

  const supabase = getSupabaseServiceClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Chưa cấu hình Supabase service role key." },
      { status: 503 },
    );
  }

  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .select("id, review_status, status, owner_id")
    .eq("id", campaignId)
    .eq("review_status", "published")
    .in("status", ["active", "paused"])
    .maybeSingle();

  if (campaignError || !campaign) {
    return NextResponse.json(
      {
        error:
          "Dự án không tồn tại hoặc chưa được mở nhận đồng hành.",
      },
      { status: 400 },
    );
  }

  if (campaign.owner_id === user.id) {
    return NextResponse.json(
      {
        error:
          "Bạn không thể gửi đề xuất đồng hành cho dự án của chính mình.",
      },
      { status: 400 },
    );
  }

  const { data: partnerProfile, error: partnerProfileError } = await supabase
    .from("profiles")
    .select("payout_bank_name, payout_account_number, payout_account_holder")
    .eq("id", user.id)
    .maybeSingle();

  if (
    partnerProfileError ||
    !partnerProfile?.payout_bank_name?.trim() ||
    !partnerProfile?.payout_account_number?.trim() ||
    !partnerProfile?.payout_account_holder?.trim()
  ) {
    return NextResponse.json(
      {
        error:
          "Hồ sơ đơn vị đồng hành chưa có tài khoản ngân hàng nhận giải ngân. Vui lòng đăng ký vai trò đơn vị đồng hành với đầy đủ thông tin ngân hàng hoặc liên hệ admin cập nhật.",
      },
      { status: 400 },
    );
  }

  const { data: round, error: roundError } = await supabase
    .from("disbursement_rounds")
    .select("id")
    .eq("id", disbursementRoundId)
    .eq("campaign_id", campaignId)
    .maybeSingle();

  if (roundError || !round) {
    return NextResponse.json(
      { error: "Phạm vi đồng hành không tồn tại trong dự án đã chọn." },
      { status: 400 },
    );
  }

  const { data: lockedOffer } = await supabase
    .from("support_offers")
    .select("id")
    .eq("disbursement_round_id", disbursementRoundId)
    .in("status", ["owner_pending", "approved"])
    .maybeSingle();

  if (lockedOffer) {
    return NextResponse.json(
      {
        error:
          "Phạm vi này đã có đơn vị đồng hành được chủ dự án chấp thuận.",
      },
      { status: 409 },
    );
  }

  const { data: existingOffer } = await supabase
    .from("support_offers")
    .select("id")
    .eq("disbursement_round_id", disbursementRoundId)
    .eq("partner_id", user.id)
    .in("status", ["pending", "owner_pending", "approved"])
    .maybeSingle();

  if (existingOffer) {
    return NextResponse.json(
      { error: "Bạn đã gửi đăng ký đồng hành cho phạm vi này." },
      { status: 409 },
    );
  }

  const { error } = await supabase.from("support_offers").insert({
    campaign_id: campaignId,
    disbursement_round_id: disbursementRoundId,
    partner_id: user.id,
    title,
    support_type: supportType,
    description,
    estimated_value: estimatedValue === null ? null : Math.round(estimatedValue),
    contact_name: contactName || null,
    contact_phone: contactPhone || null,
    contact_email: contactEmail || null,
    payout_bank_name: partnerProfile.payout_bank_name.trim(),
    payout_account_number: partnerProfile.payout_account_number.trim(),
    payout_account_holder: partnerProfile.payout_account_holder.trim(),
    proof_url: proofUrl,
    status: "pending",
  });

  if (error) {
    console.error("Create support offer error:", error);

    return NextResponse.json(
      { error: "Không thể gửi đăng ký đồng hành. Vui lòng thử lại." },
      { status: 500 },
    );
  }

  revalidateCacheTags([
    adminCacheTags.disbursements,
    adminCacheTags.supportOffers,
  ]);

  return NextResponse.json({
    message:
      "Đã gửi đăng ký đồng hành đến người tạo dự án. Admin có thể theo dõi yêu cầu này.",
  });
}
