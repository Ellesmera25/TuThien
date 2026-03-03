import type { Metadata } from "next";

import { DonationForm } from "@/components/donation-form";
import { getCampaigns } from "@/lib/data";

type DonatePageProps = {
  searchParams: Promise<{ campaign?: string }>;
};

export const metadata: Metadata = {
  title: "Quyen gop",
  description: "Form quyen gop online cho cac chien dich tu thien.",
};

export default async function DonatePage({ searchParams }: DonatePageProps) {
  const campaigns = await getCampaigns();
  const params = await searchParams;
  const initialCampaignSlug = params.campaign ?? "";

  return (
    <div className="grid gap-8 pb-8 lg:grid-cols-[1fr_1fr]">
      <section className="space-y-5">
        <article className="neo-panel-strong p-7 sm:p-8">
          <p className="neo-badge border-white/30 bg-white/20 text-white">Join The Mission</p>
          <h1 className="mt-3 font-display text-4xl font-bold text-white">Gui dong gop cua ban</h1>
          <p className="mt-3 max-w-lg text-sm text-slate-100 sm:text-base">
            Ban co the ung ho theo chien dich cu the hoac quy chung. Toan bo thong
            tin duoc cap nhat trong bang minh bach.
          </p>
        </article>

        <article className="neo-panel p-6">
          <h2 className="font-display text-xl font-bold text-ink">Cam ket nen tang</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li>So tien toi thieu moi giao dich la 10.000d.</li>
            <li>Neu chua ket noi Supabase, he thong se chay demo mode.</li>
            <li>Lich su tiep nhan va giai ngan duoc cap nhat tren trang minh bach.</li>
          </ul>
        </article>
      </section>

      <DonationForm
        campaigns={campaigns.map((campaign) => ({
          slug: campaign.slug,
          title: campaign.title,
        }))}
        initialCampaignSlug={initialCampaignSlug}
      />
    </div>
  );
}
