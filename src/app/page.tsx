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
              Minh bach nhu fintech, nhan van nhu cong dong.
            </h1>
            <p className="fade-up stagger-1 max-w-2xl text-sm text-slate-100 sm:text-base">
              TuThien.vn ket noi nha hao tam va nhung du an can ho tro, voi giao
              dien moi hien dai, ro rang va de theo doi tren moi thiet bi.
            </p>

            <div className="fade-up stagger-2 flex flex-wrap gap-3">
              <Link href="/quyen-gop" className="neo-btn neo-btn-primary">
                Ung ho ngay
              </Link>
              <Link href="/minh-bach" className="neo-btn neo-btn-ghost">
                Xem minh bach
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
                    Ung ho{" "}
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
          label="Tong da gay quy"
          value={formatVnd(summary.totalRaised)}
          tone="warm"
        />
        <MetricCard
          label="Tong muc tieu"
          value={formatVnd(summary.totalTarget)}
          tone="cool"
        />
        <MetricCard
          label="Chien dich dang chay"
          value={`${summary.activeCampaignCount}`}
          tone="mint"
        />
        <MetricCard
          label="Nha hao tam tham gia"
          value={`${summary.donorCount}`}
          tone="neutral"
        />
      </section>

      <section className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="neo-badge">Open Campaigns</p>
            <h2 className="mt-2 font-display text-3xl font-bold text-ink">
              Chien dich dang nhan ung ho
            </h2>
          </div>
          <Link
            href="/chien-dich"
            className="neo-btn rounded-full border border-slate-300 bg-white text-slate-700 hover:border-primary hover:text-primary"
          >
            Xem tat ca
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
          <p className="neo-badge">Van hanh minh bach</p>
          <h3 className="mt-3 font-display text-2xl font-bold text-ink">
            Quy trinh 3 lop doi soat
          </h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <StepCard
              index="01"
              title="Kiem chung"
              content="Doi ngu tiep nhan, xac minh nhu cau va muc tieu tai chinh."
            />
            <StepCard
              index="02"
              title="Cong khai"
              content="Tien do va tong dong gop cap nhat lien tuc theo thoi gian."
            />
            <StepCard
              index="03"
              title="Bao cao"
              content="Moi khoan chi duoc luu vao trang minh bach kem doi soat."
            />
          </div>
        </article>

        <article className="neo-panel p-6">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
            Ready to support
          </p>
          <h3 className="mt-2 font-display text-2xl font-bold text-ink">
            Bat dau dong hanh ngay hom nay
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            Chon chien dich phu hop va gui dong gop trong 1 phut.
          </p>
          <Link
            href="/quyen-gop"
            className="neo-btn neo-btn-primary mt-5 w-full"
          >
            Mo form quyen gop
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
