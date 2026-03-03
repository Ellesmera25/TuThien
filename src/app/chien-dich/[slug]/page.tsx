import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getCampaignBySlug, getTransparencyItems } from "@/lib/data";
import { formatDate, formatVnd } from "@/lib/format";

type CampaignDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: CampaignDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const campaign = await getCampaignBySlug(slug);

  return {
    title: campaign?.title ?? "Chi tiet chien dich",
    description: campaign?.summary ?? "Thong tin chien dich",
  };
}

export default async function CampaignDetailPage({
  params,
}: CampaignDetailPageProps) {
  const { slug } = await params;
  const campaign = await getCampaignBySlug(slug);

  if (!campaign) {
    notFound();
  }

  const logs = await getTransparencyItems(campaign.slug);
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
              <span>{Math.round(progress)}% hoan thanh</span>
              <span>Ket thuc: {formatDate(campaign.endDate)}</span>
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
              label="Da tiep nhan"
              value={formatVnd(campaign.raisedAmount)}
            />
            <MiniStat
              label="Muc tieu"
              value={formatVnd(campaign.targetAmount)}
            />
          </div>
        </div>

        <Link
          href={`/quyen-gop?campaign=${campaign.slug}`}
          className="neo-btn neo-btn-primary mt-7"
        >
          Ung ho chien dich nay
        </Link>
      </section>

      <section className="neo-panel p-6">
        <h2 className="font-display text-2xl font-bold text-ink">
          Nhat ky giai ngan
        </h2>
        {logs.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">Chua co khoan chi nao.</p>
        ) : (
          <ul className="mt-5 space-y-3">
            {logs.map((log, index) => (
              <li
                key={log.id}
                className="relative rounded-xl border border-slate-100 bg-white/80 p-4 pl-5 shadow-soft"
              >
                <span
                  className={`absolute left-0 top-0 h-full w-1 rounded-l-xl ${
                    index % 2 === 0 ? "bg-primary" : "bg-cool"
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
                  Ngay chi: {formatDate(log.spentAt)}
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
