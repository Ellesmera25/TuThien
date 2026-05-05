import type { Metadata } from "next";

import { CampaignCard } from "@/components/campaign-card";
import { getCampaigns } from "@/lib/data";

export const metadata: Metadata = {
  title: "Chiến dịch",
  description:
    "Khám phá các chiến dịch từ thiện đang nhận ủng hộ trên TuThien.vn.",
};

const filters: Array<{
  active?: boolean;
  icon?: FilterIconName;
  label: string;
}> = [
  { active: true, label: "Tất cả" },
  { icon: "book", label: "Giáo dục" },
  { icon: "cross", label: "Y tế" },
  { icon: "spark", label: "Khẩn cấp" },
  { icon: "leaf", label: "Môi trường" },
];

export default async function CampaignListPage() {
  const campaigns = await getCampaigns();

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
          {filters.map((filter) => (
            <button
              key={filter.label}
              type="button"
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition active:scale-95 ${
                filter.active
                  ? "bg-[#5b598c] text-white shadow-sm"
                  : "bg-surface-container text-on-surface-variant hover:bg-surface-highest"
              }`}
            >
              {filter.icon ? (
                <FilterIcon name={filter.icon} className="h-4 w-4" />
              ) : null}
              {filter.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-[220px]">
          <select className="w-full appearance-none rounded-lg border border-outline bg-white px-4 py-3 pr-10 text-base text-on-surface outline-none transition focus:border-primary focus:ring-1 focus:ring-primary">
            <option>Đang huy động</option>
            <option>Sắp hoàn thành</option>
            <option>Đã hoàn thành</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-on-surface-variant">
            <FilterIcon name="chevronDown" className="h-5 w-5" />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {campaigns.map((campaign) => (
          <CampaignCard key={campaign.id} campaign={campaign} />
        ))}
      </section>

      <div className="mt-10 flex justify-center">
        <button
          type="button"
          className="rounded-lg border border-primary px-8 py-3 text-sm font-bold text-primary transition hover:bg-primary-container hover:text-white active:scale-95"
        >
          Xem thêm chiến dịch
        </button>
      </div>
    </div>
  );
}

type FilterIconName = "book" | "chevronDown" | "cross" | "leaf" | "spark";

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
