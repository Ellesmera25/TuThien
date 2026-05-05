import Link from "next/link";

import { formatVnd } from "@/lib/format";
import type { Campaign } from "@/lib/types";

type CampaignCardProps = {
  campaign: Campaign;
};

type Category = {
  icon: "book" | "cross" | "leaf" | "spark";
  label: string;
};

const campaignMeta: Record<
  string,
  { category: Category; image: string; urgency?: string }
> = {
  "hoc-bong-em-den-truong-2026": {
    category: { icon: "book", label: "Giáo dục" },
    image:
      "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=1200&q=80",
  },
  "bep-an-0-dong-nhi-dong-2": {
    category: { icon: "cross", label: "Y tế" },
    image:
      "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=1200&q=80",
  },
  "nuoc-sach-lin-ho": {
    category: { icon: "leaf", label: "Môi trường" },
    image:
      "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=80",
  },
};

export function CampaignCard({ campaign }: CampaignCardProps) {
  const progress =
    campaign.targetAmount > 0
      ? Math.min((campaign.raisedAmount / campaign.targetAmount) * 100, 100)
      : 0;
  const meta =
    campaignMeta[campaign.slug] ??
    ({
      category: { icon: "spark", label: "Khẩn cấp" },
      image:
        "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=1200&q=80",
    } satisfies { category: Category; image: string });
  const statusText = getCampaignStatusText(campaign, progress);

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-surface-variant bg-surface-lowest shadow-ambient transition duration-300 hover:-translate-y-1 hover:shadow-card">
      <Link
        href={`/chien-dich/${campaign.slug}`}
        className="relative h-48 overflow-hidden bg-surface-container"
      >
        <div
          role="img"
          aria-label={campaign.title}
          className="h-full w-full bg-cover bg-center transition duration-500 group-hover:scale-105"
          style={{ backgroundImage: `url(${meta.image})` }}
        />
        <div className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-primary backdrop-blur">
          <CategoryIcon name={meta.category.icon} className="h-3.5 w-3.5" />
          {meta.category.label}
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-8">
        <Link href={`/chien-dich/${campaign.slug}`}>
          <h3 className="line-clamp-2 font-display text-2xl font-semibold leading-tight text-on-surface transition group-hover:text-primary">
            {campaign.title}
          </h3>
        </Link>
        <p className="mt-3 line-clamp-3 flex-1 text-base leading-7 text-on-surface-variant">
          {campaign.summary}
        </p>

        <div className="mt-6 border-t border-outline-variant/30 pt-5">
          <div className="mb-3 flex items-end justify-between gap-4">
            <div>
              <p className="mb-1 text-xs font-semibold text-on-surface-variant">
                Đã đạt được
              </p>
              <p className="text-sm font-bold text-on-surface">
                {formatVnd(campaign.raisedAmount)}
              </p>
            </div>
            <div className="text-right">
              <p className="mb-1 text-xs font-semibold text-on-surface-variant">
                Mục tiêu
              </p>
              <p className="text-sm font-bold text-on-surface-variant">
                {formatVnd(campaign.targetAmount)}
              </p>
            </div>
          </div>

          <div className="mb-5 h-2 overflow-hidden rounded-full bg-surface-container">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <span
              className={`flex items-center gap-1 text-xs font-semibold ${
                progress >= 85 || campaign.status === "completed"
                  ? "text-primary"
                  : "text-on-surface-variant"
              }`}
            >
              <StatusIcon
                done={progress >= 85 || campaign.status === "completed"}
                className="h-3.5 w-3.5"
              />
              {statusText}
            </span>
            <Link
              href={`/quyen-gop?campaign=${campaign.slug}`}
              className="rounded-lg bg-primary px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-primary-container active:scale-95"
            >
              Ủng hộ ngay
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

function getCampaignStatusText(campaign: Campaign, progress: number): string {
  if (campaign.status === "completed") {
    return "Đã hoàn thành";
  }

  if (progress >= 85) {
    return "Sắp hoàn thành";
  }

  const endDate = new Date(campaign.endDate);
  const now = new Date();
  const diffDays = Math.ceil(
    (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays <= 0) {
    return "Đã kết thúc";
  }

  return `Còn ${diffDays} ngày`;
}

function CategoryIcon({
  className,
  name,
}: {
  className: string;
  name: Category["icon"];
}) {
  const common = {
    className,
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 2,
    viewBox: "0 0 24 24",
  };

  switch (name) {
    case "book":
      return (
        <svg {...common} aria-hidden="true">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15Z" />
        </svg>
      );
    case "cross":
      return (
        <svg {...common} aria-hidden="true">
          <path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z" />
        </svg>
      );
    case "leaf":
      return (
        <svg {...common} aria-hidden="true">
          <path d="M20 4C11 4 5 10 5 19" />
          <path d="M20 4c0 9-6 15-15 15" />
        </svg>
      );
    case "spark":
      return (
        <svg {...common} aria-hidden="true">
          <path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
        </svg>
      );
  }
}

function StatusIcon({ className, done }: { className: string; done: boolean }) {
  if (done) {
    return (
      <svg
        aria-hidden="true"
        className={className}
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="m8.5 12.5 2 2 5-5" />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
