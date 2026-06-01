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
    description: "Đăng ký đồng hành theo đợt giải ngân dự án thiện nguyện trên TuThien.vn",
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
    rounds: SupportCampaignRoundOption[];
};

export type SupportCampaignRoundOption = {
    id: string;
    round_number: number;
    percent: number;
    planned_amount: number;
    status: string;
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

    const [{ data: roundRows }, { data: lockedOfferRows }] =
        campaignIds.length > 0
            ? await Promise.all([
                supabase
                    .from("disbursement_rounds")
                    .select("id, campaign_id, round_number, percent, planned_amount, status")
                    .in("campaign_id", campaignIds)
                    .order("round_number", { ascending: true }),
                supabase
                    .from("support_offers")
                    .select("disbursement_round_id")
                    .in("campaign_id", campaignIds)
                    .in("status", ["owner_pending", "approved"]),
            ])
            : [{ data: [] }, { data: [] }];

    const lockedRoundIds = new Set(
        (lockedOfferRows ?? [])
            .map((offer) => offer.disbursement_round_id)
            .filter((roundId): roundId is string => Boolean(roundId)),
    );

    const roundsByCampaign = new Map<string, SupportCampaignRoundOption[]>();

    for (const round of roundRows ?? []) {
        const list = roundsByCampaign.get(round.campaign_id) ?? [];

        list.push({
            id: round.id,
            round_number: round.round_number,
            percent: round.percent,
            planned_amount: round.planned_amount,
            status: round.status,
            hasApprovedPartner: lockedRoundIds.has(round.id),
        });

        roundsByCampaign.set(round.campaign_id, list);
    }

    return data
        .map((campaign) => ({
            ...campaign,
            rounds: (roundsByCampaign.get(campaign.id) ?? []).filter(
                (round) => !round.hasApprovedPartner,
            ),
        }))
        .filter((campaign) => campaign.rounds.length > 0) as SupportCampaignOption[];
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
                        Đăng ký đồng hành theo đợt giải ngân.
                    </h1>

                    <p className="mt-4 max-w-2xl text-base leading-7 text-on-surface-variant">
                        Chọn dự án và đợt giải ngân đơn vị có thể đồng hành triển khai.
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
