import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SupportOfferForm } from "@/components/support-offer-form";
import {
    getCurrentUser,
    getCurrentUserRole,
} from "@/lib/supabase/auth-server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
    title: "Hỗ trợ dự án",
    description: "Gửi đề xuất hỗ trợ dự án thiện nguyện trên TuThien.vn",
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
};

async function getPublishedCampaigns(): Promise<SupportCampaignOption[]> {
    const supabase = getSupabaseServiceClient();

    if (!supabase) {
        return [];
    }

    const { data, error } = await supabase
        .from("campaigns")
        .select(
            "id, title, summary, target_amount, raised_amount, end_date, cover_tag",
        )
        .eq("review_status", "published")
        .eq("status", "active")
        .order("created_at", { ascending: false });

    if (error || !data) {
        return [];
    }

    return data as SupportCampaignOption[];
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
                        Gửi đề xuất hỗ trợ dự án thiện nguyện.
                    </h1>

                    <p className="mt-4 max-w-2xl text-base leading-7 text-on-surface-variant">
                        Chọn dự án đang hoạt động, mô tả hình thức hỗ trợ và gửi
                        thông tin để đội quản trị xem xét trước khi kết nối với người tạo
                        dự án.
                    </p>
                </div>
            </section>

            <section className="mt-8 rounded-3xl border border-outline-variant/40 bg-white p-6 shadow-card md:p-8">
                <SupportOfferForm campaigns={campaigns} />
            </section>
        </div>
    );
}