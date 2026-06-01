import { NextResponse } from "next/server";

import {
    getCurrentUserRole,
    createSupabaseServerAuthClient,
} from "@/lib/supabase/auth-server";
import { isSameOriginMutation } from "@/lib/http-security";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

function createSlug(value: string) {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/đ/g, "d")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60);
}

function isSafeStoragePath(value?: string | null) {
    if (!value) {
        return false;
    }

    const path = value.trim();

    if (!path) {
        return false;
    }

    if (path.includes("..")) {
        return false;
    }

    if (path.startsWith("/") || path.startsWith("\\")) {
        return false;
    }

    return true;
}

type CampaignImagePayload = {
    imageUrl?: string;
    caption?: string | null;
    sortOrder?: number;
    isCover?: boolean;
};

type CampaignPhasePayload = {
    title?: string;
    description?: string;
    startDate?: string | null;
    endDate?: string | null;
    proofUrl?: string | null;
};

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
            { error: "Bạn cần đăng nhập để tạo dự án." },
            { status: 401 },
        );
    }

    const role = await getCurrentUserRole();

    if (role !== "project_owner") {
        return NextResponse.json(
            { error: "Chỉ người tạo dự án mới được gửi dự án." },
            { status: 403 },
        );
    }

    const body = (await request.json().catch(() => null)) as
        | {
              title?: string;
              summary?: string;
              targetAmount?: number;
              endDate?: string;
              coverTag?: string;
              images?: CampaignImagePayload[];
              phase?: CampaignPhasePayload;
              phases?: CampaignPhasePayload[];
          }
        | null;

    if (!body) {
        return NextResponse.json(
            { error: "Nội dung request không hợp lệ." },
            { status: 400 },
        );
    }

    const title = body.title?.trim() ?? "";
    const summary = body.summary?.trim() ?? "";
    const targetAmount = Number(body.targetAmount ?? 0);
    const endDate = body.endDate?.trim() ?? "";
    const coverTag = body.coverTag?.trim() || "Đang cập nhật";
    const images = body.images ?? [];
    const phases = body.phases?.length ? body.phases : body.phase ? [body.phase] : [];

    if (!title) {
        return NextResponse.json({ error: "Vui lòng nhập tên dự án." }, { status: 400 });
    }

    if (!summary) {
        return NextResponse.json({ error: "Vui lòng nhập mô tả ngắn." }, { status: 400 });
    }

    if (!Number.isFinite(targetAmount) || targetAmount < 1000) {
        return NextResponse.json(
            { error: "Mục tiêu quyên góp phải từ 1.000 VNĐ trở lên." },
            { status: 400 },
        );
    }

    if (!endDate) {
        return NextResponse.json({ error: "Vui lòng chọn ngày kết thúc." }, { status: 400 });
    }

    if (images.length === 0) {
        return NextResponse.json(
            { error: "Vui lòng tải lên ít nhất 1 ảnh dự án." },
            { status: 400 },
        );
    }

    if (images.length > 8) {
        return NextResponse.json(
            { error: "Mỗi dự án chỉ được gửi tối đa 8 ảnh." },
            { status: 400 },
        );
    }

    const invalidImage = images.find((image) => !isSafeStoragePath(image.imageUrl));

    if (invalidImage) {
        return NextResponse.json(
            { error: "Đường dẫn ảnh dự án không hợp lệ." },
            { status: 400 },
        );
    }

    if (phases.length === 0) {
        return NextResponse.json(
            { error: "Mỗi chiến dịch cần ít nhất 1 giai đoạn nội dung." },
            { status: 400 },
        );
    }

    const invalidPhaseIndex = phases.findIndex(
        (phase) => !phase.title?.trim() || !phase.description?.trim(),
    );

    if (invalidPhaseIndex >= 0) {
        return NextResponse.json(
            { error: `Vui lòng nhập đủ tên và mô tả cho giai đoạn ${invalidPhaseIndex + 1}.` },
            { status: 400 },
        );
    }

    const normalizedPhases = phases.map((phase) => ({
        title: phase.title?.trim() ?? "",
        description: phase.description?.trim() ?? "",
        targetAmount: 0,
        startDate: phase.startDate || null,
        endDate: phase.endDate || null,
        proofUrl: phase.proofUrl?.trim() || null,
    }));

    if (
        normalizedPhases.some(
            (phase) => phase.proofUrl && !isSafeStoragePath(phase.proofUrl),
        )
    ) {
        return NextResponse.json(
            { error: "Đường dẫn minh chứng giai đoạn không hợp lệ." },
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

    const slugBase = createSlug(title) || "du-an";
    const slug = `${slugBase}-${Date.now()}`;

    const { data: campaign, error: campaignError } = await supabase
        .from("campaigns")
        .insert({
            slug,
            title,
            summary,
            target_amount: Math.round(targetAmount),
            raised_amount: 0,
            status: "paused",
            end_date: endDate,
            cover_tag: coverTag,
            owner_id: user.id,
            review_status: "pending",
        })
        .select("id")
        .single();

    if (campaignError || !campaign) {
        console.error("Create campaign error:", campaignError);

        return NextResponse.json(
            { error: "Không thể tạo dự án. Vui lòng thử lại." },
            { status: 500 },
        );
    }

    const campaignId = campaign.id as string;

    const imageRows = images.map((image, index) => ({
        campaign_id: campaignId,
        image_url: image.imageUrl?.trim(),
        caption: image.caption?.trim() || null,
        sort_order:
            typeof image.sortOrder === "number" && image.sortOrder > 0
                ? image.sortOrder
                : index + 1,
        is_cover: index === 0 || image.isCover === true,
    }));

    const { error: imageError } = await supabase
        .from("campaign_images")
        .insert(imageRows);

    if (imageError) {
        console.error("Create campaign images error:", imageError);

        return NextResponse.json(
            { error: "Không thể lưu ảnh dự án. Vui lòng thử lại." },
            { status: 500 },
        );
    }

    const phaseRows = normalizedPhases.map((phase, index) => ({
        campaign_id: campaignId,
        title: phase.title,
        description: phase.description,
        target_amount: Math.round(phase.targetAmount),
        start_date: phase.startDate,
        end_date: phase.endDate,
        status: "planned",
        proof_url: phase.proofUrl,
        sort_order: index + 1,
    }));

    const { error: phaseError } = await supabase
        .from("campaign_phases")
        .insert(phaseRows);

    if (phaseError) {
        console.error("Create campaign phase error:", phaseError);

        return NextResponse.json(
            { error: "Không thể lưu giai đoạn dự án. Vui lòng thử lại." },
            { status: 500 },
        );
    }

    return NextResponse.json({
        message: "Đã gửi dự án. Vui lòng chờ admin duyệt.",
        campaignId,
        slug,
    });
}
