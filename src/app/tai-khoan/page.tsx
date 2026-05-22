import type { Metadata } from "next";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { AuthSignOutButton } from "@/components/auth-sign-out-button";
import { RoleRequestForm } from "@/components/role-request-form";
import { getDashboardSummary, getReelsByUser } from "@/lib/data";
import { formatCompactNumber, formatDate, formatVnd } from "@/lib/format";
import {
    getCurrentUser,
    getCurrentUserRole,
} from "@/lib/supabase/auth-server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
    title: "Tài khoản",
    description: "Thông tin tài khoản và reels tác động của thành viên",
};

export const dynamic = "force-dynamic";

type MyCampaignRow = {
    id: string;
    slug: string;
    title: string;
    summary: string;
    target_amount: number;
    raised_amount: number;
    status: string;
    review_status: "pending" | "published" | "rejected";
    rejection_reason: string | null;
    created_at: string;
};
type MyRoleRequestRow = {
    id: string;
    requested_role: "project_owner" | "partner_org";
    status: "pending" | "approved" | "rejected";
    display_name: string;
    purpose: string;
    rejection_reason: string | null;
    created_at: string;
    reviewed_at: string | null;
};
type SupportOfferStatus = "pending" | "owner_pending" | "approved" | "rejected";

type MySupportOfferRow = {
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
    status: SupportOfferStatus;
    rejection_reason: string | null;
    owner_rejection_reason: string | null;
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
export default async function AccountPage() {
    const user = await getCurrentUser();

    if (!user) {
        redirect("/dang-nhap?next=/tai-khoan");
    }

    const [
        summary,
        reels,
        recentDonations,
        myCampaigns,
        myRoleRequests,
        mySupportOffers,
        ownerSupportOffers,
    ] = await Promise.all([
        getDashboardSummary(),
        getReelsByUser(user.id),
        getMyRecentDonations(user.email ?? ""),
        getMyCampaigns(user.id),
        getMyRoleRequests(user.id),
        getMySupportOffers(user.id),
        getOwnerSupportOffers(user.id),
    ]);

    const fullName =
        (user.user_metadata.full_name as string | undefined) ?? "Thành viên";

    const role = await getCurrentUserRole();
    const isDonor = role === "donor";
    const canCreateCampaign = role === "project_owner";
    const canSupportCampaign = role === "partner_org";

    return (
        <div className="flex flex-col gap-12 pb-8">
            <section className="surface-card flex flex-col items-center gap-8 rounded-xl p-8 text-center md:flex-row md:items-start md:text-left">
                <div className="flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-surface-container bg-primary-fixed font-display text-4xl font-bold text-primary md:h-44 md:w-44">
                    {fullName.slice(0, 2).toUpperCase()}
                </div>

                <div className="flex flex-1 flex-col gap-3">
                    <div className="flex items-center justify-center gap-2 md:justify-start">
                        <h1 className="font-display text-4xl font-semibold tracking-tight text-ink">
                            {fullName}
                        </h1>
                        <AccountIcon name="verified" className="h-6 w-6 text-primary" />
                    </div>

                    <p className="max-w-2xl text-base leading-7 text-on-surface-variant">
                        Hồ sơ thành viên TuThien.vn, nơi theo dõi lịch sử đóng góp, các
                        chiến dịch quan tâm và những reels tác động đang lan tỏa trong cộng
                        đồng.
                    </p>

                    <p className="text-sm font-semibold text-on-surface-variant">
                        Email: {user.email}
                    </p>

                    <div className="mt-4 flex w-full gap-4 md:w-auto">
                        <ProfileMetric
                            label="Tổng huy động"
                            value={formatVnd(summary.totalRaised)}
                        />
                        <ProfileMetric label="Chiến dịch" value={`${summary.campaignCount}`} />
                    </div>
                </div>

                <div className="flex w-full flex-col gap-2 md:w-auto">
                    {canCreateCampaign ? (
                        <Link
                            href="/chien-dich/tao"
                            className="neo-btn neo-btn-primary w-full whitespace-nowrap md:w-auto"
                        >
                            Tạo dự án
                        </Link>
                    ) : null}
                    {canSupportCampaign ? (
                        <Link
                            href="/chien-dich/ho-tro"
                            className="neo-btn neo-btn-primary w-full whitespace-nowrap md:w-auto"
                        >
                            Hỗ trợ dự án
                        </Link>
                    ) : null}
                    <Link
                        href="/reels/tao"
                        className="neo-btn neo-btn-primary w-full whitespace-nowrap md:w-auto"
                    >
                        Tạo reel mới
                    </Link>

                    <Link
                        href="/quyen-gop"
                        className="neo-btn neo-btn-ghost w-full whitespace-nowrap md:w-auto"
                    >
                        Tạo đóng góp mới
                    </Link>

                    <AuthSignOutButton />
                </div>
            </section>

            {isDonor ? (
                <RoleRequestForm />
            ) : (
                <section className="surface-card rounded-xl p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <h2 className="font-display text-2xl font-semibold text-ink">
                            Vai trò hiện tại
                        </h2>

                        <p className="inline-flex rounded-full bg-primary-fixed px-4 py-2 text-sm font-bold text-primary">
                            {formatRoleLabel(role)}
                        </p>
                    </div>
                </section>
            )}
            {myRoleRequests.length > 0 ? (
                <section className="surface-card rounded-xl p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h2 className="font-display text-2xl font-semibold text-ink">
                                Yêu cầu vai trò của tôi
                            </h2>
                            <p className="mt-1 text-sm text-on-surface-variant">
                                Theo dõi trạng thái xét duyệt yêu cầu nâng vai trò.
                            </p>
                        </div>

                        <span className="rounded-full bg-primary-fixed px-4 py-2 text-sm font-bold text-primary">
                            {myRoleRequests.length} yêu cầu
                        </span>
                    </div>

                    <div className="mt-5 grid gap-3">
                        {myRoleRequests.map((request) => (
                            <article
                                key={request.id}
                                className="rounded-xl border border-outline-variant/40 bg-white p-4 shadow-soft"
                            >
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-[0.08em] text-on-surface-variant">
                                            {formatRequestedRoleLabel(request.requested_role)}
                                        </p>

                                        <h3 className="mt-1 font-display text-xl font-bold text-ink">
                                            {request.display_name}
                                        </h3>

                                        <p className="mt-1 max-w-2xl text-sm leading-6 text-on-surface-variant">
                                            {request.purpose}
                                        </p>
                                    </div>

                                    <span
                                        className={`rounded-full px-3 py-1 text-xs font-bold ${getRoleRequestStatusBadgeClass(
                                            request.status,
                                        )}`}
                                    >
                                        {formatRoleRequestStatus(request.status)}
                                    </span>
                                </div>

                                <div className="mt-4 grid gap-3 text-sm text-slate-700 md:grid-cols-2">
                                    <CampaignInfo
                                        label="Ngày gửi"
                                        value={formatDate(request.created_at)}
                                    />
                                    <CampaignInfo
                                        label="Ngày xử lý"
                                        value={
                                            request.reviewed_at
                                                ? formatDate(request.reviewed_at)
                                                : "Chưa xử lý"
                                        }
                                    />
                                </div>

                                {request.status === "pending" ? (
                                    <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-3 text-sm text-amber-700">
                                        <p className="font-bold">Đang chờ admin duyệt</p>
                                        <p className="mt-1">
                                            Yêu cầu đã được gửi và đang chờ kiểm tra thông tin.
                                        </p>
                                    </div>
                                ) : null}

                                {request.status === "approved" ? (
                                    <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-700">
                                        <p className="font-bold">Yêu cầu đã được duyệt</p>
                                        <p className="mt-1">
                                            Tài khoản đã được cập nhật sang vai trò{" "}
                                            {formatRequestedRoleLabel(request.requested_role)}.
                                        </p>
                                    </div>
                                ) : null}

                                {request.status === "rejected" ? (
                                    <div className="mt-4 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                                        <p className="font-bold">Lý do từ chối</p>
                                        <p className="mt-1">
                                            {request.rejection_reason ||
                                                "Hồ sơ chưa đủ điều kiện để nâng vai trò."}
                                        </p>
                                    </div>
                                ) : null}
                            </article>
                        ))}
                    </div>
                </section>
            ) : null}
            {canSupportCampaign ? (
                <section className="surface-card rounded-xl p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h2 className="font-display text-2xl font-semibold text-ink">
                                Đề xuất hỗ trợ của tôi
                            </h2>
                            <p className="mt-1 text-sm text-on-surface-variant">
                                Theo dõi trạng thái đề xuất đã gửi cho các dự án.
                            </p>
                        </div>

                        <span className="rounded-full bg-primary-fixed px-4 py-2 text-sm font-bold text-primary">
                            {mySupportOffers.length} đề xuất
                        </span>
                    </div>

                    {mySupportOffers.length === 0 ? (
                        <p className="mt-5 rounded-xl border border-outline-variant/40 bg-white p-4 text-sm text-on-surface-variant">
                            Chưa có đề xuất hỗ trợ nào. Bạn có thể gửi đề xuất tại trang Hỗ trợ dự án.
                        </p>
                    ) : (
                        <div className="mt-5 grid gap-3">
                            {mySupportOffers.map((offer) => (
                                <article
                                    key={offer.id}
                                    className="rounded-xl border border-outline-variant/40 bg-white p-4 shadow-soft"
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                            <p className="text-xs font-bold uppercase tracking-[0.08em] text-on-surface-variant">
                                                {formatSupportTypeLabel(offer.support_type)}
                                            </p>

                                            <h3 className="mt-1 font-display text-xl font-bold text-ink">
                                                {offer.title}
                                            </h3>

                                            <p className="mt-1 text-sm text-on-surface-variant">
                                                Dự án:{" "}
                                                <strong className="text-ink">
                                                    {offer.campaign?.title ?? "Không xác định"}
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

                                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-on-surface-variant">
                                        {offer.description}
                                    </p>

                                    <div className="mt-4 grid gap-3 text-sm text-slate-700 md:grid-cols-3">
                                        <CampaignInfo
                                            label="Giá trị ước tính"
                                            value={
                                                offer.estimated_value
                                                    ? formatVnd(offer.estimated_value)
                                                    : "Chưa cung cấp"
                                            }
                                        />
                                        <CampaignInfo
                                            label="Ngày gửi"
                                            value={formatDate(offer.created_at)}
                                        />
                                        <CampaignInfo
                                            label="Trạng thái"
                                            value={formatSupportOfferStatus(offer.status)}
                                        />
                                    </div>

                                    {offer.status === "pending" ? (
                                        <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-3 text-sm text-amber-700">
                                            <p className="font-bold">Đang chờ admin duyệt</p>
                                            <p className="mt-1">
                                                Đề xuất đã được gửi và đang chờ kiểm tra hợp lệ.
                                            </p>
                                        </div>
                                    ) : null}

                                    {offer.status === "owner_pending" ? (
                                        <div className="mt-4 rounded-xl border border-sky-100 bg-sky-50 p-3 text-sm text-sky-700">
                                            <p className="font-bold">Đang chờ chủ dự án duyệt</p>
                                            <p className="mt-1">
                                                Admin đã duyệt bước đầu. Đề xuất đang chờ người tạo dự án chấp nhận phối hợp.
                                            </p>
                                        </div>
                                    ) : null}

                                    {offer.status === "approved" ? (
                                        <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-700">
                                            <p className="font-bold">Đề xuất đã được chấp nhận</p>
                                            <p className="mt-1">
                                                Người tạo dự án đã đồng ý phối hợp với đơn vị đồng hành.
                                            </p>
                                        </div>
                                    ) : null}

                                    {offer.status === "rejected" ? (
                                        <div className="mt-4 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                                            <p className="font-bold">
                                                {getSupportOfferRejectionTitle(offer)}
                                            </p>
                                            <p className="mt-1">
                                                {getSupportOfferRejectionReason(offer)}
                                            </p>
                                        </div>
                                    ) : null}
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            ) : null}
            {myCampaigns.length > 0 ? (
                <section className="surface-card rounded-xl p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h2 className="font-display text-2xl font-semibold text-ink">
                                Dự án của tôi
                            </h2>
                            <p className="mt-1 text-sm text-on-surface-variant">
                                Theo dõi trạng thái xét duyệt các dự án đã gửi.
                            </p>
                        </div>

                        <span className="rounded-full bg-primary-fixed px-4 py-2 text-sm font-bold text-primary">
                            {myCampaigns.length} dự án
                        </span>
                    </div>

                    <div className="mt-5 grid gap-3">
                        {myCampaigns.map((campaign) => (
                            <article
                                key={campaign.id}
                                className="rounded-xl border border-outline-variant/40 bg-white p-4 shadow-soft"
                            >
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <h3 className="font-display text-xl font-bold text-ink">
                                            {campaign.title}
                                        </h3>
                                        <p className="mt-1 max-w-2xl text-sm leading-6 text-on-surface-variant">
                                            {campaign.summary}
                                        </p>
                                    </div>

                                    <span
                                        className={`rounded-full px-3 py-1 text-xs font-bold ${getCampaignReviewBadgeClass(
                                            campaign.review_status,
                                        )}`}
                                    >
                                        {formatCampaignReviewStatus(campaign.review_status)}
                                    </span>
                                </div>

                                <div className="mt-4 grid gap-3 text-sm text-slate-700 md:grid-cols-3">
                                    <CampaignInfo
                                        label="Mục tiêu"
                                        value={formatVnd(campaign.target_amount)}
                                    />
                                    <CampaignInfo
                                        label="Đã huy động"
                                        value={formatVnd(campaign.raised_amount)}
                                    />
                                    <CampaignInfo
                                        label="Ngày gửi"
                                        value={formatDate(campaign.created_at)}
                                    />
                                </div>

                                {campaign.review_status === "pending" ? (
                                    <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-3 text-sm text-amber-700">
                                        <p className="font-bold">Đang chờ admin duyệt</p>
                                        <p className="mt-1">
                                            Dự án đã được gửi thành công và đang trong quá trình kiểm tra.
                                        </p>
                                    </div>
                                ) : null}

                                {campaign.review_status === "rejected" ? (
                                    <div className="mt-4 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                                        <p className="font-bold">Lý do từ chối</p>
                                        <p className="mt-1">
                                            {campaign.rejection_reason ||
                                                "Dự án chưa đủ điều kiện để hiển thị công khai."}
                                        </p>
                                    </div>
                                ) : null}

                                {campaign.review_status === "published" ? (
                                    <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-700">
                                        <p className="font-bold">Dự án đã được duyệt</p>
                                        <p className="mt-1">
                                            Dự án hiện đã được hiển thị công khai trên nền tảng.
                                        </p>

                                        <Link
                                            href={`/chien-dich/${campaign.slug}`}
                                            className="mt-3 inline-flex text-sm font-bold text-primary hover:underline"
                                        >
                                            Xem dự án công khai
                                        </Link>
                                    </div>
                                ) : null}
                            </article>
                        ))}
                    </div>
                </section>
            ) : null}
            {canCreateCampaign ? (
                <section className="surface-card rounded-xl p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h2 className="font-display text-2xl font-semibold text-ink">
                                Lịch sử đề xuất hỗ trợ cho dự án của tôi
                            </h2>
                            <p className="mt-1 text-sm text-on-surface-variant">
                                Theo dõi các đề xuất đã được admin chuyển đến và xử lý phối hợp.
                            </p>
                        </div>

                        <span className="rounded-full bg-primary-fixed px-4 py-2 text-sm font-bold text-primary">
                            {ownerSupportOffers.length} đề xuất
                        </span>
                    </div>

                    {ownerSupportOffers.length === 0 ? (
                        <p className="mt-5 rounded-xl border border-outline-variant/40 bg-white p-4 text-sm text-on-surface-variant">
                            Hiện chưa có đề xuất hỗ trợ nào cho các dự án của bạn.
                        </p>
                    ) : (
                        <div className="mt-5 grid gap-3">
                            {ownerSupportOffers.map((offer) => (
                                <article
                                    key={offer.id}
                                    className="rounded-xl border border-outline-variant/40 bg-white p-4 shadow-soft"
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                            <p className="text-xs font-bold uppercase tracking-[0.08em] text-on-surface-variant">
                                                {formatSupportTypeLabel(offer.support_type)}
                                            </p>

                                            <h3 className="mt-1 font-display text-xl font-bold text-ink">
                                                {offer.title}
                                            </h3>

                                            <p className="mt-1 text-sm text-on-surface-variant">
                                                Dự án:{" "}
                                                <strong className="text-ink">
                                                    {offer.campaign?.title ?? "Không xác định"}
                                                </strong>
                                            </p>

                                            <p className="mt-1 text-sm text-on-surface-variant">
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

                                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-on-surface-variant">
                                        {offer.description}
                                    </p>

                                    <div className="mt-4 grid gap-3 text-sm text-slate-700 md:grid-cols-3">
                                        <CampaignInfo
                                            label="Giá trị ước tính"
                                            value={
                                                offer.estimated_value
                                                    ? formatVnd(offer.estimated_value)
                                                    : "Chưa cung cấp"
                                            }
                                        />
                                        <CampaignInfo
                                            label="Người phụ trách"
                                            value={offer.contact_name ?? "Chưa cung cấp"}
                                        />
                                        <CampaignInfo
                                            label="Số điện thoại"
                                            value={offer.contact_phone ?? "Chưa cung cấp"}
                                        />
                                        <CampaignInfo
                                            label="Email liên hệ"
                                            value={offer.contact_email ?? "Chưa cung cấp"}
                                        />
                                    </div>

                                    {offer.proofSignedUrl ? (
                                        <a
                                            href={offer.proofSignedUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="mt-4 inline-flex rounded-lg border border-primary px-4 py-2 text-sm font-bold text-primary transition hover:bg-primary hover:text-white"
                                        >
                                            Xem minh chứng hỗ trợ
                                        </a>
                                    ) : null}

                                    {offer.status === "owner_pending" ? (
                                        <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]">
                                            <form action={rejectOwnerSupportOffer} className="flex gap-2">
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

                                            <form action={approveOwnerSupportOffer}>
                                                <input type="hidden" name="offerId" value={offer.id} />
                                                <button
                                                    type="submit"
                                                    className="rounded-lg bg-primary px-5 py-2 text-sm font-bold text-white transition hover:bg-primary-container"
                                                >
                                                    Chấp nhận phối hợp
                                                </button>
                                            </form>
                                        </div>
                                    ) : null}

                                    {offer.status === "approved" ? (
                                        <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-700">
                                            <p className="font-bold">Đã chấp nhận phối hợp</p>
                                            <p className="mt-1">
                                                Đơn vị đồng hành này sẽ được hiển thị trên trang dự án công khai.
                                            </p>
                                        </div>
                                    ) : null}

                                    {offer.status === "rejected" ? (
                                        <div className="mt-4 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                                            <p className="font-bold">Đã từ chối đề xuất</p>
                                            <p className="mt-1">
                                                {getSupportOfferRejectionReason(offer)}
                                            </p>
                                        </div>
                                    ) : null}
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            ) : null}
            <section className="border-b border-outline-variant/40">
                <div className="no-scrollbar flex gap-8 overflow-x-auto pb-2">
                    <Link
                        href="/chien-dich"
                        className="whitespace-nowrap pb-2 text-sm font-bold text-on-surface-variant transition hover:text-primary"
                    >
                        Chiến dịch
                    </Link>
                    <Link
                        href="/reels"
                        className="whitespace-nowrap border-b-2 border-primary pb-2 text-sm font-bold text-primary"
                    >
                        Reels tác động
                    </Link>
                    <a
                        href="#lich-su-dong-gop"
                        className="whitespace-nowrap pb-2 text-sm font-bold text-on-surface-variant transition hover:text-primary"
                    >
                        Lịch sử đóng góp
                    </a>
                </div>
            </section>

            <section className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {reels.slice(0, 7).map((reel) => (
                    <Link
                        key={reel.id}
                        href="/reels"
                        className="group relative aspect-[9/16] overflow-hidden rounded-xl bg-surface-highest shadow-ambient transition hover:-translate-y-1 hover:shadow-card"
                    >
                        <div className="absolute inset-0 bg-[linear-gradient(135deg,#a33900_0%,#545c72_55%,#131b2e_100%)] transition duration-500 group-hover:scale-105" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/84 via-transparent to-transparent" />
                        <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                            <div className="mb-1 flex items-center gap-1">
                                <AccountIcon name="play" className="h-4 w-4" />
                                <span className="text-xs font-semibold">
                                    {formatCompactNumber(reel.views)}
                                </span>
                            </div>

                            <p className="line-clamp-2 text-sm font-bold leading-5">
                                {reel.title}
                            </p>

                            <div className="mt-2 inline-block rounded bg-white/20 px-2 py-1 backdrop-blur">
                                <p className="text-xs font-bold text-primary-fixed">
                                    {reel.location}
                                </p>
                            </div>
                        </div>
                    </Link>
                ))}

                <Link
                    href="/reels/tao"
                    className="group flex aspect-[9/16] flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-surface-variant bg-white transition hover:border-primary hover:bg-surface-low"
                >
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-fixed/50 text-primary transition group-hover:scale-110">
                        <AccountIcon name="plus" className="h-8 w-8" />
                    </span>
                    <span className="text-sm font-bold text-on-surface-variant group-hover:text-primary">
                        Tạo reel mới
                    </span>
                </Link>
            </section>

            <section id="lich-su-dong-gop" className="surface-card rounded-xl p-6">
                <h2 className="font-display text-2xl font-semibold text-ink">
                    Lịch sử đóng góp
                </h2>

                {recentDonations.length === 0 ? (
                    <p className="mt-3 text-sm leading-6 text-on-surface-variant">
                        Chưa có dữ liệu đóng góp. Bạn có thể tạo đóng góp mới tại trang quyên
                        góp.
                    </p>
                ) : (
                    <ul className="mt-4 space-y-3">
                        {recentDonations.map((donation) => (
                            <li
                                key={donation.id}
                                className="rounded-lg border border-outline-variant/30 bg-surface-low p-4"
                            >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="font-semibold text-ink">
                                        {donation.payment_reference}
                                    </p>
                                    <p className="text-sm font-bold text-primary">
                                        {formatVnd(donation.amount)}
                                    </p>
                                </div>

                                <p className="mt-1 text-xs uppercase tracking-[0.1em] text-on-surface-variant">
                                    {formatDate(donation.created_at)}
                                </p>

                                <p className="mt-1 text-sm text-on-surface-variant">
                                    {donation.donor_name}
                                </p>

                                <p className="mt-1 text-sm font-semibold text-primary">
                                    Chiến dịch: {donation.campaign_title}
                                </p>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </div>
    );
}

function ProfileMetric({ label, value }: { label: string; value: string }) {
    return (
        <article className="flex-1 rounded-lg bg-surface-low p-4 md:min-w-[150px] md:flex-none">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-on-surface-variant">
                {label}
            </p>
            <p className="mt-1 font-display text-2xl font-semibold text-primary">
                {value}
            </p>
        </article>
    );
}

function CampaignInfo({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-on-surface-variant">
                {label}
            </p>
            <p className="mt-1 font-semibold text-ink">{value}</p>
        </div>
    );
}

type AccountIconName = "play" | "plus" | "verified";

function AccountIcon({
    className,
    name,
}: {
    className?: string;
    name: AccountIconName;
}) {
    const strokeProps = {
        fill: "none",
        stroke: "currentColor",
        strokeLinecap: "round",
        strokeLinejoin: "round",
        strokeWidth: 2,
    } as const;

    switch (name) {
        case "play":
            return (
                <svg
                    aria-hidden="true"
                    className={className}
                    fill="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path d="M8 5.3v13.4c0 .8.9 1.3 1.6.9l10.1-6.7c.6-.4.6-1.3 0-1.7L9.6 4.4C8.9 4 8 4.5 8 5.3Z" />
                </svg>
            );

        case "plus":
            return (
                <svg aria-hidden="true" className={className} viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="9" {...strokeProps} />
                    <path d="M12 8v8M8 12h8" {...strokeProps} />
                </svg>
            );

        case "verified":
            return (
                <svg
                    aria-hidden="true"
                    className={className}
                    fill="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path d="M12 2.5 14.2 5l3.3-.4.8 3.2 2.9 1.6-1.6 2.9.8 3.2-3.3 1.1-1.6 2.9-3.5-1.4-3.5 1.4-1.6-2.9-3.3-1.1.8-3.2-1.6-2.9 2.9-1.6.8-3.2 3.3.4L12 2.5Zm-3.7 9.7 2.4 2.4 5.1-5.1-1.2-1.2-3.9 3.9-1.2-1.2-1.2 1.2Z" />
                </svg>
            );
    }
}

type DonationRow = {
    id: string;
    donor_name: string;
    amount: number;
    created_at: string;
    payment_reference: string;
    hash: string;
    previous_hash: string;
    campaign_title: string;
};

async function getMyRecentDonations(email: string): Promise<DonationRow[]> {
    if (!email) {
        return [];
    }

    const client = getSupabaseServiceClient();

    if (!client) {
        return [];
    }

    const { data: blockchainRows, error: blockchainError } = await client
        .from("donation_blockchain")
        .select(
            "id, donation_id, donor_name, amount, created_at, payment_reference, hash, previous_hash",
        )
        .eq("email", email)
        .order("created_at", { ascending: false })
        .limit(10);

    if (blockchainError || !blockchainRows || blockchainRows.length === 0) {
        return [];
    }

    const donationIds = blockchainRows.map((row) => row.donation_id);

    const { data: donationRows, error: donationError } = await client
        .from("donations")
        .select("id, campaign_slug, campaign:campaigns(title)")
        .in("id", donationIds);

    if (donationError || !donationRows) {
        return blockchainRows.map((row) => ({
            id: row.id,
            donor_name: row.donor_name,
            amount: row.amount,
            created_at: row.created_at,
            payment_reference: row.payment_reference,
            hash: row.hash,
            previous_hash: row.previous_hash,
            campaign_title: "Quỹ chung",
        }));
    }

    const donationMap = new Map(
        donationRows.map((row) => [
            row.id,
            {
                campaignTitle:
                    row.campaign &&
                        typeof row.campaign === "object" &&
                        !Array.isArray(row.campaign)
                        ? (row.campaign as { title?: string | null }).title ?? "Quỹ chung"
                        : "Quỹ chung",
            },
        ]),
    );

    return blockchainRows.map((row) => {
        const donation = donationMap.get(row.donation_id);

        return {
            id: row.id,
            donor_name: row.donor_name,
            amount: row.amount,
            created_at: row.created_at,
            payment_reference: row.payment_reference,
            hash: row.hash,
            previous_hash: row.previous_hash,
            campaign_title: donation?.campaignTitle ?? "Quỹ chung",
        };
    });
}

async function getMyCampaigns(userId: string): Promise<MyCampaignRow[]> {
    if (!userId) {
        return [];
    }

    const client = getSupabaseServiceClient();

    if (!client) {
        return [];
    }

    const { data, error } = await client
        .from("campaigns")
        .select(
            "id, slug, title, summary, target_amount, raised_amount, status, review_status, rejection_reason, created_at",
        )
        .eq("owner_id", userId)
        .order("created_at", { ascending: false });

    if (error || !data) {
        return [];
    }

    return data as MyCampaignRow[];
}
async function getMySupportOffers(userId: string): Promise<MySupportOfferRow[]> {
    if (!userId) {
        return [];
    }

    const client = getSupabaseServiceClient();

    if (!client) {
        return [];
    }

    const { data: offers, error } = await client
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
            owner_rejection_reason,
            created_at
            `,
        )
        .eq("partner_id", userId)
        .order("created_at", { ascending: false });

    if (error || !offers) {
        return [];
    }

    return enrichSupportOffers(offers);
}
async function getOwnerSupportOffers(
    userId: string,
): Promise<MySupportOfferRow[]> {
    if (!userId) {
        return [];
    }

    const client = getSupabaseServiceClient();

    if (!client) {
        return [];
    }

    const { data: campaigns, error: campaignError } = await client
        .from("campaigns")
        .select("id")
        .eq("owner_id", userId);

    if (campaignError || !campaigns || campaigns.length === 0) {
        return [];
    }

    const campaignIds = campaigns.map((campaign) => campaign.id);

    const { data: offers, error } = await client
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
            owner_rejection_reason,
            created_at
            `,
        )
        .in("campaign_id", campaignIds)
        .in("status", ["owner_pending", "approved", "rejected"])
        .order("created_at", { ascending: false });

    if (error || !offers) {
        return [];
    }

    return enrichSupportOffers(offers);
}

async function enrichSupportOffers(
    offers: Array<{
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
        status: SupportOfferStatus;
        rejection_reason: string | null;
        owner_rejection_reason: string | null;
        created_at: string;
    }>,
): Promise<MySupportOfferRow[]> {
    const client = getSupabaseServiceClient();

    if (!client || offers.length === 0) {
        return [];
    }

    const campaignIds = Array.from(new Set(offers.map((offer) => offer.campaign_id)));
    const partnerIds = Array.from(new Set(offers.map((offer) => offer.partner_id)));

    const { data: campaignRows } =
        campaignIds.length > 0
            ? await client
                .from("campaigns")
                .select("id, title, slug")
                .in("id", campaignIds)
            : { data: [] };

    const { data: partnerRows } =
        partnerIds.length > 0
            ? await client
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
                const { data: signedData } = await client.storage
                    .from("campaign-assets")
                    .createSignedUrl(offer.proof_url, 60 * 10);

                proofSignedUrl = signedData?.signedUrl ?? null;
            }

            return {
                ...offer,
                campaign: campaignById.get(offer.campaign_id) ?? null,
                partner: partnerById.get(offer.partner_id) ?? null,
                proofSignedUrl,
            };
        }),
    );
}

async function approveOwnerSupportOffer(formData: FormData) {
    "use server";

    const user = await getCurrentUser();

    if (!user) {
        redirect("/dang-nhap?next=/tai-khoan");
    }

    const offerId = String(formData.get("offerId") ?? "");

    if (!offerId) {
        return;
    }

    const client = getSupabaseServiceClient();

    if (!client) {
        return;
    }

    const { data: offer } = await client
        .from("support_offers")
        .select("id, campaign_id")
        .eq("id", offerId)
        .eq("status", "owner_pending")
        .maybeSingle();

    if (!offer) {
        return;
    }

    const { data: campaign } = await client
        .from("campaigns")
        .select("id, owner_id")
        .eq("id", offer.campaign_id)
        .eq("owner_id", user.id)
        .maybeSingle();

    if (!campaign) {
        return;
    }

    await client
        .from("support_offers")
        .update({
            status: "approved",
            owner_reviewed_by: user.id,
            owner_reviewed_at: new Date().toISOString(),
            owner_rejection_reason: null,
        })
        .eq("id", offerId)
        .eq("status", "owner_pending");

    const { data: campaignForRevalidate } = await client
        .from("campaigns")
        .select("slug")
        .eq("id", offer.campaign_id)
        .maybeSingle();

    revalidatePath("/tai-khoan");

    if (campaignForRevalidate?.slug) {
        revalidatePath(`/chien-dich/${campaignForRevalidate.slug}`);
    }

    redirect("/tai-khoan");
}

async function rejectOwnerSupportOffer(formData: FormData) {
    "use server";

    const user = await getCurrentUser();

    if (!user) {
        redirect("/dang-nhap?next=/tai-khoan");
    }

    const offerId = String(formData.get("offerId") ?? "");
    const rejectionReason = String(formData.get("rejectionReason") ?? "").trim();

    if (!offerId) {
        return;
    }

    const client = getSupabaseServiceClient();

    if (!client) {
        return;
    }

    const { data: offer } = await client
        .from("support_offers")
        .select("id, campaign_id")
        .eq("id", offerId)
        .eq("status", "owner_pending")
        .maybeSingle();

    if (!offer) {
        return;
    }

    const { data: campaign } = await client
        .from("campaigns")
        .select("id, owner_id")
        .eq("id", offer.campaign_id)
        .eq("owner_id", user.id)
        .maybeSingle();

    if (!campaign) {
        return;
    }

    const reason =
        rejectionReason || "Người tạo dự án chưa đồng ý phối hợp với đề xuất này.";

    await client
        .from("support_offers")
        .update({
            status: "rejected",
            owner_reviewed_by: user.id,
            owner_reviewed_at: new Date().toISOString(),
            owner_rejection_reason: reason,
            rejection_reason: reason,
        })
        .eq("id", offerId)
        .eq("status", "owner_pending");

    const { data: campaignForRevalidate } = await client
        .from("campaigns")
        .select("slug")
        .eq("id", offer.campaign_id)
        .maybeSingle();

    revalidatePath("/tai-khoan");

    if (campaignForRevalidate?.slug) {
        revalidatePath(`/chien-dich/${campaignForRevalidate.slug}`);
    }

    redirect("/tai-khoan");
} async function getMyRoleRequests(userId: string): Promise<MyRoleRequestRow[]> {
    if (!userId) {
        return [];
    }

    const client = getSupabaseServiceClient();

    if (!client) {
        return [];
    }

    const { data, error } = await client
        .from("role_requests")
        .select(
            "id, requested_role, status, display_name, purpose, rejection_reason, created_at, reviewed_at",
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

    if (error || !data) {
        return [];
    }

    return data as MyRoleRequestRow[];
}
function formatRoleLabel(role: string | null) {
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

function formatCampaignReviewStatus(status: string) {
    switch (status) {
        case "pending":
            return "Chờ duyệt";
        case "published":
            return "Đã duyệt";
        case "rejected":
            return "Bị từ chối";
        default:
            return "Chưa xác định";
    }
}

function getCampaignReviewBadgeClass(status: string) {
    switch (status) {
        case "pending":
            return "bg-amber-50 text-amber-700";
        case "published":
            return "bg-emerald-50 text-emerald-700";
        case "rejected":
            return "bg-red-50 text-red-700";
        default:
            return "bg-slate-100 text-slate-600";
    }
}
function formatRequestedRoleLabel(role: string) {
    switch (role) {
        case "project_owner":
            return "Người tạo dự án";
        case "partner_org":
            return "Đơn vị đồng hành";
        default:
            return "Vai trò chưa xác định";
    }
}

function formatRoleRequestStatus(status: string) {
    switch (status) {
        case "pending":
            return "Chờ duyệt";
        case "approved":
            return "Đã duyệt";
        case "rejected":
            return "Bị từ chối";
        default:
            return "Chưa xác định";
    }
}

function getRoleRequestStatusBadgeClass(status: string) {
    switch (status) {
        case "pending":
            return "bg-amber-50 text-amber-700";
        case "approved":
            return "bg-emerald-50 text-emerald-700";
        case "rejected":
            return "bg-red-50 text-red-700";
        default:
            return "bg-slate-100 text-slate-600";
    }
}
function getSupportOfferRejectionTitle(offer: MySupportOfferRow) {
    if (offer.owner_rejection_reason) {
        return "Chủ dự án từ chối";
    }

    return "Admin từ chối";
}

function getSupportOfferRejectionReason(offer: MySupportOfferRow) {
    return (
        offer.owner_rejection_reason ||
        offer.rejection_reason ||
        "Đề xuất hỗ trợ chưa phù hợp."
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

function formatSupportOfferStatus(status: string) {
    switch (status) {
        case "pending":
            return "Chờ admin duyệt";
        case "owner_pending":
            return "Chờ chủ dự án duyệt";
        case "approved":
            return "Đã chấp nhận";
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
            return "bg-sky-50 text-sky-700";
        case "approved":
            return "bg-emerald-50 text-emerald-700";
        case "rejected":
            return "bg-red-50 text-red-700";
        default:
            return "bg-slate-100 text-slate-600";
    }
}