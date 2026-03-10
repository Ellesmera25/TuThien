import type { Metadata } from "next";

import { DonationForm } from "@/components/donation-form";
import { getCampaigns } from "@/lib/data";

type DonatePageProps = {
  searchParams: Promise<{ campaign?: string }>;
};

export const metadata: Metadata = {
  title: "Quyên góp",
  description: "Form quyên góp online cho các chiến dịch từ thiện.",
};

export default async function DonatePage({ searchParams }: DonatePageProps) {
  const campaigns = await getCampaigns();
  const params = await searchParams;
  const initialCampaignSlug = params.campaign ?? "";

  return (
    <div className="grid gap-8 pb-8 lg:grid-cols-[1fr_1fr]">
      <section className="space-y-5">
        <article className="neo-panel-strong p-7 sm:p-8">
          <p className="neo-badge border-white/30 bg-white/20 text-white">
            Join The Mission
          </p>
          <h1 className="mt-3 font-display text-4xl font-bold text-white">
            Gửi đóng góp của bạn
          </h1>
          <p className="mt-3 max-w-lg text-sm text-slate-100 sm:text-base">
            Bạn có thể ủng hộ theo chiến dịch cụ thể hoặc quỹ chung. Toàn bộ
            thông tin được cập nhật trong bảng minh bạch.
          </p>
        </article>

        <article className="neo-panel p-6">
          <h2 className="font-display text-xl font-bold text-ink">
            Cam kết nền tảng
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li>Số tiền tối thiểu mỗi giao dịch là 10.000đ.</li>
            <li>Nếu chưa kết nối Supabase, hệ thống sẽ chạy demo mode.</li>
            <li>
              Lịch sử tiếp nhận và giải ngân được cập nhật trên trang minh bạch.
            </li>
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
