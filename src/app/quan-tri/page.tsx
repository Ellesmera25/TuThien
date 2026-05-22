import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getDashboardSummary } from "@/lib/data";
import { formatVnd } from "@/lib/format";
import {
    canAccessAdmin,
    getCurrentUser,
    getCurrentUserRole,
} from "@/lib/supabase/auth-server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
    title: "Quản trị",
    description: "Trang quản trị tối giản cho bộ phận điều phối.",
};

export const dynamic = "force-dynamic";

type RequestedRole = "project_owner" | "partner_org";

type RoleRequestRow = {
    id: string;
    user_id: string;
    requested_role: RequestedRole;
    status: "pending" | "owner_pending" | "approved" | "rejected";
    applicant_type: string | null;
    display_name: string;
    representative_name: string | null;
    representative_position: string | null;
    phone: string;
    contact_email: string | null;
    address: string | null;
    purpose: string;
    experience: string | null;
    support_type: string | null;
    website_url: string | null;
    proof_url: string | null;
    tax_code: string | null;
    note: string | null;
    rejection_reason: string | null;
    reviewed_by: string | null;
    reviewed_at: string | null;
    created_at: string;
    accepted_commitment?: boolean | null;
};

type RoleRequestWithProof = RoleRequestRow & {
    proofSignedUrl: string | null;
}; type PendingCampaignImage = {
    id: string;
    image_url: string;
    caption: string | null;
    sort_order: number;
    is_cover: boolean;
    signedUrl: string | null;
};
type PendingCampaignOwner = {
    id: string;
    full_name: string | null;
    role: string | null;
};
type PendingCampaignPhase = {
    id: string;
    title: string;
    description: string;
    target_amount: number;
    start_date: string | null;
    end_date: string | null;
    status: string;
    proof_url: string | null;
    signedProofUrl: string | null;
};

type PendingCampaignRow = {
    id: string;
    slug: string;
    title: string;
    summary: string;
    target_amount: number;
    raised_amount: number;
    status: "active" | "completed" | "paused";
    review_status: "pending" | "published" | "rejected";
    end_date: string;
    cover_tag: string;
    owner_id: string | null;
    created_at: string;
    images: PendingCampaignImage[];
    phases: PendingCampaignPhase[];
    owner: PendingCampaignOwner | null;
};
type SupportOfferRow = {
    id: string;
    campaign_id: string;
    partner_id: string;
    title: string;
    support_type: string;
    description: string;
    estimated_value: number | null;
    contact_name: string | null;
    contact_phone: string | null;
    contact_email: string | null;
    proof_url: string | null;
    status: "pending" | "approved" | "rejected";
    rejection_reason: string | null;
    created_at: string;
    campaign: {
        title: string | null;
        slug: string | null;
    } | null;
    partner: {
        full_name: string | null;
        role: string | null;
    } | null;
    proofSignedUrl: string | null;
};

async function assertAdmin() {
    const user = await getCurrentUser();

    if (!user) {
        redirect("/dang-nhap?next=/quan-tri");
    }

    const role = await getCurrentUserRole();

    if (!canAccessAdmin(role)) {
        redirect("/tai-khoan");
    }

    return user;
}

