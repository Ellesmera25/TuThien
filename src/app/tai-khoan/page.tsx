import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthSignOutButton } from "@/components/auth-sign-out-button";
import { formatDate, formatVnd } from "@/lib/format";
import {
  createSupabaseServerAuthClient,
  getCurrentUser,
} from "@/lib/supabase/auth-server";

export const metadata: Metadata = {
  title: "Tài khoản",
  description: "Thông tin tài khoản thành viên",
};

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/dang-nhap?next=/tai-khoan");
  }

  const fullName =
    (user.user_metadata.full_name as string | undefined) ?? "Thành viên";
  const recentDonations = await getMyRecentDonations(user.email ?? "");

  return (
    <div className="space-y-6 pb-8">
      <section className="neo-panel p-6 sm:p-7">
        <p className="neo-badge">Member Profile</p>
        <h1 className="mt-3 font-display text-3xl font-bold text-ink">
          Xin chào, {fullName}
        </h1>
        <p className="mt-2 text-sm text-slate-600">Email: {user.email}</p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link href="/quyen-gop" className="neo-btn neo-btn-primary">
            Tạo đóng góp mới
          </Link>
          <Link
            href="/quan-tri"
            className="neo-btn rounded-full border border-slate-300 bg-white text-slate-700 hover:border-primary hover:text-primary"
          >
            Mở quản trị
          </Link>
          <AuthSignOutButton />
        </div>
      </section>

      <section className="neo-panel p-6">
        <h2 className="font-display text-2xl font-bold text-ink">
          Lịch sử đóng góp
        </h2>
        {recentDonations.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">
            Chưa có dữ liệu đóng góp. Bạn có thể tạo đóng góp mới tại trang
            quyên góp.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {recentDonations.map((donation) => (
              <li
                key={donation.id}
                className="rounded-xl border border-slate-100 bg-white/80 p-4 shadow-soft"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-ink">
                    {donation.campaign_slug ?? "Quỹ chung"}
                  </p>
                  <p className="text-sm font-bold text-primary">
                    {formatVnd(donation.amount)}
                  </p>
                </div>
                <p className="mt-1 text-xs uppercase tracking-[0.1em] text-slate-500">
                  {formatDate(donation.created_at)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

type DonationRow = {
  id: string;
  amount: number;
  campaign_slug: string | null;
  created_at: string;
};

async function getMyRecentDonations(email: string): Promise<DonationRow[]> {
  if (!email) {
    return [];
  }

  const { client } = await createSupabaseServerAuthClient();
  if (!client) {
    return [];
  }

  const { data, error } = await client
    .from("donations")
    .select("id, amount, campaign_slug, created_at")
    .eq("email", email)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error || !data) {
    return [];
  }

  return data as DonationRow[];
}
