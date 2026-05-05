import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthSignOutButton } from "@/components/auth-sign-out-button";
import { getDashboardSummary, getReels } from "@/lib/data";
import { formatCompactNumber, formatDate, formatVnd } from "@/lib/format";
import {
  createSupabaseServerAuthClient,
  getCurrentUser,
} from "@/lib/supabase/auth-server";

export const metadata: Metadata = {
  title: "Tài khoản",
  description: "Thông tin tài khoản và reels tác động của thành viên",
};

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/dang-nhap?next=/tai-khoan");
  }

  const [summary, reels, recentDonations] = await Promise.all([
    getDashboardSummary(),
    getReels(),
    getMyRecentDonations(user.email ?? ""),
  ]);

  const fullName =
    (user.user_metadata.full_name as string | undefined) ?? "Thành viên";

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
          <Link
            href="/quyen-gop"
            className="neo-btn neo-btn-primary w-full whitespace-nowrap md:w-auto"
          >
            Tạo đóng góp mới
          </Link>
          <AuthSignOutButton />
        </div>
      </section>

      <section className="border-b border-outline-variant/40">
        <div className="no-scrollbar flex gap-8 overflow-x-auto pb-2">
          <Link href="/chien-dich" className="whitespace-nowrap pb-2 text-sm font-bold text-on-surface-variant transition hover:text-primary">
            Chiến dịch
          </Link>
          <Link href="/reels" className="whitespace-nowrap border-b-2 border-primary pb-2 text-sm font-bold text-primary">
            Reels tác động
          </Link>
          <a href="#lich-su-dong-gop" className="whitespace-nowrap pb-2 text-sm font-bold text-on-surface-variant transition hover:text-primary">
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
          href="/reels"
          className="group flex aspect-[9/16] flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-surface-variant bg-white transition hover:border-primary hover:bg-surface-low"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-fixed/50 text-primary transition group-hover:scale-110">
            <AccountIcon name="plus" className="h-8 w-8" />
          </span>
          <span className="text-sm font-bold text-on-surface-variant group-hover:text-primary">
            Xem thêm reels
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
                    {donation.campaign_slug ?? "Quỹ chung"}
                  </p>
                  <p className="text-sm font-bold text-primary">
                    {formatVnd(donation.amount)}
                  </p>
                </div>
                <p className="mt-1 text-xs uppercase tracking-[0.1em] text-on-surface-variant">
                  {formatDate(donation.created_at)}
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
        <svg
          aria-hidden="true"
          className={className}
          viewBox="0 0 24 24"
        >
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
  amount: number;
  campaign_slug: string | null;
  created_at: string;
};

async function getMyRecentDonations(email: string): Promise<DonationRow[]> {
  if (!email) {
    return [];
  }

  const { client } = await createSupabaseServerAuthClient();
  if (!client) {
    return [];
  }

  const { data, error } = await client
    .from("donations")
    .select("id, amount, campaign_slug, created_at")
    .eq("email", email)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error || !data) {
    return [];
  }

  return data as DonationRow[];
}
