import { NextResponse } from "next/server";

import {
    createSupabaseServerAuthClient,
    getCurrentUserRole,
} from "@/lib/supabase/auth-server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

const allowedSupportTypes = [
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
            { error: "Bạn cần đăng nhập để gửi đề xuất hỗ trợ." },
            { status: 401 },
        );
    }

    const role = await getCurrentUserRole();

    if (role !== "partner_org") {
        return NextResponse.json(
            { error: "Chỉ đơn vị đồng hành mới được gửi đề xuất hỗ trợ." },
            { status: 403 },
        );
    }

    const body = (await request.json()) as {
        campaignId?: string;
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
    const title = body.title?.trim() ?? "";
    const supportType = body.supportType?.trim() ?? "";
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
            { error: "Vui lòng chọn dự án muốn hỗ trợ." },
            { status: 400 },
        );
    }

    if (!title) {
        return NextResponse.json(
            { error: "Vui lòng nhập tiêu đề đề xuất." },
            { status: 400 },
        );
    }

    if (!allowedSupportTypes.includes(supportType)) {
        return NextResponse.json(
            { error: "Hình thức hỗ trợ không hợp lệ." },
            { status: 400 },
        );
    }

    if (!description) {
        return NextResponse.json(
            { error: "Vui lòng mô tả nội dung hỗ trợ." },
            { status: 400 },
        );
    }

    if (
        estimatedValue !== null &&
        (!Number.isFinite(estimatedValue) || estimatedValue < 0)
    ) {
        return NextResponse.json(
            { error: "Giá trị ước tính không hợp lệ." },
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
        .select("id, review_status, status")
        .eq("id", campaignId)
        .eq("review_status", "published")
        .eq("status", "active")
        .maybeSingle();

    if (campaignError || !campaign) {
        return NextResponse.json(
            { error: "Dự án không tồn tại hoặc chưa được mở nhận hỗ trợ." },
            { status: 400 },
        );
    }

    const { error } = await supabase.from("support_offers").insert({
        campaign_id: campaignId,
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
            { error: "Không thể gửi đề xuất hỗ trợ. Vui lòng thử lại." },
            { status: 500 },
        );
    }

    return NextResponse.json({
        message: "Đã gửi đề xuất hỗ trợ. Vui lòng chờ admin xem xét.",
    });
}