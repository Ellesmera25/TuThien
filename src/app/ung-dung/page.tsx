import Link from "next/link";

import { getMobileAppLinks } from "@/lib/app-links";

const appHighlights = [
  "Cài như app thật trên điện thoại",
  "Quyên góp nhanh hơn với giao diện mobile-first",
  "Có thể phát hành APK riêng hoặc đưa lên Google Play",
];

export default function MobileAppPage() {
  const { apkUrl, hasApk, hasPlayStore, playStoreUrl } = getMobileAppLinks();

  return (
    <div className="pb-8">
      <section className="grid gap-8 py-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-16">
        <div className="space-y-6">
          <div className="neo-badge w-max">Ứng dụng di động</div>
          <div className="space-y-4">
            <h1 className="font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl">
              Tải app TuThien.vn trên điện thoại
            </h1>
            <p className="max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
              Dùng bản app để người quyên góp mở nhanh hơn, theo dõi chiến dịch
              thuận tiện hơn và đi đến trang thanh toán chỉ trong vài chạm.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {hasApk ? (
              <a
                href={apkUrl}
                className="neo-btn neo-btn-primary px-6"
                download
              >
                Tải APK
              </a>
            ) : (
              <span className="neo-btn neo-btn-primary cursor-not-allowed px-6 opacity-60">
                APK chưa phát hành
              </span>
            )}

            {hasPlayStore ? (
              <a href={playStoreUrl} className="neo-btn neo-btn-ghost px-6">
                Mở Google Play
              </a>
            ) : (
              <span className="neo-btn neo-btn-ghost cursor-not-allowed px-6 opacity-60">
                Chưa có trên Play Store
              </span>
            )}

            <Link href="/" className="neo-btn neo-btn-ghost px-6">
              Về trang chủ
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {appHighlights.map((item) => (
              <article key={item} className="surface-card rounded-xl p-4 text-sm font-semibold text-slate-600">
                {item}
              </article>
            ))}
          </div>
        </div>

        <div className="surface-card overflow-hidden rounded-[28px] p-5 sm:p-6">
          <div className="rounded-[24px] bg-[radial-gradient(circle_at_top,rgba(255,181,153,0.72),rgba(249,115,22,0.16)_34%,rgba(255,255,255,0.98)_75%)] p-6">
            <div className="mx-auto max-w-sm rounded-[28px] border border-white/70 bg-white/95 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                <span>TuThien.vn</span>
                <span>Mobile app</span>
              </div>

              <div className="mt-6 rounded-[24px] bg-[linear-gradient(135deg,#f97316,#a33900)] p-6 text-white shadow-lg">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/80">
                  Cổng quyên góp
                </p>
                <h2 className="mt-2 text-3xl font-bold leading-tight">
                  Ủng hộ nhanh, minh bạch, gọn trên điện thoại
                </h2>
                <p className="mt-3 text-sm leading-6 text-white/88">
                  Tối ưu cho màn hình nhỏ, phù hợp phát hành APK độc lập hoặc
                  đưa lên Google Play.
                </p>
              </div>

              <div className="mt-5 grid gap-3 text-sm text-slate-600">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="font-bold text-ink">APK</p>
                  <p className="mt-1">
                    {hasApk
                      ? "Đã có link tải APK sẵn sàng cho Android."
                      : "Thêm NEXT_PUBLIC_ANDROID_APK_URL để bật nút tải APK."}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="font-bold text-ink">Google Play</p>
                  <p className="mt-1">
                    {hasPlayStore
                      ? "Đã có link Play Store để mở trực tiếp."
                      : "Thêm NEXT_PUBLIC_PLAY_STORE_URL để bật nút Play Store."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        <article className="surface-card rounded-xl p-6">
          <p className="neo-badge w-max">APK riêng</p>
          <h3 className="mt-4 font-display text-2xl font-bold text-ink">
            Phát hành độc lập
          </h3>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Dùng khi bạn muốn người dùng tải file cài đặt trực tiếp từ website.
          </p>
        </article>

        <article className="surface-card rounded-xl p-6">
          <p className="neo-badge w-max">Google Play</p>
          <h3 className="mt-4 font-display text-2xl font-bold text-ink">
            Phân phối trên store
          </h3>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Dùng cho bản phát hành chính thức, cập nhật dễ dàng và cài đặt an
            toàn hơn.
          </p>
        </article>

        <article className="surface-card rounded-xl p-6">
          <p className="neo-badge w-max">PWA</p>
          <h3 className="mt-4 font-display text-2xl font-bold text-ink">
            Cài ngay từ trình duyệt
          </h3>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Nếu chưa có APK hoặc Play Store, người dùng vẫn có thể thêm app ra
            màn hình chính.
          </p>
        </article>
      </section>
    </div>
  );
}