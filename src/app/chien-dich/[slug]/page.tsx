import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getCampaignBySlug, getTransparencyItems } from "@/lib/data";
import { formatDate, formatVnd } from "@/lib/format";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

type CampaignDetailPageProps = {
    params: Promise<{ slug: string }>;
};

type ApprovedSupportOfferRow = {
    id: string;
    title: string;
    support_type: string;
    description: string;
    estimated_value: number | null;
    contact_name: string | null;
    contact_phone: string | null;
    contact_email: string | null;
    created_at: string;
    partner: {
        full_name: string | null;
        role: string | null;
    } | null;
};

export async function generateMetadata({
    params,
}: CampaignDetailPageProps): Promise<Metadata> {
    const { slug } = await params;
    const campaign = await getCampaignBySlug(slug);

    return {
        title: campaign?.title ?? "Chi tiết chiến dịch",
        description: campaign?.summary ?? "Thông tin chiến dịch",
    };
}

async function getApprovedSupportOffers(
    campaignId: string,
): Promise<ApprovedSupportOfferRow[]> {
    const supabase = getSupabaseServiceClient();

    if (!supabase) {
        return [];
    }

    const { data: offers, error } = await supabase
        .from("support_offers")
        .select(
            `
      id,
      partner_id,
      title,
      support_type,
      description,
      estimated_value,
      contact_name,
      contact_phone,
      contact_email,
      created_at
      `,
        )
        .eq("campaign_id", campaignId)
        .eq("status", "approved")
        .order("created_at", { ascending: false });

    if (error || !offers) {
        return [];
    }

    const partnerIds = Array.from(
        new Set(offers.map((offer) => offer.partner_id).filter(Boolean)),
    );

    const { data: partnerRows } =
        partnerIds.length > 0
            ? await supabase
                .from("profiles")
                .select("id, full_name, role")
                .in("id", partnerIds)
            : { data: [] };

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

    return offers.map((offer) => ({
        id: offer.id,
        title: offer.title,
        support_type: offer.support_type,
        description: offer.description,
        estimated_value: offer.estimated_value,
        contact_name: offer.contact_name,
        contact_phone: offer.contact_phone,
        contact_email: offer.contact_email,
        created_at: offer.created_at,
        partner: partnerById.get(offer.partner_id) ?? null,
    }));
}

