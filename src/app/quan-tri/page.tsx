import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
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
type DisbursementRoundStatus =
    | "locked"
    | "open"
    | "requested"
    | "disbursed"
    | "completed"
    | "needs_admin_review";
type DisbursementProofStatus = "pending" | "approved" | "overdue";

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

type AdminCampaignRow = {
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
    owner: PendingCampaignOwner | null;
    ownerPendingOfferCount: number;
};
type SupportOfferRow = {
    id: string;
    campaign_id: string;
    phase_id: string | null;
    disbursement_round_id: string | null;
    partner_id: string;
    title: string;
    support_type: string;
    description: string;
    estimated_value: number | null;
    approved_budget: number | null;
    contact_name: string | null;
    contact_phone: string | null;
    contact_email: string | null;
    proof_url: string | null;
    status: "pending" | "owner_pending" | "approved" | "rejected";
    rejection_reason: string | null;
    created_at: string;
    campaign: {
        title: string | null;
        slug: string | null;
    } | null;
    phase: {
        title: string | null;
        sort_order: number | null;
    } | null;
    round: {
        round_number: number | null;
        percent: number | null;
        planned_amount: number | null;
    } | null;
    partner: {
        full_name: string | null;
        role: string | null;
    } | null;
    proofSignedUrl: string | null;
};

