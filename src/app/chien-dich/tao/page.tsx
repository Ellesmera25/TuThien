import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CampaignCreateForm } from "@/components/campaign-create-form";
import {
    getCurrentUser,
    getCurrentUserRole,
} from "@/lib/supabase/auth-server";

export const metadata: Metadata = {
    title: "Tạo dự án",
    description: "Tạo chiến dịch thiện nguyện mới trên TuThien.vn",
};

export const dynamic = "force-dynamic";

export default async function CreateCampaignPage() {
    const user = await getCurrentUser();

    if (!user) {
        redirect("/dang-nhap?next=/chien-dich/tao");
    }

    const role = await getCurrentUserRole();

    if (role !== "project_owner") {
        redirect("/tai-khoan");
    }

    return (
        <div className="pb-10">
            <section className="relative overflow-hidden rounded-3xl border border-outline-variant/40 bg-gradient-to-br from-primary-fixed via-white to-haze p-8 shadow-card md:p-10">
                <div className="absolute right-8 top-8 hidden h-28 w-28 rounded-full bg-white/70 blur-2xl md:block" />
                <div className="absolute bottom-0 right-0 hidden h-48 w-48 rounded-full bg-primary/10 blur-3xl md:block" />

                <div className="relative max-w-3xl">
                    <p className="neo-badge">Tạo dự án mới</p>

                    <h1 className="mt-4 font-display text-4xl font-black tracking-tight text-ink md:text-5xl">
                        Bắt đầu một chiến dịch thiện nguyện minh bạch.
                    </h1>

                    <p className="mt-4 max-w-2xl text-base leading-7 text-on-surface-variant">
                        Cung cấp thông tin dự án, hình ảnh thực tế và giai đoạn hỗ trợ đầu
                        tiên. Dự án sẽ được gửi đến admin để xét duyệt trước khi hiển thị
                        công khai.
                    </p>

                    <div className="mt-6 grid gap-3 text-sm font-semibold text-slate-700 md:grid-cols-3">
                        <div className="rounded-2xl bg-white/80 p-4 shadow-soft">
                            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
                                Bước 1
                            </p>
                            <p className="mt-1 text-ink">Thông tin dự án</p>
                        </div>

                        <div className="rounded-2xl bg-white/80 p-4 shadow-soft">
                            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
                                Bước 2
                            </p>
                            <p className="mt-1 text-ink">Ảnh minh chứng</p>
                        </div>

                        <div className="rounded-2xl bg-white/80 p-4 shadow-soft">
                            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
                                Bước 3
                            </p>
                            <p className="mt-1 text-ink">Giai đoạn đầu tiên</p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="mt-8 rounded-3xl border border-outline-variant/40 bg-white p-6 shadow-card md:p-8">
                <CampaignCreateForm />
            </section>
        </div>
    );
}