export default async function CampaignDetailPage({
    params,
}: CampaignDetailPageProps) {
    const { slug } = await params;
    const campaign = await getCampaignBySlug(slug);

    if (!campaign) {
        notFound();
    }

    const [logs, approvedSupportOffers] = await Promise.all([
        getTransparencyItems(campaign.slug),
        getApprovedSupportOffers(campaign.id),
    ]);

    const progress =
        campaign.targetAmount > 0
            ? Math.min((campaign.raisedAmount / campaign.targetAmount) * 100, 100)
            : 0;

    return (
        <div className="space-y-8 pb-8">
            <section className="neo-panel-strong p-8 sm:p-10">
                <div className="max-w-4xl">
                    <p className="neo-badge border-white/30 bg-white/20 text-white">
                        {campaign.coverTag}
                    </p>
                    <h1 className="mt-3 font-display text-4xl font-bold text-white sm:text-5xl">
                        {campaign.title}
                    </h1>
                    <p className="mt-4 max-w-3xl text-sm text-slate-100 sm:text-base">
                        {campaign.summary}
                    </p>
                </div>

                <div className="mt-7 grid gap-4 md:grid-cols-[1fr_0.95fr]">
                    <div className="rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-semibold text-slate-100">
                            <span>{Math.round(progress)}% hoàn thành</span>
                            <span>Kết thúc: {formatDate(campaign.endDate)}</span>
                        </div>
                        <div className="mt-3 h-3 rounded-full bg-white/20">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-white to-accent"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <p className="mt-3 font-display text-xl font-bold text-white">
                            {formatVnd(campaign.raisedAmount)} /{" "}
                            {formatVnd(campaign.targetAmount)}
                        </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <MiniStat
                            label="Đã tiếp nhận"
                            value={formatVnd(campaign.raisedAmount)}
                        />
                        <MiniStat
                            label="Mục tiêu"
                            value={formatVnd(campaign.targetAmount)}
                        />
                    </div>
                </div>

                <Link
                    href={`/quyen-gop?campaign=${campaign.slug}`}
                    className="neo-btn neo-btn-primary mt-7"
                >
                    Ủng hộ chiến dịch này
                </Link>
            </section>

            <section className="neo-panel p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="font-display text-2xl font-bold text-ink">
                            Đơn vị đồng hành
                        </h2>
                        <p className="mt-1 text-sm text-slate-600">
                            Các đề xuất hỗ trợ đã được người tạo dự án chấp nhận phối hợp.
                        </p>
                    </div>

                    <span className="rounded-full bg-primary-fixed px-4 py-2 text-sm font-bold text-primary">
                        {approvedSupportOffers.length} đơn vị
                    </span>
                </div>

                {approvedSupportOffers.length === 0 ? (
                    <p className="mt-5 rounded-xl border border-slate-100 bg-white p-4 text-sm text-slate-600">
                        Dự án hiện chưa có đơn vị đồng hành được xác nhận.
                    </p>
                ) : (
                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                        {approvedSupportOffers.map((offer) => (
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
                                            {offer.partner?.full_name || "Đơn vị đồng hành"}
                                        </h3>

                                        <p className="mt-1 text-sm font-semibold text-primary">
                                            {offer.title}
                                        </p>
                                    </div>

                                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                                        Đã chấp nhận
                                    </span>
                                </div>

                                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                                    {offer.description}
                                </p>

                                <div className="mt-4 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
                                    <PartnerInfo
                                        label="Giá trị ước tính"
                                        value={
                                            offer.estimated_value
                                                ? formatVnd(offer.estimated_value)
                                                : "Chưa cung cấp"
                                        }
                                    />
                                    <PartnerInfo
                                        label="Người phụ trách"
                                        value={offer.contact_name || "Chưa cung cấp"}
                                    />
                                    <PartnerInfo
                                        label="Số điện thoại"
                                        value={offer.contact_phone || "Chưa cung cấp"}
                                    />
                                    <PartnerInfo
                                        label="Email liên hệ"
                                        value={offer.contact_email || "Chưa cung cấp"}
                                    />
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>

            <section className="neo-panel p-6">
                <h2 className="font-display text-2xl font-bold text-ink">
                    Nhật ký giải ngân
                </h2>
                {logs.length === 0 ? (
                    <p className="mt-3 text-sm text-slate-600">Chưa có khoản chi nào.</p>
                ) : (
                    <ul className="mt-5 space-y-3">
                        {logs.map((log, index) => (
                            <li
                                key={log.id}
                                className="relative rounded-xl border border-slate-100 bg-white/80 p-4 pl-5 shadow-soft"
                            >
                                <span
                                    className={`absolute left-0 top-0 h-full w-1 rounded-l-xl ${index % 2 === 0 ? "bg-primary" : "bg-cool"
                                        }`}
                                />
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="font-bold text-ink">{log.title}</p>
                                    <p className="text-sm font-bold text-primary">
                                        {formatVnd(log.amount)}
                                    </p>
                                </div>
                                <p className="mt-1 text-sm text-slate-600">{log.description}</p>
                                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
                                    Ngày chi: {formatDate(log.spentAt)}
                                </p>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </div>
    );
}

function MiniStat({ label, value }: { label: string; value: string }) {
    return (
        <article className="rounded-2xl border border-white/20 bg-white/10 p-4 text-white backdrop-blur-sm">
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-white/75">
                {label}
            </p>
            <p className="mt-2 font-display text-lg font-bold">{value}</p>
        </article>
    );
}

function PartnerInfo({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                {label}
            </p>
            <p className="mt-1 whitespace-pre-wrap break-words text-sm font-semibold text-slate-800">
                {value.trim() ? value : "Chưa cung cấp"}
            </p>
        </div>
    );
}

function formatSupportTypeLabel(value?: string | null) {
    switch (value) {
        case "financial":
            return "Tài chính";
        case "goods":
            return "Hiện vật";
        case "service":
            return "Dịch vụ";
        case "volunteer":
            return "Tình nguyện";
        case "media":
            return "Truyền thông";
        case "location":
            return "Địa điểm / cơ sở vật chất";
        case "expertise":
            return "Chuyên môn";
        case "other":
            return "Khác";
        default:
            return value || "Chưa xác định";
    }
}