type AdminDisbursementRoundRow = {
    id: string;
    campaign_id: string;
    round_number: number;
    percent: number;
    planned_amount: number;
    status: DisbursementRoundStatus;
    proof_status: DisbursementProofStatus;
    proof_due_at: string | null;
    proof_submitted_at: string | null;
    proof_url: string | null;
    proof_note: string | null;
    campaign: {
        title: string | null;
        slug: string | null;
        owner_id: string | null;
    } | null;
    owner: PendingCampaignOwner | null;
    approvedOffer: {
        title: string | null;
        partner_id: string;
        contact_email: string | null;
        contact_phone: string | null;
        partnerName: string | null;
    } | null;
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

function formatOfferRoundLabel(offer: Pick<SupportOfferRow, "round">) {
    if (!offer.round) {
        return "Chưa xác định";
    }

    const order = offer.round.round_number
        ? `Đợt ${offer.round.round_number}`
        : "Đợt giải ngân";
    const percent = offer.round.percent ? ` - ${offer.round.percent}%` : "";
    const amount = offer.round.planned_amount
        ? ` (${formatVnd(offer.round.planned_amount)})`
        : "";

    return `${order}${percent}${amount}`;
}

function getAdminCampaignPriority(
    campaign: Pick<
        AdminCampaignRow,
        "ownerPendingOfferCount" | "review_status" | "status"
    >,
) {
    if (
        campaign.review_status === "published" &&
        campaign.status === "active" &&
        campaign.ownerPendingOfferCount > 0
    ) {
        return 0;
    }

    if (campaign.review_status === "published" && campaign.status === "active") {
        return 1;
    }

    if (campaign.review_status === "published" && campaign.status === "paused") {
        return 2;
    }

    if (campaign.review_status === "pending") {
        return 3;
    }

    if (campaign.status === "completed") {
        return 4;
    }

    return 5;
}

function formatAdminCampaignStatus(
    campaign: Pick<
        AdminCampaignRow,
        "ownerPendingOfferCount" | "review_status" | "status"
    >,
) {
    if (campaign.review_status === "pending") {
        return "Chờ admin duyệt";
    }

    if (campaign.review_status === "rejected") {
        return "Admin từ chối";
    }

    if (
        campaign.status === "active" &&
        campaign.ownerPendingOfferCount > 0
    ) {
        return "Đã có đơn vị đồng hành";
    }

    if (campaign.status === "active") {
        return "Đang công khai";
    }

    if (campaign.status === "paused") {
        return "Đang tìm đồng hành";
    }

    if (campaign.status === "completed") {
        return "Đã hoàn thành";
    }

    return "Chưa xác định";
}

function getAdminCampaignStatusBadgeClass(
    campaign: Pick<
        AdminCampaignRow,
        "ownerPendingOfferCount" | "review_status" | "status"
    >,
) {
    if (campaign.review_status === "pending") {
        return "bg-amber-50 text-amber-700";
    }

    if (campaign.review_status === "rejected") {
        return "bg-red-50 text-red-700";
    }

    if (
        campaign.status === "active" &&
        campaign.ownerPendingOfferCount > 0
    ) {
        return "bg-emerald-50 text-emerald-700";
    }

    if (campaign.status === "active") {
        return "bg-emerald-50 text-emerald-700";
    }

    if (campaign.status === "paused") {
        return "bg-sky-50 text-sky-700";
    }

    return "bg-slate-100 text-slate-600";
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
                    "id, campaign_id, title, description, start_date, end_date, status, proof_url, sort_order",
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

async function getAdminCampaigns(): Promise<AdminCampaignRow[]> {
    const supabase = getSupabaseServiceClient();

    if (!supabase) {
        return [];
    }

    const { data: campaigns, error } = await supabase
        .from("campaigns")
        .select(
            "id, slug, title, summary, target_amount, raised_amount, status, review_status, end_date, cover_tag, owner_id, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(50);

    if (error || !campaigns) {
        return [];
    }

    const ownerIds = Array.from(
        new Set(campaigns.map((campaign) => campaign.owner_id).filter(Boolean)),
    ) as string[];
    const campaignIds = campaigns.map((campaign) => campaign.id);

    const [{ data: ownerRows }, { data: ownerPendingOfferRows }] =
        await Promise.all([
            ownerIds.length > 0
                ? supabase
                    .from("profiles")
                    .select("id, full_name, role")
                    .in("id", ownerIds)
                : Promise.resolve({ data: [] }),
            campaignIds.length > 0
                ? supabase
                    .from("support_offers")
                    .select("campaign_id")
                    .in("campaign_id", campaignIds)
                    .eq("status", "approved")
                : Promise.resolve({ data: [] }),
        ]);

    const ownerById = new Map<string, PendingCampaignOwner>();

    for (const owner of ownerRows ?? []) {
        ownerById.set(owner.id, {
            id: owner.id,
            full_name: owner.full_name,
            role: owner.role,
        });
    }

    const ownerPendingOfferCountByCampaign = new Map<string, number>();

    for (const offer of ownerPendingOfferRows ?? []) {
        ownerPendingOfferCountByCampaign.set(
            offer.campaign_id,
            (ownerPendingOfferCountByCampaign.get(offer.campaign_id) ?? 0) + 1,
        );
    }

    return (campaigns as AdminCampaignRow[])
        .map((campaign) => ({
            ...campaign,
            owner: campaign.owner_id ? ownerById.get(campaign.owner_id) ?? null : null,
            ownerPendingOfferCount:
                ownerPendingOfferCountByCampaign.get(campaign.id) ?? 0,
        }))
        .sort((left, right) => {
            const priorityDiff =
                getAdminCampaignPriority(left) - getAdminCampaignPriority(right);

            if (priorityDiff !== 0) {
                return priorityDiff;
            }

            return (
                new Date(right.created_at).getTime() -
                new Date(left.created_at).getTime()
            );
        });
}

async function getSupportOffersForAdmin(): Promise<SupportOfferRow[]> {
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
            phase_id,
            disbursement_round_id,
            partner_id,
            title,
            support_type,
            description,
            estimated_value,
            approved_budget,
            contact_name,
            contact_phone,
            contact_email,
            proof_url,
            status,
            rejection_reason,
            created_at
            `,
        )
        .in("status", ["pending", "owner_pending", "approved", "rejected"])
        .order("created_at", { ascending: false })
        .limit(50);

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

    const phaseIds = Array.from(
        new Set(offers.map((offer) => offer.phase_id).filter(Boolean)),
    ) as string[];
    const roundIds = Array.from(
        new Set(offers.map((offer) => offer.disbursement_round_id).filter(Boolean)),
    ) as string[];

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

    const { data: phaseRows } =
        phaseIds.length > 0
            ? await supabase
                .from("campaign_phases")
                .select("id, title, sort_order")
                .in("id", phaseIds)
            : { data: [] };

    const { data: roundRows } =
        roundIds.length > 0
            ? await supabase
                .from("disbursement_rounds")
                .select("id, round_number, percent, planned_amount")
                .in("id", roundIds)
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

    const phaseById = new Map<
        string,
        { title: string | null; sort_order: number | null }
    >();

    for (const phase of phaseRows ?? []) {
        phaseById.set(phase.id, {
            title: phase.title,
            sort_order: phase.sort_order,
        });
    }

    const roundById = new Map<
        string,
        { round_number: number | null; percent: number | null; planned_amount: number | null }
    >();

    for (const round of roundRows ?? []) {
        roundById.set(round.id, {
            round_number: round.round_number,
            percent: round.percent,
            planned_amount: round.planned_amount,
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
                phase_id: offer.phase_id,
                disbursement_round_id: offer.disbursement_round_id,
                partner_id: offer.partner_id,
                title: offer.title,
                support_type: offer.support_type,
                description: offer.description,
                estimated_value: offer.estimated_value,
                approved_budget: offer.approved_budget,
                contact_name: offer.contact_name,
                contact_phone: offer.contact_phone,
                contact_email: offer.contact_email,
                proof_url: offer.proof_url,
                status: offer.status,
                rejection_reason: offer.rejection_reason,
                created_at: offer.created_at,
                campaign: campaignById.get(offer.campaign_id) ?? null,
                phase: offer.phase_id ? phaseById.get(offer.phase_id) ?? null : null,
                round: offer.disbursement_round_id
                    ? roundById.get(offer.disbursement_round_id) ?? null
                    : null,
                partner: partnerById.get(offer.partner_id) ?? null,
                proofSignedUrl,
            };
        }),
    );

}

async function getDisbursementRoundsForAdmin(): Promise<AdminDisbursementRoundRow[]> {
    const supabase = getSupabaseServiceClient();

    if (!supabase) {
        return [];
    }

    const { data: rounds, error } = await supabase
        .from("disbursement_rounds")
        .select(
            "id, campaign_id, round_number, percent, planned_amount, status, proof_status, proof_due_at, proof_submitted_at, proof_url, proof_note",
        )
        .in("status", ["requested", "disbursed", "needs_admin_review", "completed"])
        .order("created_at", { ascending: false })
        .limit(80);

    if (error || !rounds || rounds.length === 0) {
        return [];
    }

    const campaignIds = Array.from(
        new Set(rounds.map((round) => round.campaign_id).filter(Boolean)),
    );
    const roundIds = rounds.map((round) => round.id);

    const [{ data: campaigns }, { data: offers }] = await Promise.all([
        campaignIds.length > 0
            ? supabase
                .from("campaigns")
                .select("id, title, slug, owner_id")
                .in("id", campaignIds)
            : Promise.resolve({ data: [] }),
        roundIds.length > 0
            ? supabase
                .from("support_offers")
                .select("title, disbursement_round_id, partner_id, contact_email, contact_phone")
                .in("disbursement_round_id", roundIds)
                .eq("status", "approved")
            : Promise.resolve({ data: [] }),
    ]);

    const ownerIds = Array.from(
        new Set((campaigns ?? []).map((campaign) => campaign.owner_id).filter(Boolean)),
    ) as string[];
    const partnerIds = Array.from(
        new Set((offers ?? []).map((offer) => offer.partner_id).filter(Boolean)),
    ) as string[];
    const profileIds = Array.from(new Set([...ownerIds, ...partnerIds]));

    const { data: profiles } =
        profileIds.length > 0
            ? await supabase
                .from("profiles")
                .select("id, full_name, role")
                .in("id", profileIds)
            : { data: [] };

    const campaignById = new Map(
        (campaigns ?? []).map((campaign) => [
            campaign.id,
            {
                title: campaign.title,
                slug: campaign.slug,
                owner_id: campaign.owner_id,
            },
        ]),
    );
    const profileById = new Map(
        (profiles ?? []).map((profile) => [
            profile.id,
            {
                id: profile.id,
                full_name: profile.full_name,
                role: profile.role,
            },
        ]),
    );
    const offerByRoundId = new Map(
        (offers ?? []).map((offer) => [
            offer.disbursement_round_id,
            {
                title: offer.title,
                partner_id: offer.partner_id,
                contact_email: offer.contact_email,
                contact_phone: offer.contact_phone,
                partnerName: profileById.get(offer.partner_id)?.full_name ?? null,
            },
        ]),
    );

    return rounds.map((round) => {
        const campaign = campaignById.get(round.campaign_id) ?? null;

        return {
            ...round,
            campaign,
            owner: campaign?.owner_id
                ? profileById.get(campaign.owner_id) ?? null
                : null,
            approvedOffer: offerByRoundId.get(round.id) ?? null,
        };
    });
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

    const { data: campaign } = await supabase
        .from("campaigns")
        .update({
            review_status: "published",
            status: "active",
            reviewed_by: admin.id,
            reviewed_at: new Date().toISOString(),
            rejection_reason: null,
        })
        .eq("id", campaignId)
        .eq("review_status", "pending")
        .select("id, target_amount")
        .maybeSingle();

    if (campaign) {
        const rounds = [
            { round_number: 1, percent: 40 },
            { round_number: 2, percent: 40 },
            { round_number: 3, percent: 20 },
        ].map((round) => ({
            campaign_id: campaign.id,
            round_number: round.round_number,
            percent: round.percent,
            planned_amount: Math.round((Number(campaign.target_amount) * round.percent) / 100),
            status: round.round_number === 1 ? "open" : "locked",
            proof_status: "pending",
        }));

        await supabase
            .from("disbursement_rounds")
            .upsert(rounds, { onConflict: "campaign_id,round_number" });
    }

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

async function approveDisbursementRound(formData: FormData) {
    "use server";

    const admin = await assertAdmin();
    const roundId = String(formData.get("roundId") ?? "");

    if (!roundId) {
        return;
    }

    const supabase = getSupabaseServiceClient();

    if (!supabase) {
        return;
    }

    const { data: round } = await supabase
        .from("disbursement_rounds")
        .select("id, campaign_id, round_number, percent, planned_amount, status")
        .eq("id", roundId)
        .eq("status", "requested")
        .maybeSingle();

    if (!round) {
        return;
    }

    const { data: approvedOffer } = await supabase
        .from("support_offers")
        .select("id")
        .eq("disbursement_round_id", round.id)
        .eq("status", "approved")
        .maybeSingle();

    if (!approvedOffer) {
        return;
    }

    const { data: campaign } = await supabase
        .from("campaigns")
        .select("id, slug")
        .eq("id", round.campaign_id)
        .maybeSingle();

    if (!campaign) {
        return;
    }

    const now = new Date();
    const proofDueAt = new Date(now);
    proofDueAt.setDate(proofDueAt.getDate() + 14);

    await supabase
        .from("disbursement_rounds")
        .update({
            status: "disbursed",
            approved_by: admin.id,
            approved_at: now.toISOString(),
            disbursed_at: now.toISOString().slice(0, 10),
            proof_status: "pending",
            proof_due_at: proofDueAt.toISOString(),
        })
        .eq("id", round.id)
        .eq("status", "requested");

    await supabase.from("disbursements").insert({
        campaign_slug: campaign.slug,
        title: `Giải ngân đợt ${round.round_number}`,
        description: `Đợt ${round.round_number} (${round.percent}%) được giải ngân cho đơn vị đồng hành đã được duyệt.`,
        amount: round.planned_amount,
        spent_at: now.toISOString().slice(0, 10),
        proof_url: null,
    });

    revalidatePath("/quan-tri");
    revalidatePath("/tai-khoan");
    revalidatePath(`/chien-dich/${campaign.slug}`);
    redirect("/quan-tri");
}

async function approveDisbursementProof(formData: FormData) {
    "use server";

    const admin = await assertAdmin();
    const roundId = String(formData.get("roundId") ?? "");

    if (!roundId) {
        return;
    }

    const supabase = getSupabaseServiceClient();

    if (!supabase) {
        return;
    }

    const { data: round } = await supabase
        .from("disbursement_rounds")
        .select("id, campaign_id, round_number, proof_url")
        .eq("id", roundId)
        .in("status", ["disbursed", "needs_admin_review"])
        .maybeSingle();

    if (!round?.proof_url) {
        return;
    }

    await supabase
        .from("disbursement_rounds")
        .update({
            status: "completed",
            proof_status: "approved",
            proof_reviewed_by: admin.id,
            proof_reviewed_at: new Date().toISOString(),
        })
        .eq("id", round.id);

    if (round.round_number < 3) {
        await supabase
            .from("disbursement_rounds")
            .update({ status: "open" })
            .eq("campaign_id", round.campaign_id)
            .eq("round_number", round.round_number + 1)
            .eq("status", "locked");
    }

    if (round.round_number === 3) {
        const { data: allRounds } = await supabase
            .from("disbursement_rounds")
            .select("proof_status")
            .eq("campaign_id", round.campaign_id);

        const allProofsApproved =
            (allRounds ?? []).length === 3 &&
            (allRounds ?? []).every((item) => item.proof_status === "approved");

        if (allProofsApproved) {
            await supabase
                .from("campaigns")
                .update({ status: "completed" })
                .eq("id", round.campaign_id);
        }
    }

    const { data: campaign } = await supabase
        .from("campaigns")
        .select("slug")
        .eq("id", round.campaign_id)
        .maybeSingle();

    revalidatePath("/quan-tri");
    revalidatePath("/tai-khoan");

    if (campaign?.slug) {
        revalidatePath(`/chien-dich/${campaign.slug}`);
    }

    redirect("/quan-tri");
}

async function markDisbursementProofOverdue(formData: FormData) {
    "use server";

    await assertAdmin();
    const roundId = String(formData.get("roundId") ?? "");

    if (!roundId) {
        return;
    }

    const supabase = getSupabaseServiceClient();

    if (!supabase) {
        return;
    }

    const { data: round } = await supabase
        .from("disbursement_rounds")
        .select("id, campaign_id")
        .eq("id", roundId)
        .in("status", ["disbursed", "needs_admin_review"])
        .maybeSingle();

    if (!round) {
        return;
    }

    await supabase
        .from("disbursement_rounds")
        .update({
            status: "needs_admin_review",
            proof_status: "overdue",
        })
        .eq("id", round.id);

    const { data: campaign } = await supabase
        .from("campaigns")
        .select("slug")
        .eq("id", round.campaign_id)
        .maybeSingle();

    revalidatePath("/quan-tri");
    revalidatePath("/tai-khoan");

    if (campaign?.slug) {
        revalidatePath(`/chien-dich/${campaign.slug}`);
    }

    redirect("/quan-tri");
}

export default async function AdminPage() {
    await assertAdmin();

    const [
        summary,
        adminCampaigns,
        pendingRoleRequests,
        pendingCampaigns,
        supportOffersForAdmin,
        disbursementRoundsForAdmin,
    ] = await Promise.all([
        getDashboardSummary(),
        getAdminCampaigns(),
        getPendingRoleRequests(),
        getPendingCampaigns(),
        getSupportOffersForAdmin(),
        getDisbursementRoundsForAdmin(),
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
                            Tất cả chiến dịch
                        </h2>
                        <p className="mt-1 text-sm text-slate-600">
                            Theo dõi toàn bộ chiến dịch. Chiến dịch có đơn vị đã được chủ dự án chấp thuận sẽ nằm đầu danh sách để admin xác nhận.
                        </p>
                    </div>

                    <span className="rounded-full bg-primary-fixed px-4 py-2 text-sm font-bold text-primary">
                        {adminCampaigns.length} chiến dịch
                    </span>
                </div>

                {adminCampaigns.length === 0 ? (
                    <p className="mt-5 rounded-xl border border-slate-100 bg-white p-4 text-sm text-slate-600">
                        Chưa có chiến dịch nào trong hệ thống.
                    </p>
                ) : (
                    <div className="mt-5 grid gap-3">
                        {adminCampaigns.map((campaign) => (
                            <article
                                key={campaign.id}
                                className="rounded-xl border border-slate-100 bg-white p-4 shadow-soft"
                            >
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
                                            {campaign.cover_tag}
                                        </p>
                                        <h3 className="mt-1 font-display text-xl font-bold text-ink">
                                            {campaign.title}
                                        </h3>
                                        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                                            {campaign.summary}
                                        </p>
                                        <p className="mt-2 text-sm text-slate-600">
                                            Người tạo:{" "}
                                            <strong className="text-ink">
                                                {campaign.owner?.full_name || "Chưa có tên"}
                                            </strong>
                                        </p>
                                        {campaign.ownerPendingOfferCount > 0 ? (
                                            <p className="mt-2 text-sm font-semibold text-amber-700">
                                                {campaign.ownerPendingOfferCount} đơn vị đồng hành đã được owner duyệt
                                            </p>
                                        ) : null}
                                    </div>

                                    <span
                                        className={`rounded-full px-3 py-1 text-xs font-bold ${getAdminCampaignStatusBadgeClass(
                                            campaign,
                                        )}`}
                                    >
                                        {formatAdminCampaignStatus(campaign)}
                                    </span>
                                </div>

                                <div className="mt-4 grid gap-3 text-sm text-slate-700 md:grid-cols-4">
                                    <Info label="Mục tiêu" value={formatVnd(campaign.target_amount)} />
                                    <Info label="Đã huy động" value={formatVnd(campaign.raised_amount)} />
                                    <Info label="Ngày kết thúc" value={campaign.end_date} />
                                    <Info label="Ngày tạo" value={campaign.created_at} />
                                </div>

                                {campaign.review_status === "published" && campaign.status === "active" ? (
                                    <Link
                                        href={`/chien-dich/${campaign.slug}`}
                                        className="mt-4 inline-flex text-sm font-bold text-primary hover:underline"
                                    >
                                        Xem trang công khai
                                    </Link>
                                ) : null}
                            </article>
                        ))}
                    </div>
                )}
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
                                                    rel="noopener noreferrer"
                                                    className="group overflow-hidden rounded-xl border border-slate-100 bg-slate-50"
                                                >
                                                    {image.signedUrl ? (
                                                        <Image
                                                            src={image.signedUrl}
                                                            alt={image.caption ?? campaign.title}
                                                            width={320}
                                                            height={144}
                                                            unoptimized
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

                                                <div className="mt-4 grid gap-3 text-sm text-slate-700 md:grid-cols-2">
                                                    <Info label="Ngày bắt đầu" value={phase.start_date} />
                                                    <Info label="Ngày kết thúc" value={phase.end_date} />
                                                </div>

                                                {phase.signedProofUrl ? (
                                                    <a
                                                        href={phase.signedProofUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
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
                            Theo dõi đăng ký đồng hành
                        </h2>
                        <p className="mt-1 text-sm text-slate-600">
                            Theo dõi các đăng ký thực hiện giai đoạn do đơn vị đồng hành gửi, kể cả khi người tạo dự án đã xử lý.
                        </p>
                    </div>

                    <span className="rounded-full bg-primary-fixed px-4 py-2 text-sm font-bold text-primary">
                        {supportOffersForAdmin.length} yêu cầu
                    </span>
                </div>

                {supportOffersForAdmin.length === 0 ? (
                    <p className="mt-5 rounded-xl border border-slate-100 bg-white p-4 text-sm text-slate-600">
                        Hiện chưa có đăng ký đồng hành nào.
                    </p>
                ) : (
                    <div className="mt-5 grid gap-4">
                        {supportOffersForAdmin.map((offer) => (
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
                                            Đợt đồng hành:{" "}
                                            <strong className="text-ink">
                                                {formatOfferRoundLabel(offer)}
                                            </strong>
                                        </p>

                                        <p className="mt-1 text-sm text-slate-600">
                                            Đơn vị gửi:{" "}
                                            <strong className="text-ink">
                                                {offer.partner?.full_name ?? "Chưa có tên"}
                                            </strong>
                                        </p>
                                    </div>

                                    <span
                                        className={`rounded-full px-3 py-1 text-xs font-bold ${getSupportOfferStatusBadgeClass(
                                            offer.status,
                                        )}`}
                                    >
                                        {formatSupportOfferStatus(offer.status)}
                                    </span>
                                </div>

                                <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                                    {offer.description}
                                </p>

                                <div className="mt-4 grid gap-3 text-sm text-slate-700 md:grid-cols-4">
                                    <Info
                                        label="Ngân sách dự kiến"
                                        value={
                                            offer.estimated_value
                                                ? formatVnd(offer.estimated_value)
                                                : "Chưa cung cấp"
                                        }
                                    />
                                    <Info
                                        label="Ngân sách phê duyệt"
                                        value={
                                            offer.approved_budget
                                                ? formatVnd(offer.approved_budget)
                                                : "Chưa phê duyệt"
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
                                            rel="noopener noreferrer"
                                            className="inline-flex rounded-lg border border-primary px-4 py-2 text-sm font-bold text-primary transition hover:bg-primary hover:text-white"
                                        >
                                            Xem hồ sơ đính kèm
                                        </a>
                                    ) : (
                                        <p className="text-sm font-semibold text-slate-500">
                                            Chưa có minh chứng đính kèm.
                                        </p>
                                    )}
                                </div>

                                {offer.status === "pending" ? (
                                    <div className="mt-5 rounded-xl border border-sky-100 bg-sky-50 p-3 text-sm text-sky-700">
                                        <p className="font-bold">Đã gửi đến người tạo dự án</p>
                                        <p className="mt-1">
                                            Admin đang theo dõi yêu cầu này. Quyết định chấp thuận ban đầu thuộc về người tạo dự án.
                                        </p>
                                    </div>
                                ) : null}

                                {offer.status === "owner_pending" ? (
                                    <div className="mt-5 rounded-xl border border-amber-100 bg-amber-50 p-3 text-sm text-amber-700">
                                        <p className="font-bold">Chủ dự án đã chấp thuận</p>
                                        <p className="mt-1">
                                            Admin chỉ theo dõi yêu cầu này. Giải ngân sẽ được xử lý riêng ở luồng đợt giải ngân.
                                        </p>
                                    </div>
                                ) : null}

                                {offer.status === "approved" ? (
                                    <div className="mt-5 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-700">
                                        <p className="font-bold">Admin đã xác nhận đồng hành</p>
                                        <p className="mt-1">
                                            Đơn vị này đang được gắn với giai đoạn công khai của chiến dịch.
                                        </p>
                                    </div>
                                ) : null}

                                {offer.status === "rejected" ? (
                                    <div className="mt-5 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                                        <p className="font-bold">Đăng ký đã bị từ chối</p>
                                        <p className="mt-1">
                                            {offer.rejection_reason || "Người tạo dự án đã từ chối đăng ký này."}
                                        </p>
                                    </div>
                                ) : null}
                            </article>
                        ))}
                    </div>
                )}
            </section>
            <section className="neo-panel p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="font-display text-2xl font-bold text-ink">
                            Theo dõi giải ngân và chứng từ
                        </h2>
                        <p className="mt-1 text-sm text-slate-600">
                            Admin duyệt yêu cầu giải ngân, theo dõi chứng từ của đơn vị đồng hành và mở đợt kế tiếp khi chứng từ hợp lệ.
                        </p>
                    </div>

                    <span className="rounded-full bg-primary-fixed px-4 py-2 text-sm font-bold text-primary">
                        {disbursementRoundsForAdmin.length} đợt cần theo dõi
                    </span>
                </div>

                {disbursementRoundsForAdmin.length === 0 ? (
                    <p className="mt-5 rounded-xl border border-slate-100 bg-white p-4 text-sm text-slate-600">
                        Chưa có yêu cầu giải ngân hoặc chứng từ cần xử lý.
                    </p>
                ) : (
                    <div className="mt-5 grid gap-4">
                        {disbursementRoundsForAdmin.map((round) => (
                            <article
                                key={round.id}
                                className="rounded-xl border border-slate-100 bg-white p-5 shadow-soft"
                            >
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
                                            {round.campaign?.title ?? "Dự án"}
                                        </p>
                                        <h3 className="mt-1 font-display text-xl font-bold text-ink">
                                            Đợt {round.round_number} - {round.percent}% ({formatVnd(round.planned_amount)})
                                        </h3>
                                        <p className="mt-2 text-sm text-slate-600">
                                            Owner:{" "}
                                            <strong className="text-ink">
                                                {round.owner?.full_name ?? "Chưa có tên"}
                                            </strong>
                                        </p>
                                        <p className="mt-1 text-sm text-slate-600">
                                            Đơn vị nhận giải ngân:{" "}
                                            <strong className="text-ink">
                                                {round.approvedOffer?.partnerName ?? "Chưa có đơn vị đồng hành"}
                                            </strong>
                                        </p>
                                    </div>

                                    <span
                                        className={`rounded-full px-3 py-1 text-xs font-bold ${getDisbursementStatusBadgeClass(
                                            round.status,
                                        )}`}
                                    >
                                        {formatDisbursementStatus(round.status)}
                                    </span>
                                </div>

                                <div className="mt-4 grid gap-3 text-sm text-slate-700 md:grid-cols-4">
                                    <Info label="Chứng từ" value={formatProofStatus(round.proof_status)} />
                                    <Info label="Hạn nộp" value={round.proof_due_at ? round.proof_due_at.slice(0, 10) : null} />
                                    <Info label="Đã nộp" value={round.proof_submitted_at ? round.proof_submitted_at.slice(0, 10) : null} />
                                    <Info label="Liên hệ đơn vị" value={round.approvedOffer?.contact_email ?? round.approvedOffer?.contact_phone} />
                                </div>

                                {round.proof_url ? (
                                    <div className="mt-4 rounded-xl border border-slate-100 bg-surface-low p-3 text-sm text-slate-700">
                                        <p className="font-bold text-ink">Chứng từ đã nộp</p>
                                        <a
                                            href={round.proof_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="mt-1 inline-flex break-all font-semibold text-primary hover:underline"
                                        >
                                            {round.proof_url}
                                        </a>
                                        {round.proof_note ? (
                                            <p className="mt-2 whitespace-pre-wrap">{round.proof_note}</p>
                                        ) : null}
                                    </div>
                                ) : null}

                                {round.status === "requested" ? (
                                    <form action={approveDisbursementRound} className="mt-5">
                                        <input type="hidden" name="roundId" value={round.id} />
                                        <button
                                            type="submit"
                                            className="rounded-lg bg-primary px-5 py-2 text-sm font-bold text-white transition hover:bg-primary-container"
                                        >
                                            Duyệt giải ngân
                                        </button>
                                    </form>
                                ) : null}

                                {round.status === "disbursed" ||
                                    round.status === "needs_admin_review" ? (
                                    <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto_auto]">
                                        <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-sm text-amber-700">
                                            <p className="font-bold">Đang chờ xử lý chứng từ</p>
                                            <p className="mt-1">
                                                Duyệt chứng từ sẽ hoàn tất đợt này và tự mở đợt kế tiếp.
                                            </p>
                                        </div>

                                        <form action={markDisbursementProofOverdue}>
                                            <input type="hidden" name="roundId" value={round.id} />
                                            <button
                                                type="submit"
                                                className="w-full rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-700 transition hover:bg-red-100"
                                            >
                                                Đánh dấu quá hạn
                                            </button>
                                        </form>

                                        <form action={approveDisbursementProof}>
                                            <input type="hidden" name="roundId" value={round.id} />
                                            <button
                                                type="submit"
                                                className="w-full rounded-lg bg-primary px-5 py-2 text-sm font-bold text-white transition hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-50"
                                                disabled={!round.proof_url}
                                            >
                                                Duyệt chứng từ
                                            </button>
                                        </form>
                                    </div>
                                ) : null}
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
                                                ? "Năng lực đồng hành"
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
                                            rel="noopener noreferrer"
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
        case "implementation":
            return "Đồng hành thực hiện";
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

function formatSupportOfferStatus(status: string) {
    switch (status) {
        case "pending":
            return "Chờ chủ dự án duyệt";
        case "owner_pending":
            return "Chờ admin xác nhận";
        case "approved":
            return "Đã xác nhận đồng hành";
        case "rejected":
            return "Bị từ chối";
        default:
            return "Chưa xác định";
    }
}

function getSupportOfferStatusBadgeClass(status: string) {
    switch (status) {
        case "pending":
            return "bg-amber-50 text-amber-700";
        case "owner_pending":
            return "bg-amber-50 text-amber-700";
        case "approved":
            return "bg-emerald-50 text-emerald-700";
        case "rejected":
            return "bg-red-50 text-red-700";
        default:
            return "bg-slate-100 text-slate-600";
    }
}

function formatDisbursementStatus(status: DisbursementRoundStatus) {
    switch (status) {
        case "locked":
            return "Chưa mở";
        case "open":
            return "Đang mở";
        case "requested":
            return "Chờ duyệt giải ngân";
        case "disbursed":
            return "Đã giải ngân";
        case "completed":
            return "Hoàn tất";
        case "needs_admin_review":
            return "Cần admin xử lý";
        default:
            return "Chưa xác định";
    }
}

function getDisbursementStatusBadgeClass(status: DisbursementRoundStatus) {
    switch (status) {
        case "requested":
            return "bg-amber-50 text-amber-700";
        case "disbursed":
            return "bg-indigo-50 text-indigo-700";
        case "completed":
            return "bg-emerald-50 text-emerald-700";
        case "needs_admin_review":
            return "bg-red-50 text-red-700";
        case "open":
            return "bg-sky-50 text-sky-700";
        default:
            return "bg-slate-100 text-slate-600";
    }
}

function formatProofStatus(status: DisbursementProofStatus) {
    switch (status) {
        case "pending":
            return "Đang chờ";
        case "approved":
            return "Đã duyệt";
        case "overdue":
            return "Quá hạn";
        default:
            return "Chưa xác định";
    }
}
