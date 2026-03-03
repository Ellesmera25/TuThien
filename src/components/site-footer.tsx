import Link from "next/link";

const links = [
  { href: "/", label: "Trang chu" },
  { href: "/chien-dich", label: "Chien dich" },
  { href: "/quyen-gop", label: "Quyen gop" },
  { href: "/minh-bach", label: "Minh bach" },
];

export function SiteFooter() {
  return (
    <footer className="mt-16 px-4 pb-10 sm:px-6">
      <div className="neo-panel mx-auto max-w-7xl overflow-hidden p-6 sm:p-8">
        <div className="grid gap-8 md:grid-cols-[1.2fr_1fr_1fr]">
          <div>
            <p className="font-display text-2xl font-bold text-ink">
              TuThien<span className="text-primary">.vn</span>
            </p>
            <p className="mt-3 max-w-md text-sm text-slate-600">
              Nen tang gay quy minh bach, toi uu cho ca desktop va mobile, giup
              cong dong theo doi moi dong gop theo cach ro rang nhat.
            </p>
          </div>

          <div className="space-y-2 text-sm text-slate-600">
            <p className="font-display text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
              Dieu huong
            </p>
            {links.map((item) => (
              <Link key={item.href} href={item.href} className="block hover:text-primary">
                {item.label}
              </Link>
            ))}
          </div>

          <div className="space-y-2 text-sm text-slate-600">
            <p className="font-display text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
              Lien he
            </p>
            <p>hello@tuthien.vn</p>
            <p>0899 000 111</p>
            <p>TP.HCM - Viet Nam</p>
          </div>
        </div>

        <div className="mt-7 border-t border-white/70 pt-4 text-xs text-slate-500">
          2026 TuThien.vn. Transparency-first donation platform.
        </div>
      </div>
    </footer>
  );
}
