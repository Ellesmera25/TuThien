import Link from "next/link";
import type { Metadata } from "next";

import { CampaignCard } from "@/components/campaign-card";
import {
  campaignCategories,
  getCampaignCategory,
  type CampaignCategory,
} from "@/lib/campaign-category";
import { getCampaigns } from "@/lib/data";
import type { Campaign } from "@/lib/types";

export const metadata: Metadata = {
  title: "Chiến dịch",
  description:
    "Khám phá các chiến dịch từ thiện đang nhận ủng hộ trên TuThien.vn.",
};

type CampaignListPageProps = {
  searchParams: Promise<{
    category?: string;
    page?: string;
    status?: string;
  }>;
};

const pageSize = 6;

const filterItems: Array<{
  icon?: FilterIconName;
  label: string;
  value?: CampaignCategory;
}> = [
  { label: "Tất cả" },
  { icon: "book", label: "Giáo dục", value: "education" },
  { icon: "cross", label: "Y tế", value: "health" },
  { icon: "spark", label: "Khẩn cấp", value: "emergency" },
  { icon: "leaf", label: "Môi trường", value: "environment" },
];

export default async function CampaignListPage({
  searchParams,
}: CampaignListPageProps) {
  const params = await searchParams;
  const selectedCategory = normalizeCategory(params.category);
  const selectedStatus = normalizeStatus(params.status);
  const currentPage = Math.max(Number(params.page ?? "1") || 1, 1);

  const campaigns = await getCampaigns();
  const filteredCampaigns = campaigns.filter((campaign) => {
    if (selectedCategory && getCampaignCategory(campaign) !== selectedCategory) {
      return false;
    }

    return matchesStatus(campaign, selectedStatus);
  });
  const visibleCampaigns = filteredCampaigns.slice(0, currentPage * pageSize);
  const hasMore = visibleCampaigns.length < filteredCampaigns.length;

  return (
    <div className="pb-20">
      <header className="mb-12 pt-8 md:pt-14">
        <h1 className="font-display text-5xl font-bold leading-tight tracking-tight text-on-surface md:text-6xl">
          Khám phá các chiến dịch
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-on-surface-variant">
          Đóng góp của bạn, dù nhỏ nhất, cũng mang lại sự thay đổi lớn. Mỗi dự
          án đều minh bạch, rõ ràng và trực tiếp đến tay người cần.
        </p>
      </header>

      <section className="surface-card mb-8 grid gap-4 rounded-lg p-3 md:grid-cols-[1fr_auto] md:items-center">
        <div className="flex flex-wrap justify-start gap-2">
          {filterItems.map((filter) => {
            const active = selectedCategory === filter.value;

            return (
              <Link
                key={filter.label}
                href={buildCampaignHref({
                  category: filter.value,
                  status: selectedStatus,
                })}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition active:scale-95 ${
                  active
                    ? "bg-[#5b598c] text-white shadow-sm"
                    : "bg-surface-container text-on-surface-variant hover:bg-surface-highest"
                }`}
              >
                {filter.icon ? (
                  <FilterIcon name={filter.icon} className="h-4 w-4" />
                ) : null}
                {filter.label}
              </Link>
            );
          })}
        </div>

        <form action="/chien-dich" className="flex w-full gap-2 md:w-auto">
          {selectedCategory ? (
            <input type="hidden" name="category" value={selectedCategory} />
          ) : null}
          <div className="relative min-w-0 flex-1 md:w-[220px]">
            <select
              name="status"
              defaultValue={selectedStatus}
              className="w-full appearance-none rounded-lg border border-outline bg-white px-4 py-3 pr-10 text-base text-on-surface outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
            >
              <option value="active">Đang huy động</option>
              <option value="near_done">Sắp hoàn thành</option>
              <option value="completed">Đã hoàn thành</option>
              <option value="all">Tất cả trạng thái</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-on-surface-variant">
              <FilterIcon name="chevronDown" className="h-5 w-5" />
            </div>
          </div>
          <button
            type="submit"
            className="rounded-lg bg-primary px-4 py-3 text-sm font-bold text-white transition hover:bg-primary-container active:scale-95"
          >
            Lọc
          </button>
        </form>
      </section>

      {visibleCampaigns.length > 0 ? (
        <section className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {visibleCampaigns.map((campaign) => (
            <CampaignCard key={campaign.id} campaign={campaign} />
          ))}
        </section>
      ) : (
        <section className="surface-card rounded-xl p-8 text-center">
          <h2 className="font-display text-2xl font-semibold text-on-surface">
            Chưa có chiến dịch phù hợp
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-on-surface-variant">
            Trang này chỉ hiển thị dữ liệu thật từ database. Hãy thêm chiến dịch
            trong bảng `campaigns` hoặc đổi bộ lọc hiện tại.
          </p>
        </section>
      )}

      {hasMore ? (
        <div className="mt-10 flex justify-center">
          <Link
            href={buildCampaignHref({
              category: selectedCategory,
              page: currentPage + 1,
              status: selectedStatus,
            })}
            className="rounded-lg border border-primary px-8 py-3 text-sm font-bold text-primary transition hover:bg-primary-container hover:text-white active:scale-95"
          >
            Xem thêm chiến dịch
          </Link>
        </div>
      ) : null}
    </div>
  );
}

type CampaignStatusFilter = "active" | "all" | "completed" | "near_done";

type FilterIconName = "book" | "chevronDown" | "cross" | "leaf" | "spark";

function buildCampaignHref({
  category,
  page,
  status,
}: {
  category?: CampaignCategory;
  page?: number;
  status: CampaignStatusFilter;
}) {
  const params = new URLSearchParams();

  if (category) {
    params.set("category", category);
  }

  if (status !== "active") {
    params.set("status", status);
  }

  if (page && page > 1) {
    params.set("page", String(page));
  }

  const query = params.toString();
  return query ? `/chien-dich?${query}` : "/chien-dich";
}

function matchesStatus(campaign: Campaign, status: CampaignStatusFilter) {
  if (status === "all") {
    return true;
  }

  if (status === "completed") {
    return campaign.status === "completed";
  }

  const progress =
    campaign.targetAmount > 0
      ? (campaign.raisedAmount / campaign.targetAmount) * 100
      : 0;

  if (status === "near_done") {
    return campaign.status !== "completed" && progress >= 85;
  }

  return campaign.status === "active";
}

function normalizeCategory(value?: string): CampaignCategory | undefined {
  return campaignCategories.some((category) => category.value === value)
    ? (value as CampaignCategory)
    : undefined;
}

function normalizeStatus(value?: string): CampaignStatusFilter {
  return value === "all" || value === "completed" || value === "near_done"
    ? value
    : "active";
}

function FilterIcon({
  className,
  name,
}: {
  className: string;
  name: FilterIconName;
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
    case "chevronDown":
      return (
        <svg {...common} aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
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
