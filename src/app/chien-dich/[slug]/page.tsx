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
    approved_budget: number | null;
    contact_name: string | null;
    contact_phone: string | null;
    contact_email: string | null;
    created_at: string;
    round: {
        round_number: number | null;
        percent: number | null;
        planned_amount: number | null;
    } | null;
    partner: {
        full_name: string | null;
        role: string | null;
    } | null;
};

type CampaignDisbursementRoundRow = {
    id: string;
    round_number: number;
    percent: number;
    planned_amount: number;
    status: string;
    proof_status: string;
    partnerName: string | null;
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
    const roundIds = Array.from(
        new Set(offers.map((offer) => offer.disbursement_round_id).filter(Boolean)),
    ) as string[];

    const { data: partnerRows } =
        partnerIds.length > 0
            ? await supabase
                .from("profiles")
                .select("id, full_name, role")
                .in("id", partnerIds)
            : { data: [] };

    const { data: roundRows } =
        roundIds.length > 0
            ? await supabase
                .from("disbursement_rounds")
                .select("id, round_number, percent, planned_amount")
                .in("id", roundIds)
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

    return offers.map((offer) => ({
        id: offer.id,
        title: offer.title,
        support_type: offer.support_type,
        description: offer.description,
        estimated_value: offer.estimated_value,
        approved_budget: offer.approved_budget,
        contact_name: offer.contact_name,
        contact_phone: offer.contact_phone,
        contact_email: offer.contact_email,
        created_at: offer.created_at,
        round: offer.disbursement_round_id
            ? roundById.get(offer.disbursement_round_id) ?? null
            : null,
        partner: partnerById.get(offer.partner_id) ?? null,
    }));
}

