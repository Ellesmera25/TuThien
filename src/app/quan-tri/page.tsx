import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCampaigns, getDashboardSummary } from "@/lib/data";
import { formatVnd } from "@/lib/format";
import { getCurrentUser } from "@/lib/supabase/auth-server";

export const metadata: Metadata = {
  title: "Quan tri",
  description: "Trang quan tri toi gian cho bo phan dieu phoi.",
};

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/dang-nhap?next=/quan-tri");
  }

  const [summary, campaigns] = await Promise.all([
    getDashboardSummary(),
    getCampaigns(),
  ]);

  return (
    <div className="space-y-8 pb-8">
      <header className="neo-panel p-7 sm:p-8">
        <p className="neo-badge">Operations Console</p>
        <h1 className="mt-3 font-display text-4xl font-bold text-ink">
          Bang dieu khien quan tri
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-600">
          Dashboard tong quan cho doi van hanh de theo doi dong tien, trang thai
          va tien do cua tung chien dich.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <Metric
          label="Tong tien tiep nhan"
          value={formatVnd(summary.totalRaised)}
          tone="warm"
        />
        <Metric
          label="So chien dich"
          value={`${summary.campaignCount}`}
          tone="cool"
        />
        <Metric
          label="Nha hao tam"
          value={`${summary.donorCount}`}
          tone="mint"
        />
      </section>

      <section className="neo-panel p-6">
        <h2 className="font-display text-2xl font-bold text-ink">
          Tien do chien dich
        </h2>
        <ul className="mt-4 space-y-3">
          {campaigns.map((campaign) => {
            const progress =
              campaign.targetAmount > 0
                ? Math.min(
                    (campaign.raisedAmount / campaign.targetAmount) * 100,
                    100,
                  )
                : 0;

            return (
              <li
                key={campaign.id}
                className="rounded-xl border border-slate-100 bg-white/80 p-4 shadow-soft"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-bold text-ink">{campaign.title}</p>
                  <p className="text-sm font-semibold text-primary">
                    {Math.round(progress)}%
                  </p>
                </div>
                <div className="mt-2 h-2.5 rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {formatVnd(campaign.raisedAmount)} /{" "}
                  {formatVnd(campaign.targetAmount)}
                </p>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "warm" | "cool" | "mint";
}) {
  const toneClass: Record<typeof tone, string> = {
    warm: "from-primary/10 to-accent/10",
    cool: "from-cool/15 to-haze/70",
    mint: "from-mint/18 to-white",
  };

  return (
    <article className={`neo-panel bg-gradient-to-br ${toneClass[tone]} p-5`}>
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 font-display text-2xl font-bold text-ink">{value}</p>
    </article>
  );
}
