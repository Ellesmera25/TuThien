import type { Metadata } from "next";

import { CampaignCard } from "@/components/campaign-card";
import { getCampaigns } from "@/lib/data";

export const metadata: Metadata = {
  title: "Chiến dịch",
  description: "Danh sách các chiến dịch từ thiện đang và đã triển khai.",
};

export default async function CampaignListPage() {
  const campaigns = await getCampaigns();

  const activeCount = campaigns.filter(
    (item) => item.status === "active",
  ).length;
  const completedCount = campaigns.filter(
    (item) => item.status === "completed",
  ).length;

  return (
    <div className="space-y-8 pb-8">
      <header className="neo-panel-strong p-7 sm:p-9">
        <p className="neo-badge border-white/30 bg-white/20 text-white">
          Campaign Directory
        </p>
        <h1 className="mt-3 max-w-3xl font-display text-4xl font-bold text-white sm:text-5xl">
          Tất cả chiến dịch
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-100 sm:text-base">
          Theo dõi tiến độ và đóng góp cho các chiến dịch đang mở. Mỗi card dự
          án hiển thị rõ mục tiêu, số đã gây quỹ và hạn kết thúc.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          <StatusPill label={`Đang mở: ${activeCount}`} />
          <StatusPill label={`Đã hoàn thành: ${completedCount}`} />
          <StatusPill label={`Tổng chiến dịch: ${campaigns.length}`} />
        </div>
      </header>

      <section className="grid gap-5 lg:grid-cols-3">
        {campaigns.map((campaign) => (
          <CampaignCard key={campaign.id} campaign={campaign} />
        ))}
      </section>
    </div>
  );
}

function StatusPill({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-white/30 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.08em] text-white/90">
      {label}
    </span>
  );
}