async function getPendingRoleRequests(): Promise<RoleRequestWithProof[]> {
    const supabase = getSupabaseServiceClient();

    if (!supabase) {
        return [];
    }

    const { data, error } = await supabase
        .from("role_requests")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: true });

    if (error || !data) {
        return [];
    }

    const requests = data as RoleRequestRow[];

    return Promise.all(
        requests.map(async (request) => {
            if (!request.proof_url) {
                return {
                    ...request,
                    proofSignedUrl: null,
                };
            }

            const { data: signedData } = await supabase.storage
                .from("role-proofs")
                .createSignedUrl(request.proof_url, 60 * 10);

            return {
                ...request,
                proofSignedUrl: signedData?.signedUrl ?? null,
            };
        }),
    );
}
async function getPendingCampaigns(): Promise<PendingCampaignRow[]> {
    const supabase = getSupabaseServiceClient();

    if (!supabase) {
        return [];
    }

    const { data: campaigns, error: campaignError } = await supabase
        .from("campaigns")
        .select(
            "id, slug, title, summary, target_amount, raised_amount, status, review_status, end_date, cover_tag, owner_id, created_at",
        )
        .eq("review_status", "pending")
        .order("created_at", { ascending: true });

    if (campaignError || !campaigns || campaigns.length === 0) {
        return [];
    }

    const campaignIds = campaigns.map((campaign) => campaign.id);

    const ownerIds = campaigns
        .map((campaign) => campaign.owner_id)
        .filter((ownerId): ownerId is string => Boolean(ownerId));

    const [{ data: imageRows }, { data: phaseRows }, { data: ownerRows }] =
        await Promise.all([
            supabase
                .from("campaign_images")
                .select("id, campaign_id, image_url, caption, sort_order, is_cover")
                .in("campaign_id", campaignIds)
                .order("sort_order", { ascending: true }),

            supabase
                .from("campaign_phases")
                .select(
                    "id, campaign_id, title, description, target_amount, start_date, end_date, status, proof_url, sort_order",
                )
                .in("campaign_id", campaignIds)
                .order("sort_order", { ascending: true }),

            ownerIds.length > 0
                ? supabase
                    .from("profiles")
                    .select("id, full_name, role")
                    .in("id", ownerIds)
                : Promise.resolve({ data: [] }),
        ]);

    const imagesByCampaign = new Map<string, PendingCampaignImage[]>();
    const phasesByCampaign = new Map<string, PendingCampaignPhase[]>();
    const ownerById = new Map<string, PendingCampaignOwner>();

    for (const owner of ownerRows ?? []) {
        ownerById.set(owner.id, {
            id: owner.id,
            full_name: owner.full_name,
            role: owner.role,
        });
    }
    for (const image of imageRows ?? []) {
        const { data: signedData } = await supabase.storage
            .from("campaign-assets")
            .createSignedUrl(image.image_url, 60 * 10);

        const list = imagesByCampaign.get(image.campaign_id) ?? [];

        list.push({
            id: image.id,
            image_url: image.image_url,
            caption: image.caption,
            sort_order: image.sort_order,
            is_cover: image.is_cover,
            signedUrl: signedData?.signedUrl ?? null,
        });

        imagesByCampaign.set(image.campaign_id, list);
    }

    for (const phase of phaseRows ?? []) {
        let signedProofUrl: string | null = null;

        if (phase.proof_url) {
            const { data: signedData } = await supabase.storage
                .from("campaign-assets")
                .createSignedUrl(phase.proof_url, 60 * 10);

            signedProofUrl = signedData?.signedUrl ?? null;
        }

        const list = phasesByCampaign.get(phase.campaign_id) ?? [];

        list.push({
            id: phase.id,
            title: phase.title,
            description: phase.description,
            target_amount: phase.target_amount,
            start_date: phase.start_date,
            end_date: phase.end_date,
            status: phase.status,
            proof_url: phase.proof_url,
            signedProofUrl,
        });

        phasesByCampaign.set(phase.campaign_id, list);
    }

    return campaigns.map((campaign) => ({
        ...campaign,
        images: imagesByCampaign.get(campaign.id) ?? [],
        phases: phasesByCampaign.get(campaign.id) ?? [],
        owner: campaign.owner_id ? ownerById.get(campaign.owner_id) ?? null : null,
    })) as PendingCampaignRow[];
}
async function getPendingSupportOffers(): Promise<SupportOfferRow[]> {
    const supabase = getSupabaseServiceClient();

    if (!supabase) {
        return [];
    }

    const { data: offers, error } = await supabase
        .from("support_offers")
        .select(
            `
            id,
            campaign_id,
            partner_id,
            title,
            support_type,
            description,
            estimated_value,
            contact_name,
            contact_phone,
            contact_email,
            proof_url,
            status,
            rejection_reason,
            created_at
            `,
        )
        .eq("status", "pending")
        .order("created_at", { ascending: true });

    if (error || !offers) {
        console.error("Không thể lấy đề xuất hỗ trợ:", error);
        return [];
    }

    const campaignIds = Array.from(
        new Set(offers.map((offer) => offer.campaign_id).filter(Boolean)),
    );

    const partnerIds = Array.from(
        new Set(offers.map((offer) => offer.partner_id).filter(Boolean)),
    );

    const { data: campaignRows } =
        campaignIds.length > 0
            ? await supabase
                .from("campaigns")
                .select("id, title, slug")
                .in("id", campaignIds)
            : { data: [] };

    const { data: partnerRows } =
        partnerIds.length > 0
            ? await supabase
                .from("profiles")
                .select("id, full_name, role")
                .in("id", partnerIds)
            : { data: [] };

    const campaignById = new Map<
        string,
        { title: string | null; slug: string | null }
    >();

    for (const campaign of campaignRows ?? []) {
        campaignById.set(campaign.id, {
            title: campaign.title,
            slug: campaign.slug,
        });
    }

    const partnerById = new Map<
        string,
        { full_name: string | null; role: string | null }
    >();

    for (const partner of partnerRows ?? []) {
        partnerById.set(partner.id, {
            full_name: partner.full_name,
            role: partner.role,
        });
    }

    return Promise.all(
        offers.map(async (offer) => {
            let proofSignedUrl: string | null = null;

            if (offer.proof_url) {
                const { data: signedData } = await supabase.storage
                    .from("campaign-assets")
                    .createSignedUrl(offer.proof_url, 60 * 10);

                proofSignedUrl = signedData?.signedUrl ?? null;
            }

            return {
                id: offer.id,
                campaign_id: offer.campaign_id,
                partner_id: offer.partner_id,
                title: offer.title,
                support_type: offer.support_type,
                description: offer.description,
                estimated_value: offer.estimated_value,
                contact_name: offer.contact_name,
                contact_phone: offer.contact_phone,
                contact_email: offer.contact_email,
                proof_url: offer.proof_url,
                status: offer.status,
                rejection_reason: offer.rejection_reason,
                created_at: offer.created_at,
                campaign: campaignById.get(offer.campaign_id) ?? null,
                partner: partnerById.get(offer.partner_id) ?? null,
                proofSignedUrl,
            };
        }),
    );

}
async function approveRoleRequest(formData: FormData) {
    "use server";

    const admin = await assertAdmin();
    const requestId = String(formData.get("requestId") ?? "");

    if (!requestId) {
        return;
    }

    const supabase = getSupabaseServiceClient();

    if (!supabase) {
        return;
    }

    const { data: request, error } = await supabase
        .from("role_requests")
        .select("id, user_id, requested_role, status")
        .eq("id", requestId)
        .eq("status", "pending")
        .maybeSingle();

    if (error || !request) {
        return;
    }

    const requestedRole = request.requested_role as RequestedRole;

    if (requestedRole !== "project_owner" && requestedRole !== "partner_org") {
        return;
    }

    const { error: profileError } = await supabase
        .from("profiles")
        .update({
            role: requestedRole,
        })
        .eq("id", request.user_id);

    if (profileError) {
        return;
    }

    await supabase
        .from("role_requests")
        .update({
            status: "approved",
            reviewed_by: admin.id,
            reviewed_at: new Date().toISOString(),
            rejection_reason: null,
        })
        .eq("id", requestId);

    revalidatePath("/quan-tri");
    redirect("/quan-tri");
}