async function getCampaignDisbursementRounds(
    campaignId: string,
): Promise<CampaignDisbursementRoundRow[]> {
    const supabase = getSupabaseServiceClient();

    if (!supabase) {
        return [];
    }

    const [{ data: rounds }, { data: offers }] = await Promise.all([
        supabase
            .from("disbursement_rounds")
            .select(
                "id, round_number, percent, planned_amount, status, proof_status",
            )
            .eq("campaign_id", campaignId)
            .order("round_number", { ascending: true }),
        supabase
            .from("support_offers")
            .select("disbursement_round_id, partner_id")
            .eq("campaign_id", campaignId)
            .eq("status", "approved"),
    ]);

    if (!rounds) {
        return [];
    }

    const partnerIds = Array.from(
        new Set((offers ?? []).map((offer) => offer.partner_id).filter(Boolean)),
    );

    const { data: partners } =
        partnerIds.length > 0
            ? await supabase
                .from("profiles")
                .select("id, full_name")
                .in("id", partnerIds)
            : { data: [] };

    const partnerById = new Map<string, string | null>();

    for (const partner of partners ?? []) {
        partnerById.set(partner.id, partner.full_name);
    }

    const partnerByRoundId = new Map<string, string | null>();

    for (const offer of offers ?? []) {
        if (offer.disbursement_round_id) {
            partnerByRoundId.set(
                offer.disbursement_round_id,
                partnerById.get(offer.partner_id) ?? null,
            );
        }
    }

    return rounds.map((round) => ({
        id: round.id,
        round_number: round.round_number,
        percent: round.percent,
        planned_amount: round.planned_amount,
        status: round.status,
        proof_status: round.proof_status,
        partnerName: partnerByRoundId.get(round.id) ?? null,
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

    const [logs, approvedSupportOffers, rounds] = await Promise.all([
        getTransparencyItems(campaign.slug),
        getApprovedSupportOffers(campaign.id),
        getCampaignDisbursementRounds(campaign.id),
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
                            Tiến độ giải ngân
                        </h2>
                        <p className="mt-1 text-sm text-slate-600">
                            Chiến dịch có 3 đợt giải ngân cố định 40% - 40% - 20%.
                        </p>
                    </div>
                    <span className="rounded-full bg-primary-fixed px-4 py-2 text-sm font-bold text-primary">
                        {rounds.length} đợt
                    </span>
                </div>

                {rounds.length === 0 ? (
                    <p className="mt-5 rounded-xl border border-slate-100 bg-white p-4 text-sm text-slate-600">
                        Dự án chưa có lịch giải ngân.
                    </p>
                ) : (
                    <div className="mt-5 grid gap-4">
                        {rounds.map((round) => {
                            return (
                                <article
                                    key={round.id}
                                    className="rounded-xl border border-slate-100 bg-white p-5 shadow-soft"
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                            <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
                                                Đợt giải ngân {round.round_number}
                                            </p>
                                            <h3 className="mt-1 font-display text-xl font-bold text-ink">
                                                {round.percent}% ngân sách
                                            </h3>
                                            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                                                Kế hoạch giải ngân dự kiến: {formatVnd(round.planned_amount)}
                                            </p>
                                        </div>
                                        <span
                                            className={`rounded-full px-3 py-1 text-xs font-bold ${getRoundStatusBadgeClass(
                                                round.status,
                                            )}`}
                                        >
                                            {formatRoundStatus(round.status)}
                                        </span>
                                    </div>

                                    <div className="mt-4 grid gap-3 text-sm text-slate-700 md:grid-cols-4">
                                        <PartnerInfo
                                            label="Tỷ lệ"
                                            value={`${round.percent}%`}
                                        />
                                        <PartnerInfo
                                            label="Số tiền dự kiến"
                                            value={formatVnd(round.planned_amount)}
                                        />
                                        <PartnerInfo
                                            label="Đơn vị đồng hành"
                                            value={round.partnerName || "Chưa xác nhận"}
                                        />
                                        <PartnerInfo
                                            label="Chứng từ"
                                            value={formatProofStatus(round.proof_status)}
                                        />
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </section>

            <section className="neo-panel p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="font-display text-2xl font-bold text-ink">
                            Đơn vị đồng hành
                        </h2>
                        <p className="mt-1 text-sm text-slate-600">
                            Các đơn vị đã được người tạo dự án chấp nhận đồng hành thực hiện giai đoạn.
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

                                        <p className="mt-1 text-sm text-slate-600">
                                            {formatOfferRoundLabel(offer)}
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
                                        label="Ngân sách dự kiến"
                                        value={
                                            offer.estimated_value
                                                ? formatVnd(offer.estimated_value)
                                            : "Chưa cung cấp"
                                        }
                                    />
                                    <PartnerInfo
                                        label="Ngân sách phê duyệt"
                                        value={
                                            offer.approved_budget
                                                ? formatVnd(offer.approved_budget)
                                                : "Chưa phê duyệt"
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

function formatOfferRoundLabel(offer: Pick<ApprovedSupportOfferRow, "round">) {
    if (!offer.round) {
        return "Đợt đồng hành chưa xác định";
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

function formatSupportTypeLabel(value?: string | null) {
    switch (value) {
        case "implementation":
            return "Đồng hành thực hiện";
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

function formatRoundStatus(status: string) {
    switch (status) {
        case "open":
            return "Đang mở";
        case "requested":
            return "Đã yêu cầu giải ngân";
        case "disbursed":
            return "Đã giải ngân";
        case "completed":
            return "Đã hoàn tất";
        case "needs_admin_review":
            return "Cần admin xử lý";
        default:
            return "Chưa mở";
    }
}

function getRoundStatusBadgeClass(status: string) {
    switch (status) {
        case "open":
        case "requested":
            return "bg-amber-50 text-amber-700";
        case "disbursed":
        case "completed":
            return "bg-emerald-50 text-emerald-700";
        case "needs_admin_review":
            return "bg-red-50 text-red-700";
        default:
            return "bg-slate-100 text-slate-700";
    }
}

function formatProofStatus(status: string) {
    switch (status) {
        case "approved":
            return "Đã duyệt";
        case "overdue":
            return "Quá hạn";
        default:
            return "Đang chờ";
    }
}
