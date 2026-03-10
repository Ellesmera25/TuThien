import Link from "next/link";

import { formatDate, formatPercent, formatVnd } from "@/lib/format";
import type { Campaign } from "@/lib/types";

type CampaignCardProps = {
  campaign: Campaign;
};

const statusLabel: Record<Campaign["status"], string> = {
  active: "Đang gây quỹ",
  completed: "Đã hoàn thành",
  paused: "Tạm dừng",
};

const statusTone: Record<Campaign["status"], string> = {
  active: "text-primary border-primary/20 bg-primary/10",
  completed: "text-mint border-mint/20 bg-mint/10",
  paused: "text-slate-500 border-slate-200 bg-slate-100",
};

export function CampaignCard({ campaign }: CampaignCardProps) {
  const progress =
    campaign.targetAmount > 0
      ? Math.min((campaign.raisedAmount / campaign.targetAmount) * 100, 100)
      : 0;

  return (
    <article className="neo-panel group relative overflow-hidden p-5 transition duration-300 hover:-translate-y-1 hover:shadow-glow">
      <div className="absolute -right-14 -top-14 h-28 w-28 rounded-full bg-primary/20 blur-2xl transition duration-300 group-hover:scale-110" />
      <div className="absolute -bottom-16 left-10 h-32 w-32 rounded-full bg-cool/20 blur-2xl" />

      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="neo-badge">{campaign.coverTag}</span>
          <span
            className={`rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] ${statusTone[campaign.status]}`}
          >
            {statusLabel[campaign.status]}
          </span>
        </div>

        <h3 className="mt-3 font-display text-xl font-bold text-ink">
          {campaign.title}
        </h3>
        <p className="mt-2 line-clamp-2 text-sm text-slate-600">
          {campaign.summary}
        </p>

        <div className="mt-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
            <span>{formatPercent(progress)} hoàn thành</span>
            <span>Hạn {formatDate(campaign.endDate)}</span>
          </div>
          <div className="h-2.5 rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="mt-5 flex items-end justify-between gap-4">
          <div>
            <p className="font-display text-lg font-bold text-ink">
              {formatVnd(campaign.raisedAmount)}
            </p>
            <p className="text-xs text-slate-500">
              Mục tiêu {formatVnd(campaign.targetAmount)}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/chien-dich/${campaign.slug}`}
              className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-[0.08em] text-slate-700 transition hover:border-primary hover:text-primary"
            >
              Chi tiết
            </Link>
            <Link
              href={`/quyen-gop?campaign=${campaign.slug}`}
              className="rounded-full bg-gradient-to-r from-primary to-accent px-3 py-1.5 text-xs font-bold uppercase tracking-[0.08em] text-white transition hover:brightness-110"
            >
              Ủng hộ
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