async function rejectRoleRequest(formData: FormData) {
    "use server";

    const admin = await assertAdmin();
    const requestId = String(formData.get("requestId") ?? "");
    const rejectionReason = String(formData.get("rejectionReason") ?? "").trim();

    if (!requestId) {
        return;
    }

    const supabase = getSupabaseServiceClient();

    if (!supabase) {
        return;
    }

    await supabase
        .from("role_requests")
        .update({
            status: "rejected",
            reviewed_by: admin.id,
            reviewed_at: new Date().toISOString(),
            rejection_reason:
                rejectionReason || "Hồ sơ chưa đủ điều kiện để nâng vai trò.",
        })
        .eq("id", requestId)
        .eq("status", "pending");

    revalidatePath("/quan-tri");
    redirect("/quan-tri");
}
async function approveCampaign(formData: FormData) {
    "use server";

    const admin = await assertAdmin();
    const campaignId = String(formData.get("campaignId") ?? "");

    if (!campaignId) {
        return;
    }

    const supabase = getSupabaseServiceClient();

    if (!supabase) {
        return;
    }

    await supabase
        .from("campaigns")
        .update({
            review_status: "published",
            status: "active",
            reviewed_by: admin.id,
            reviewed_at: new Date().toISOString(),
            rejection_reason: null,
        })
        .eq("id", campaignId)
        .eq("review_status", "pending");

    revalidatePath("/quan-tri");
    revalidatePath("/");
    revalidatePath("/chien-dich");
    redirect("/quan-tri");
}

