import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ReelCreateForm } from "@/components/reel-create-form";
import { getCampaigns } from "@/lib/data";
import { getCurrentUser } from "@/lib/supabase/auth-server";

export const metadata: Metadata = {
  title: "Tạo reel",
  description: "Tạo reel tác động mới cho chiến dịch từ thiện.",
};

export const dynamic = "force-dynamic";

export default async function CreateReelPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/dang-nhap?next=/reels/tao");
  }

  const campaigns = await getCampaigns();
  const fullName =
    (user.user_metadata.full_name as string | undefined) ??
    user.email?.split("@")[0] ??
    "TuThien.vn";

  return (
    <div className="grid gap-8 pb-16 lg:grid-cols-[0.85fr_1.15fr]">
      <section className="space-y-5">
        <article className="surface-card rounded-xl p-8">
          <p className="neo-badge">Reels tác động</p>
          <h1 className="mt-4 font-display text-4xl font-bold tracking-tight text-ink">
            Tạo reel mới
          </h1>
          <p className="mt-3 text-sm leading-6 text-on-surface-variant">
            Reel được ghi trực tiếp vào bảng `reels` trong database. Bạn có thể
            gắn reel với một chiến dịch thật, thêm URL video dọc nếu có, hoặc
            để hệ thống dùng cover fallback.
          </p>
        </article>

        <article className="surface-card rounded-xl p-6">
          <h2 className="font-display text-xl font-semibold text-ink">
            Trước khi đăng
          </h2>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-on-surface-variant">
            <li>Chọn đúng chiến dịch để nút quyên góp trong reel dẫn đúng nơi.</li>
            <li>Video nên là tỉ lệ dọc 9:16 để hiển thị đẹp trên feed.</li>
            <li>Không có video URL thì reel vẫn hiển thị bằng cover fallback.</li>
          </ul>
          <Link
            href="/reels"
            className="mt-5 inline-flex text-sm font-bold text-primary hover:text-primary-container"
          >
            Xem feed reels
          </Link>
        </article>
      </section>

      <ReelCreateForm
        campaigns={campaigns.map((campaign) => ({
          slug: campaign.slug,
          title: campaign.title,
        }))}
        defaultCreatorName={fullName}
      />
    </div>
  );
}
