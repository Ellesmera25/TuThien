import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SupportOfferForm } from "@/components/support-offer-form";
import {
    getCurrentUser,
    getCurrentUserRole,
} from "@/lib/supabase/auth-server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
    title: "Đồng hành dự án",
    description: "Đăng ký đồng hành thực hiện giai đoạn dự án thiện nguyện trên TuThien.vn",
};

export const dynamic = "force-dynamic";

export type SupportCampaignOption = {
    id: string;
    title: string;
    summary: string;
    target_amount: number;
    raised_amount: number;
    end_date: string;
    cover_tag: string;
    status: "active" | "completed" | "paused";
    phases: SupportCampaignPhaseOption[];
};

export type SupportCampaignPhaseOption = {
    id: string;
    title: string;
    description: string;
    sort_order: number;
    hasApprovedPartner: boolean;
};

async function getPublishedCampaigns(): Promise<SupportCampaignOption[]> {
    const supabase = getSupabaseServiceClient();

    if (!supabase) {
        return [];
    }

    const { data, error } = await supabase
        .from("campaigns")
        .select(
            "id, title, summary, target_amount, raised_amount, end_date, cover_tag, status",
        )
        .eq("review_status", "published")
        .in("status", ["active", "paused"])
        .order("created_at", { ascending: false });

    if (error || !data) {
        return [];
    }

    const campaignIds = data.map((campaign) => campaign.id);

    const [{ data: phaseRows }, { data: approvedOfferRows }] =
        campaignIds.length > 0
            ? await Promise.all([
                supabase
                    .from("campaign_phases")
                    .select("id, campaign_id, title, description, sort_order")
                    .in("campaign_id", campaignIds)
                    .order("sort_order", { ascending: true }),
                supabase
                    .from("support_offers")
                    .select("phase_id")
                    .in("campaign_id", campaignIds)
                    .eq("status", "approved"),
            ])
            : [{ data: [] }, { data: [] }];

    const approvedPhaseIds = new Set(
        (approvedOfferRows ?? [])
            .map((offer) => offer.phase_id)
            .filter((phaseId): phaseId is string => Boolean(phaseId)),
    );

    const phasesByCampaign = new Map<string, SupportCampaignPhaseOption[]>();

    for (const phase of phaseRows ?? []) {
        const list = phasesByCampaign.get(phase.campaign_id) ?? [];

        list.push({
            id: phase.id,
            title: phase.title,
            description: phase.description,
            sort_order: phase.sort_order,
            hasApprovedPartner: approvedPhaseIds.has(phase.id),
        });

        phasesByCampaign.set(phase.campaign_id, list);
    }

    return data
        .map((campaign) => ({
            ...campaign,
            phases: (phasesByCampaign.get(campaign.id) ?? []).filter(
                (phase) => !phase.hasApprovedPartner,
            ),
        }))
        .filter((campaign) => campaign.phases.length > 0) as SupportCampaignOption[];
}

export default async function SupportCampaignPage() {
    const user = await getCurrentUser();

    if (!user) {
        redirect("/dang-nhap?next=/chien-dich/ho-tro");
    }

    const role = await getCurrentUserRole();

    if (role !== "partner_org") {
        redirect("/tai-khoan");
    }

    const campaigns = await getPublishedCampaigns();

    return (
        <div className="pb-10">
            <section className="relative overflow-hidden rounded-3xl border border-outline-variant/40 bg-gradient-to-br from-primary-fixed via-white to-haze p-8 shadow-card md:p-10">
                <div className="absolute right-8 top-8 hidden h-28 w-28 rounded-full bg-white/70 blur-2xl md:block" />
                <div className="absolute bottom-0 right-0 hidden h-48 w-48 rounded-full bg-primary/10 blur-3xl md:block" />

                <div className="relative max-w-3xl">
                    <p className="neo-badge">Đơn vị đồng hành</p>

                    <h1 className="mt-4 font-display text-4xl font-black tracking-tight text-ink md:text-5xl">
                        Đăng ký đồng hành thực hiện giai đoạn.
                    </h1>

                    <p className="mt-4 max-w-2xl text-base leading-7 text-on-surface-variant">
                        Chọn dự án và giai đoạn đơn vị có thể trực tiếp triển khai.
                        Yêu cầu sẽ được gửi thẳng đến người tạo dự án duyệt, đồng
                        thời hiển thị cho quản trị theo dõi.
                    </p>
                </div>
            </section>

            <section className="mt-8 rounded-3xl border border-outline-variant/40 bg-white p-6 shadow-card md:p-8">
                <SupportOfferForm campaigns={campaigns} />
            </section>
        </div>
    );
}
