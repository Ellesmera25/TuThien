import Link from "next/link";

import { getCurrentUser } from "@/lib/supabase/auth-server";
import { AuthSignOutButton } from "@/components/auth-sign-out-button";

const navItems = [
  { href: "/", label: "Trang chu" },
  { href: "/chien-dich", label: "Chien dich" },
  { href: "/quyen-gop", label: "Quyen gop" },
  { href: "/minh-bach", label: "Minh bach" },
];

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-50 px-4 pt-4 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="neo-panel relative overflow-hidden px-4 py-3 sm:px-5">
          <span className="orbit-dot -right-12 -top-12 h-28 w-28 bg-primary/20" />
          <span className="orbit-dot -bottom-10 left-1/3 h-20 w-20 bg-cool/20" />

          <div className="relative flex items-center justify-between gap-4">
            <Link href="/" className="inline-flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent font-display text-sm font-bold text-white shadow-glow">
                TT
              </span>
              <span className="font-display text-lg font-bold tracking-tight text-ink">
                tuthien<span className="text-primary">.vn</span>
              </span>
            </Link>

            <nav className="hidden items-center gap-1 md:flex">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-full px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-white hover:text-ink"
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href="/quan-tri"
                className="rounded-full px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-white hover:text-ink"
              >
                Quan tri
              </Link>
            </nav>

            <div className="hidden items-center gap-2 md:flex">
              {user ? (
                <>
                  <Link
                    href="/tai-khoan"
                    className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-[0.08em] text-slate-700 transition hover:border-primary hover:text-primary"
                  >
                    Tai khoan
                  </Link>
                  <AuthSignOutButton />
                </>
              ) : (
                <>
                  <Link
                    href="/dang-nhap"
                    className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-[0.08em] text-slate-700 transition hover:border-primary hover:text-primary"
                  >
                    Dang nhap
                  </Link>
                  <Link href="/dang-ky" className="neo-btn neo-btn-primary">
                    Dang ky
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>

        <nav className="mt-2 flex gap-2 overflow-x-auto pb-1 md:hidden">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="shrink-0 rounded-full border border-white/70 bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-soft"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href={user ? "/tai-khoan" : "/dang-nhap"}
            className="shrink-0 rounded-full border border-white/70 bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-soft"
          >
            {user ? "Tai khoan" : "Dang nhap"}
          </Link>
        </nav>
      </div>
    </header>
  );
}