async function rejectCampaign(formData: FormData) {
    "use server";

    const admin = await assertAdmin();
    const campaignId = String(formData.get("campaignId") ?? "");
    const rejectionReason = String(formData.get("rejectionReason") ?? "").trim();

    if (!campaignId) {
        return;
    }

    const supabase = getSupabaseServiceClient();

    if (!supabase) {
        return;
    }

    await supabase
        .from("campaigns")
        .update({
            review_status: "rejected",
            status: "paused",
            reviewed_by: admin.id,
            reviewed_at: new Date().toISOString(),
            rejection_reason:
                rejectionReason || "Dự án chưa đủ điều kiện để hiển thị công khai.",
        })
        .eq("id", campaignId)
        .eq("review_status", "pending");

    revalidatePath("/quan-tri");
    redirect("/quan-tri");
}
async function approveSupportOffer(formData: FormData) {
    "use server";

    const admin = await assertAdmin();
    const offerId = String(formData.get("offerId") ?? "");

    if (!offerId) {
        return;
    }

    const supabase = getSupabaseServiceClient();

    if (!supabase) {
        return;
    }

    await supabase
        .from("support_offers")
        .update({
            status: "owner_pending",
            reviewed_by: admin.id,
            reviewed_at: new Date().toISOString(),
            rejection_reason: null,
        })
        .eq("id", offerId)
        .eq("status", "pending");

    revalidatePath("/quan-tri");
    revalidatePath("/tai-khoan");
    redirect("/quan-tri");
}

