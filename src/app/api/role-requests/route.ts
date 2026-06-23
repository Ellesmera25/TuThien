import { NextResponse } from "next/server";

import { adminCacheTags } from "@/lib/cache-tags";
import { revalidateCacheTag } from "@/lib/cache-revalidation";
import { isSameOriginMutation } from "@/lib/http-security";
import { createSupabaseServerAuthClient } from "@/lib/supabase/auth-server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

type RequestedRole = "project_owner" | "partner_org";

const allowedRoles: RequestedRole[] = ["project_owner", "partner_org"];

function isValidUrl(value?: string | null) {
    if (!value) {
        return true;
    }

    try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
    } catch {
        return false;
    }
}

function isValidProofPath(value?: string | null) {
    if (!value) {
        return false;
    }

    const proofPath = value.trim();

    if (!proofPath) {
        return false;
    }

    if (proofPath.includes("..")) {
        return false;
    }

    if (proofPath.startsWith("/") || proofPath.startsWith("\\")) {
        return false;
    }

    return true;
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
            { error: "Bạn cần đăng nhập để gửi yêu cầu." },
            { status: 401 },
        );
    }

    const body = (await request.json().catch(() => null)) as
        | {
              requestedRole?: string;
              applicantType?: string;
              displayName?: string;
              representativeName?: string;
              representativePosition?: string;
              phone?: string;
              contactEmail?: string;
              address?: string;
              purpose?: string;
              experience?: string;
              supportType?: string;
              websiteUrl?: string;
              proofUrl?: string;
              taxCode?: string;
              payoutBankName?: string;
              payoutAccountNumber?: string;
              payoutAccountHolder?: string;
              note?: string;
              acceptedCommitment?: boolean;
          }
        | null;

    if (!body) {
        return NextResponse.json(
            { error: "Nội dung request không hợp lệ." },
            { status: 400 },
        );
    }

    if (!body.requestedRole || !allowedRoles.includes(body.requestedRole as RequestedRole)) {
        return NextResponse.json(
            { error: "Vai trò yêu cầu không hợp lệ." },
            { status: 400 },
        );
    }

    if (!body.displayName?.trim()) {
        return NextResponse.json(
            { error: "Vui lòng nhập tên cá nhân, nhóm hoặc tổ chức." },
            { status: 400 },
        );
    }

    if (!body.phone?.trim()) {
        return NextResponse.json(
            { error: "Vui lòng nhập số điện thoại liên hệ." },
            { status: 400 },
        );
    }

    if (!body.purpose?.trim()) {
        return NextResponse.json(
            { error: "Vui lòng nhập mục đích đăng ký." },
            { status: 400 },
        );
    }

    if (!body.acceptedCommitment) {
        return NextResponse.json(
            { error: "Vui lòng xác nhận cam kết minh bạch." },
            { status: 400 },
        );
    }

    if (
        body.requestedRole === "partner_org" &&
        (!body.payoutBankName?.trim() ||
            !body.payoutAccountNumber?.trim() ||
            !body.payoutAccountHolder?.trim())
    ) {
        return NextResponse.json(
            { error: "Vui lòng nhập đầy đủ tài khoản ngân hàng của đơn vị đồng hành." },
            { status: 400 },
        );
    }

    if (!isValidUrl(body.websiteUrl)) {
        return NextResponse.json(
            { error: "Website/Fanpage không hợp lệ." },
            { status: 400 },
        );
    }

    if (!isValidProofPath(body.proofUrl)) {
        return NextResponse.json(
            { error: "Tài liệu minh chứng không hợp lệ." },
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

    const { data: existingRequest } = await supabase
        .from("role_requests")
        .select("id, status")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

    if (existingRequest) {
        return NextResponse.json(
            { error: "Mỗi tài khoản chỉ được gửi yêu cầu vai trò một lần." },
            { status: 400 },
        );
    }

    const { error } = await supabase.from("role_requests").insert({
        user_id: user.id,
        requested_role: body.requestedRole,
        applicant_type: body.applicantType ?? null,
        display_name: body.displayName.trim(),
        representative_name: body.representativeName?.trim() || null,
        representative_position: body.representativePosition?.trim() || null,
        phone: body.phone.trim(),
        contact_email: body.contactEmail?.trim() || user.email || null,
        address: body.address?.trim() || null,
        purpose: body.purpose.trim(),
        experience: body.experience?.trim() || null,
        support_type: body.supportType?.trim() || null,
        website_url: body.websiteUrl?.trim() || null,
        proof_url: body.proofUrl?.trim() || null,
        tax_code: body.taxCode?.trim() || null,
        payout_bank_name:
            body.requestedRole === "partner_org"
                ? body.payoutBankName?.trim() || null
                : null,
        payout_account_number:
            body.requestedRole === "partner_org"
                ? body.payoutAccountNumber?.trim() || null
                : null,
        payout_account_holder:
            body.requestedRole === "partner_org"
                ? body.payoutAccountHolder?.trim() || null
                : null,
        note: body.note?.trim() || null,
        accepted_commitment: true,
        status: "pending",
    });

    if (error) {
        console.error("Create role request error:", error);

        return NextResponse.json(
            { error: "Không thể gửi yêu cầu. Vui lòng thử lại." },
            { status: 500 },
        );
    }

    revalidateCacheTag(adminCacheTags.roleRequests);

    return NextResponse.json({
        message: "Đã gửi yêu cầu nâng vai trò. Vui lòng chờ admin duyệt.",
    });
}
