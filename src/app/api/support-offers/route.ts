import { NextResponse } from "next/server";

import {
    createSupabaseServerAuthClient,
    getCurrentUserRole,
} from "@/lib/supabase/auth-server";
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

    if (path.includes("..")) {
        return false;
    }

    if (path.startsWith("/") || path.startsWith("\\")) {
        return false;
    }

    return true;
}

export async function POST(request: Request) {
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
            { error: "Chỉ đơn vị đồng hành mới được đăng ký thực hiện giai đoạn." },
            { status: 403 },
        );
    }

    const body = (await request.json()) as {
        campaignId?: string;
        phaseId?: string;
        title?: string;
        supportType?: string;
        description?: string;
        estimatedValue?: number | null;
        contactName?: string;
        contactPhone?: string;
        contactEmail?: string;
        proofUrl?: string | null;
    };

    const campaignId = body.campaignId?.trim() ?? "";
    const phaseId = body.phaseId?.trim() ?? "";
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

    if (!phaseId) {
        return NextResponse.json(
            { error: "Vui lòng chọn giai đoạn muốn đồng hành." },
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
            { error: "Vui lòng mô tả phương án thực hiện giai đoạn." },
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
            { error: "Dự án không tồn tại hoặc chưa được mở nhận hỗ trợ." },
            { status: 400 },
        );
    }

    if (campaign.owner_id === user.id) {
        return NextResponse.json(
            { error: "Bạn không thể gửi đề xuất đồng hành cho dự án của chính mình." },
            { status: 400 },
        );
    }

    const { data: phase, error: phaseError } = await supabase
        .from("campaign_phases")
        .select("id")
        .eq("id", phaseId)
        .eq("campaign_id", campaignId)
        .maybeSingle();

    if (phaseError || !phase) {
        return NextResponse.json(
            { error: "Giai đoạn không tồn tại trong dự án đã chọn." },
            { status: 400 },
        );
    }

    const { data: approvedOffer } = await supabase
        .from("support_offers")
        .select("id")
        .eq("phase_id", phaseId)
        .eq("status", "approved")
        .maybeSingle();

    if (approvedOffer) {
        return NextResponse.json(
            { error: "Giai đoạn này đã có đơn vị đồng hành được duyệt." },
            { status: 409 },
        );
    }

    const { data: existingOffer } = await supabase
        .from("support_offers")
        .select("id")
        .eq("phase_id", phaseId)
        .eq("partner_id", user.id)
        .in("status", ["pending", "owner_pending", "approved"])
        .maybeSingle();

    if (existingOffer) {
        return NextResponse.json(
            { error: "Bạn đã gửi yêu cầu đồng hành cho giai đoạn này." },
            { status: 409 },
        );
    }

    const { error } = await supabase.from("support_offers").insert({
        campaign_id: campaignId,
        phase_id: phaseId,
        partner_id: user.id,
        title,
        support_type: supportType,
        description,
        estimated_value:
            estimatedValue === null ? null : Math.round(estimatedValue),
        contact_name: contactName || null,
        contact_phone: contactPhone || null,
        contact_email: contactEmail || null,
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

    return NextResponse.json({
        message:
            "Đã gửi đăng ký đồng hành đến người tạo dự án. Admin có thể theo dõi yêu cầu này.",
    });
}