async function rejectSupportOffer(formData: FormData) {
    "use server";

    const admin = await assertAdmin();
    const offerId = String(formData.get("offerId") ?? "");
    const rejectionReason = String(formData.get("rejectionReason") ?? "").trim();

    if (!offerId) {
        return;
    }

    const supabase = getSupabaseServiceClient();

    if (!supabase) {
        return;
    }

    await supabase
        .from("support_offers")
        .update({
            status: "rejected",
            reviewed_by: admin.id,
            reviewed_at: new Date().toISOString(),
            rejection_reason:
                rejectionReason || "Đề xuất hỗ trợ chưa phù hợp để kết nối với dự án.",
        })
        .eq("id", offerId)
        .eq("status", "pending");

    revalidatePath("/quan-tri");
    redirect("/quan-tri");
}
export default async function AdminPage() {
    await assertAdmin();

    const [
        summary,
        pendingRoleRequests,
        pendingCampaigns,
        pendingSupportOffers,
    ] = await Promise.all([
        getDashboardSummary(),
        getPendingRoleRequests(),
        getPendingCampaigns(),
        getPendingSupportOffers(),
    ]);

    return (
        <div className="space-y-8 pb-8">
            <header className="neo-panel p-7 sm:p-8">
                <p className="neo-badge">Operations Console</p>
                <h1 className="mt-3 font-display text-4xl font-bold text-ink">
                    Bảng điều khiển quản trị
                </h1>
                <p className="mt-3 max-w-2xl text-sm text-slate-600">
                    Dashboard tổng quan cho đội vận hành để theo dõi dòng tiền, trạng thái
                    chiến dịch và xét duyệt các yêu cầu nâng vai trò.
                </p>
            </header>

            <section className="grid gap-4 md:grid-cols-3">
                <Metric
                    label="Tổng tiền tiếp nhận"
                    value={formatVnd(summary.totalRaised)}
                    tone="warm"
                />
                <Metric
                    label="Số chiến dịch"
                    value={`${summary.campaignCount}`}
                    tone="cool"
                />
                <Metric
                    label="Nhà hảo tâm"
                    value={`${summary.donorCount}`}
                    tone="mint"
                />
            </section>
            <section className="neo-panel p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="font-display text-2xl font-bold text-ink">
                            Dự án chờ duyệt
                        </h2>
                        <p className="mt-1 text-sm text-slate-600">
                            Kiểm tra các dự án do người tạo dự án gửi trước khi hiển thị công khai.
                        </p>
                    </div>

                    <span className="rounded-full bg-primary-fixed px-4 py-2 text-sm font-bold text-primary">
                        {pendingCampaigns.length} chờ duyệt
                    </span>
                </div>

                {pendingCampaigns.length === 0 ? (
                    <p className="mt-5 rounded-xl border border-slate-100 bg-white p-4 text-sm text-slate-600">
                        Hiện chưa có dự án nào đang chờ duyệt.
                    </p>
                ) : (
                    <div className="mt-5 grid gap-4">
                        {pendingCampaigns.map((campaign) => (
                            <article
                                key={campaign.id}
                                className="rounded-xl border border-slate-100 bg-white p-5 shadow-soft"
                            >
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
                                            {campaign.cover_tag}
                                        </p>
                                        <h3 className="mt-1 font-display text-xl font-bold text-ink">
                                            {campaign.title}
                                        </h3>

                                        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                                            <span>
                                                Người tạo:{" "}
                                                <strong className="text-ink">
                                                    {campaign.owner?.full_name || "Chưa có tên"}
                                                </strong>
                                            </span>

                                            <span className="rounded-full bg-surface-low px-2 py-0.5 text-xs font-bold text-slate-600">
                                                {formatRoleLabel(campaign.owner?.role)}
                                            </span>
                                        </div>

                                        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                                            {campaign.summary}
                                        </p>
                                    </div>

                                    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                                        Pending
                                    </span>
                                </div>

                                <div className="mt-4 grid gap-3 text-sm text-slate-700 md:grid-cols-3">
                                    <Info label="Mục tiêu" value={formatVnd(campaign.target_amount)} />
                                    <Info label="Đã huy động" value={formatVnd(campaign.raised_amount)} />
                                    <Info label="Ngày kết thúc" value={campaign.end_date} />
                                </div>
                                {campaign.images.length > 0 ? (
                                    <div className="mt-5">
                                        <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                                            Ảnh dự án
                                        </p>

                                        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                            {campaign.images.map((image) => (
                                                <a
                                                    key={image.id}
                                                    href={image.signedUrl ?? "#"}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="group overflow-hidden rounded-xl border border-slate-100 bg-slate-50"
                                                >
                                                    {image.signedUrl ? (
                                                        <img
                                                            src={image.signedUrl}
                                                            alt={image.caption ?? campaign.title}
                                                            className="h-36 w-full object-cover transition group-hover:scale-105"
                                                        />
                                                    ) : (
                                                        <div className="flex h-36 items-center justify-center text-sm text-slate-500">
                                                            Không mở được ảnh
                                                        </div>
                                                    )}

                                                    <div className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-600">
                                                        <span>Ảnh {image.sort_order}</span>
                                                        {image.is_cover ? (
                                                            <span className="rounded-full bg-primary-fixed px-2 py-0.5 text-primary">
                                                                Ảnh bìa
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <p className="mt-5 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                                        Dự án chưa có ảnh minh chứng.
                                    </p>
                                )}

                                {campaign.phases.length > 0 ? (
                                    <div className="mt-5 grid gap-3">
                                        <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                                            Giai đoạn hỗ trợ
                                        </p>

                                        {campaign.phases.map((phase, index) => (
                                            <div
                                                key={phase.id}
                                                className="rounded-xl border border-slate-100 bg-surface-low p-4"
                                            >
                                                <div className="flex flex-wrap items-start justify-between gap-3">
                                                    <div>
                                                        <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                                                            Giai đoạn {index + 1}
                                                        </p>
                                                        <h4 className="mt-1 font-display text-lg font-bold text-ink">
                                                            {phase.title}
                                                        </h4>
                                                    </div>

                                                    <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600">
                                                        {phase.status}
                                                    </span>
                                                </div>

                                                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                                                    {phase.description}
                                                </p>

                                                <div className="mt-4 grid gap-3 text-sm text-slate-700 md:grid-cols-3">
                                                    <Info
                                                        label="Mục tiêu giai đoạn"
                                                        value={formatVnd(phase.target_amount)}
                                                    />
                                                    <Info label="Ngày bắt đầu" value={phase.start_date} />
                                                    <Info label="Ngày kết thúc" value={phase.end_date} />
                                                </div>

                                                {phase.signedProofUrl ? (
                                                    <a
                                                        href={phase.signedProofUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="mt-4 inline-flex rounded-lg border border-primary px-4 py-2 text-sm font-bold text-primary transition hover:bg-primary hover:text-white"
                                                    >
                                                        Xem minh chứng giai đoạn
                                                    </a>
                                                ) : (
                                                    <p className="mt-4 text-sm font-semibold text-slate-500">
                                                        Chưa có minh chứng giai đoạn.
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="mt-5 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                                        Dự án chưa có giai đoạn hỗ trợ.
                                    </p>
                                )}

                                <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]">
                                    <form action={rejectCampaign} className="flex gap-2">
                                        <input type="hidden" name="campaignId" value={campaign.id} />
                                        <input
                                            name="rejectionReason"
                                            placeholder="Lý do từ chối..."
                                            className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                                        />
                                        <button
                                            type="submit"
                                            className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-700 transition hover:bg-red-100"
                                        >
                                            Từ chối
                                        </button>
                                    </form>

                                    <form action={approveCampaign}>
                                        <input type="hidden" name="campaignId" value={campaign.id} />
                                        <button
                                            type="submit"
                                            className="rounded-lg bg-primary px-5 py-2 text-sm font-bold text-white transition hover:bg-primary-container"
                                        >
                                            Duyệt dự án
                                        </button>
                                    </form>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>
            <section className="neo-panel p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="font-display text-2xl font-bold text-ink">
                            Đề xuất hỗ trợ chờ duyệt
                        </h2>
                        <p className="mt-1 text-sm text-slate-600">
                            Duyệt các đề xuất hỗ trợ do đơn vị đồng hành gửi cho dự án.
                        </p>
                    </div>

                    <span className="rounded-full bg-primary-fixed px-4 py-2 text-sm font-bold text-primary">
                        {pendingSupportOffers.length} chờ duyệt
                    </span>
                </div>

                {pendingSupportOffers.length === 0 ? (
                    <p className="mt-5 rounded-xl border border-slate-100 bg-white p-4 text-sm text-slate-600">
                        Hiện chưa có đề xuất hỗ trợ nào đang chờ duyệt.
                    </p>
                ) : (
                    <div className="mt-5 grid gap-4">
                        {pendingSupportOffers.map((offer) => (
                            <article
                                key={offer.id}
                                className="rounded-xl border border-slate-100 bg-white p-5 shadow-soft"
                            >
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
                                            {formatSupportTypeLabel(offer.support_type)}
                                        </p>

                                        <h3 className="mt-1 font-display text-xl font-bold text-ink">
                                            {offer.title}
                                        </h3>

                                        <p className="mt-2 text-sm text-slate-600">
                                            Dự án:{" "}
                                            <strong className="text-ink">
                                                {offer.campaign?.title ?? "Không xác định"}
                                            </strong>
                                        </p>

                                        <p className="mt-1 text-sm text-slate-600">
                                            Đơn vị gửi:{" "}
                                            <strong className="text-ink">
                                                {offer.partner?.full_name ?? "Chưa có tên"}
                                            </strong>
                                        </p>
                                    </div>

                                    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                                        Pending
                                    </span>
                                </div>

                                <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                                    {offer.description}
                                </p>

                                <div className="mt-4 grid gap-3 text-sm text-slate-700 md:grid-cols-3">
                                    <Info
                                        label="Giá trị ước tính"
                                        value={
                                            offer.estimated_value
                                                ? formatVnd(offer.estimated_value)
                                                : "Chưa cung cấp"
                                        }
                                    />
                                    <Info label="Người phụ trách" value={offer.contact_name} />
                                    <Info label="Số điện thoại" value={offer.contact_phone} />
                                    <Info label="Email liên hệ" value={offer.contact_email} />
                                </div>

                                <div className="mt-4">
                                    {offer.proofSignedUrl ? (
                                        <a
                                            href={offer.proofSignedUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex rounded-lg border border-primary px-4 py-2 text-sm font-bold text-primary transition hover:bg-primary hover:text-white"
                                        >
                                            Xem minh chứng hỗ trợ
                                        </a>
                                    ) : (
                                        <p className="text-sm font-semibold text-slate-500">
                                            Chưa có minh chứng đính kèm.
                                        </p>
                                    )}
                                </div>

                                <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]">
                                    <form action={rejectSupportOffer} className="flex gap-2">
                                        <input type="hidden" name="offerId" value={offer.id} />
                                        <input
                                            name="rejectionReason"
                                            placeholder="Lý do từ chối..."
                                            className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                                        />
                                        <button
                                            type="submit"
                                            className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-700 transition hover:bg-red-100"
                                        >
                                            Từ chối
                                        </button>
                                    </form>

                                    <form action={approveSupportOffer}>
                                        <input type="hidden" name="offerId" value={offer.id} />
                                        <button
                                            type="submit"
                                            className="rounded-lg bg-primary px-5 py-2 text-sm font-bold text-white transition hover:bg-primary-container"
                                        >
                                            Duyệt hỗ trợ
                                        </button>
                                    </form>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>
            <section className="neo-panel p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="font-display text-2xl font-bold text-ink">
                            Yêu cầu nâng vai trò
                        </h2>
                        <p className="mt-1 text-sm text-slate-600">
                            Duyệt hồ sơ đăng ký làm người tạo dự án hoặc đơn vị đồng hành.
                        </p>
                    </div>

                    <span className="rounded-full bg-primary-fixed px-4 py-2 text-sm font-bold text-primary">
                        {pendingRoleRequests.length} chờ duyệt
                    </span>
                </div>

                {pendingRoleRequests.length === 0 ? (
                    <p className="mt-5 rounded-xl border border-slate-100 bg-white p-4 text-sm text-slate-600">
                        Hiện chưa có yêu cầu nâng vai trò nào đang chờ duyệt.
                    </p>
                ) : (
                    <div className="mt-5 grid gap-4">
                        {pendingRoleRequests.map((request) => (
                            <article
                                key={request.id}
                                className="rounded-xl border border-slate-100 bg-white p-5 shadow-soft"
                            >
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
                                            {request.requested_role === "project_owner"
                                                ? "Người tạo dự án"
                                                : "Đơn vị đồng hành"}
                                        </p>
                                        <h3 className="mt-1 font-display text-xl font-bold text-ink">
                                            {request.display_name}
                                        </h3>
                                        <p className="mt-1 text-sm text-slate-600">
                                            Tư cách: {formatApplicantType(request.applicant_type)}
                                        </p>
                                    </div>

                                    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                                        Pending
                                    </span>
                                </div>

                                <div className="mt-4 grid gap-3 text-sm text-slate-700 md:grid-cols-2">
                                    <Info label="Số điện thoại" value={request.phone} />
                                    <Info label="Email liên hệ" value={request.contact_email} />
                                    <Info label="Địa chỉ / khu vực" value={request.address} />
                                    <Info label="Website / Fanpage" value={request.website_url} />

                                    {request.requested_role === "partner_org" ? (
                                        <>
                                            <Info
                                                label="Người đại diện"
                                                value={request.representative_name}
                                            />
                                            <Info
                                                label="Chức vụ"
                                                value={request.representative_position}
                                            />
                                            <Info
                                                label="Mã số thuế / đăng ký"
                                                value={request.tax_code}
                                            />
                                        </>
                                    ) : null}
                                </div>

                                <div className="mt-4 grid gap-3 text-sm text-slate-700">
                                    <Info
                                        label={
                                            request.requested_role === "partner_org"
                                                ? "Mục đích đồng hành"
                                                : "Mục đích tạo dự án"
                                        }
                                        value={request.purpose}
                                    />
                                    <Info
                                        label={
                                            request.requested_role === "partner_org"
                                                ? "Hình thức hỗ trợ"
                                                : "Kinh nghiệm hoạt động từ thiện"
                                        }
                                        value={
                                            request.requested_role === "partner_org"
                                                ? request.support_type
                                                : request.experience
                                        }
                                    />
                                    <Info label="Ghi chú" value={request.note} />
                                </div>

                                <div className="mt-4 flex flex-wrap items-center gap-3">
                                    {request.proofSignedUrl ? (
                                        <a
                                            href={request.proofSignedUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="rounded-lg border border-primary px-4 py-2 text-sm font-bold text-primary transition hover:bg-primary hover:text-white"
                                        >
                                            Xem tài liệu minh chứng
                                        </a>
                                    ) : (
                                        <span className="text-sm font-semibold text-red-600">
                                            Chưa có tài liệu minh chứng
                                        </span>
                                    )}

                                    {request.accepted_commitment ? (
                                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                                            Đã cam kết minh bạch
                                        </span>
                                    ) : null}
                                </div>

                                <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]">
                                    <form action={rejectRoleRequest} className="flex gap-2">
                                        <input type="hidden" name="requestId" value={request.id} />
                                        <input
                                            name="rejectionReason"
                                            placeholder="Lý do từ chối..."
                                            className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                                        />
                                        <button
                                            type="submit"
                                            className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-700 transition hover:bg-red-100"
                                        >
                                            Từ chối
                                        </button>
                                    </form>

                                    <form action={approveRoleRequest}>
                                        <input type="hidden" name="requestId" value={request.id} />
                                        <button
                                            type="submit"
                                            className="rounded-lg bg-primary px-5 py-2 text-sm font-bold text-white transition hover:bg-primary-container"
                                        >
                                            Duyệt vai trò
                                        </button>
                                    </form>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>

            
        </div>
    );
}

function Metric({
    label,
    value,
    tone,
}: {
    label: string;
    value: string;
    tone: "warm" | "cool" | "mint";
}) {
    const toneClass: Record<typeof tone, string> = {
        warm: "from-primary/10 to-accent/10",
        cool: "from-cool/15 to-haze/70",
        mint: "from-mint/18 to-white",
    };

    return (
        <article className={`neo-panel bg-gradient-to-br ${toneClass[tone]} p-5`}>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                {label}
            </p>
            <p className="mt-2 font-display text-2xl font-bold text-ink">{value}</p>
        </article>
    );
}

function Info({
    label,
    value,
}: {
    label: string;
    value?: null | string;
}) {
    return (
        <div>
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                {label}
            </p>
            <p className="mt-1 whitespace-pre-wrap break-words text-sm font-semibold text-slate-800">
                {value && value.trim() ? value : "Chưa cung cấp"}
            </p>
        </div>
    );
}

function formatApplicantType(value?: null | string) {
    switch (value) {
        case "individual":
            return "Cá nhân";
        case "volunteer_group":
            return "Nhóm thiện nguyện";
        case "organization":
            return "Tổ chức";
        case "business":
            return "Doanh nghiệp";
        default:
            return "Chưa xác định";
    }
} function formatRoleLabel(role?: string | null) {
    switch (role) {
        case "admin":
            return "Quản trị viên";
        case "project_owner":
            return "Người tạo dự án";
        case "partner_org":
            return "Đơn vị đồng hành";
        case "donor":
            return "Người ủng hộ";
        default:
            return "Chưa xác định";
    }
}
function formatSupportTypeLabel(value?: string | null) {
    switch (value) {
        case "financial":
            return "Tài chính";
        case "goods":
            return "Hàng hóa";
        case "volunteer":
            return "Nhân lực / tình nguyện viên";
        case "media":
            return "Truyền thông";
        case "location":
            return "Địa điểm / cơ sở vật chất";
        case "expertise":
            return "Chuyên môn";
        case "other":
            return "Khác";
        default:
            return "Chưa xác định";
    }
}