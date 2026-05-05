import Link from "next/link";

const links = [
  { href: "/minh-bach", label: "Báo cáo tài chính" },
  { href: "/chien-dich", label: "Chiến dịch" },
  { href: "/quyen-gop", label: "Quyên góp" },
  { href: "/reels", label: "Reels tác động" },
];

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-outline-variant/30 bg-stone-50">
      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-12 md:grid-cols-[1fr_1.3fr]">
        <div className="flex flex-col gap-4">
          <span className="font-display text-xl font-bold tracking-tight text-ink">
            TuThien<span className="text-primary">.vn</span>
          </span>
          <p className="max-w-md text-sm leading-6 text-slate-500">
            Nền tảng kết nối cộng đồng với các chiến dịch xã hội, tập trung vào
            câu chuyện thật, dòng tiền rõ ràng và báo cáo dễ kiểm chứng.
          </p>
        </div>

        <nav className="flex flex-wrap gap-4 md:justify-end md:gap-8">
          {links.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="font-display text-sm font-semibold text-slate-500 underline-offset-4 transition hover:text-primary hover:underline"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
