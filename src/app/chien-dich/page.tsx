import type { Metadata } from "next";

import { CampaignCard } from "@/components/campaign-card";
import { getCampaigns } from "@/lib/data";

export const metadata: Metadata = {
  title: "Chien dich",
  description: "Danh sach cac chien dich tu thien dang va da trien khai.",
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
          Tat ca chien dich
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-100 sm:text-base">
          Theo doi tien do va dong gop cho cac chien dich dang mo. Moi card du
          an hien thi ro muc tieu, so da gay quy va han ket thuc.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          <StatusPill label={`Dang mo: ${activeCount}`} />
          <StatusPill label={`Da hoan thanh: ${completedCount}`} />
          <StatusPill label={`Tong chien dich: ${campaigns.length}`} />
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
