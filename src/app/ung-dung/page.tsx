"use client";

import { getMobileAppLinks } from "@/lib/app-links";

export default function MobileAppPage() {
  const { apkUrl, hasApk } = getMobileAppLinks();

  return (
    <div className="pb-8">
      <section className="flex flex-col items-center justify-center gap-8 py-16 text-center">
        <div className="space-y-4">
          <div className="neo-badge mx-auto w-max">Ứng dụng di động</div>
          <h1 className="font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl">
            Tải app TuThien.vn trên điện thoại
          </h1>
          <p className="mx-auto max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
            Quyên góp nhanh hơn với giao diện được tối ưu cho điện thoại.
          </p>
        </div>

        {hasApk ? (
          <a
            href={apkUrl}
            className="neo-btn neo-btn-primary px-8 py-3 text-lg"
            download
          >
            Tải ứng dụng ngay
          </a>
        ) : (
          <span className="neo-btn neo-btn-primary cursor-not-allowed px-8 py-3 text-lg opacity-60">
            Ứng dụng sẽ sớm phát hành
          </span>
        )}
      </section>
    </div>
  );
}
