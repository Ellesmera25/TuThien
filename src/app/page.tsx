import Link from "next/link";

import { CampaignCard } from "@/components/campaign-card";
import {
  getCampaigns,
  getDashboardSummary,
  getRecentDonations,
} from "@/lib/data";
import { formatDate, formatVnd } from "@/lib/format";

export default async function HomePage() {
  const [campaigns, summary, recentDonations] = await Promise.all([
    getCampaigns(),
    getDashboardSummary(),
    getRecentDonations(),
  ]);

  const featuredCampaigns = campaigns.slice(0, 3);

  return (
    <div className="space-y-14 pb-8">
      <section className="neo-panel-strong relative overflow-hidden p-7 sm:p-10">
        <span className="orbit-dot -right-12 top-3 h-36 w-36 bg-accent/35" />
        <span className="orbit-dot -bottom-16 left-8 h-40 w-40 bg-cool/22" />

        <div className="relative z-10 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <p className="neo-badge border-white/30 bg-white/20 text-white">
              New Wave Charity
            </p>

            <h1 className="fade-up max-w-3xl font-display text-4xl font-bold leading-tight sm:text-6xl">
              Minh bạch như fintech, nhân văn như cộng đồng.
            </h1>
            <p className="fade-up stagger-1 max-w-2xl text-sm text-slate-100 sm:text-base">
              TuThien.vn kết nối nhà hảo tâm và những dự án cần hỗ trợ, với giao
              diện mới hiện đại, rõ ràng và dễ theo dõi trên mọi thiết bị.
            </p>

            <div className="fade-up stagger-2 flex flex-wrap gap-3">
              <Link href="/quyen-gop" className="neo-btn neo-btn-primary">
                Ủng hộ ngay
              </Link>
              <Link href="/minh-bach" className="neo-btn neo-btn-ghost">
                Xem minh bạch
              </Link>
            </div>
          </div>

          <div className="fade-up stagger-3 neo-panel border-white/20 bg-white/10 p-5 backdrop-blur-md [color:white]">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/80">
                Live Donations
              </p>
              <span className="h-2.5 w-2.5 rounded-full bg-mint shadow-[0_0_16px_rgba(16,185,129,0.9)]" />
            </div>
            <div className="space-y-3">
              {recentDonations.slice(0, 4).map((item) => (
                <article
                  key={item.id}
                  className="rounded-xl border border-white/20 bg-white/10 px-3 py-2.5"
                >
                  <p className="text-sm font-semibold text-white">
                    {item.donorName}
                  </p>
                  <p className="text-xs text-white/80">
                    Ủng hộ{" "}
                    <span className="font-bold">{formatVnd(item.amount)}</span>{" "}
                    - {formatDate(item.createdAt)}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Tổng đã gây quỹ"
          value={formatVnd(summary.totalRaised)}
          tone="warm"
        />
        <MetricCard
          label="Tổng mục tiêu"
          value={formatVnd(summary.totalTarget)}
          tone="cool"
        />
        <MetricCard
          label="Chiến dịch đang chạy"
          value={`${summary.activeCampaignCount}`}
          tone="mint"
        />
        <MetricCard
          label="Nhà hảo tâm tham gia"
          value={`${summary.donorCount}`}
          tone="neutral"
        />
      </section>

      <section className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="neo-badge">Open Campaigns</p>
            <h2 className="mt-2 font-display text-3xl font-bold text-ink">
              Chiến dịch đang nhận ủng hộ
            </h2>
          </div>
          <Link
            href="/chien-dich"
            className="neo-btn rounded-full border border-slate-300 bg-white text-slate-700 hover:border-primary hover:text-primary"
          >
            Xem tất cả
          </Link>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {featuredCampaigns.map((campaign) => (
            <CampaignCard key={campaign.id} campaign={campaign} />
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <article className="neo-panel p-6">
          <p className="neo-badge">Vận hành minh bạch</p>
          <h3 className="mt-3 font-display text-2xl font-bold text-ink">
            Quy trình 3 lớp đối soát
          </h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <StepCard
              index="01"
              title="Kiểm chứng"
              content="Đội ngũ tiếp nhận, xác minh nhu cầu và mục tiêu tài chính."
            />
            <StepCard
              index="02"
              title="Công khai"
              content="Tiến độ và tổng đóng góp cập nhật liên tục theo thời gian."
            />
            <StepCard
              index="03"
              title="Báo cáo"
              content="Mọi khoản chi được lưu vào trang minh bạch kèm đối soát."
            />
          </div>
        </article>

        <article className="neo-panel p-6">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
            Ready to support
          </p>
          <h3 className="mt-2 font-display text-2xl font-bold text-ink">
            Bắt đầu đồng hành ngay hôm nay
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            Chọn chiến dịch phù hợp và gửi đóng góp trong 1 phút.
          </p>
          <Link
            href="/quyen-gop"
            className="neo-btn neo-btn-primary mt-5 w-full"
          >
            Mở form quyên góp
          </Link>
        </article>
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "warm" | "cool" | "mint" | "neutral";
}) {
  const toneClass: Record<typeof tone, string> = {
    warm: "from-primary/10 to-accent/10",
    cool: "from-cool/14 to-haze/70",
    mint: "from-mint/16 to-white",
    neutral: "from-slate-100/80 to-white",
  };

  return (
    <article className={`neo-panel bg-gradient-to-br ${toneClass[tone]} p-5`}>
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <p className="mt-3 font-display text-2xl font-bold text-ink">{value}</p>
    </article>
  );
}

function StepCard({
  index,
  title,
  content,
}: {
  index: string;
  title: string;
  content: string;
}) {
  return (
    <article className="rounded-xl border border-white/70 bg-white/75 p-4 shadow-soft">
      <p className="font-mono text-xs font-bold uppercase tracking-[0.1em] text-primary">
        {index}
      </p>
      <h4 className="mt-2 font-display text-base font-bold text-ink">
        {title}
      </h4>
      <p className="mt-1.5 text-sm text-slate-600">{content}</p>
    </article>
  );
}
