import Link from "next/link";

import { AuthSignOutButton } from "@/components/auth-sign-out-button";
import {
    canAccessAdmin,
    getCurrentUser,
    getCurrentUserRole,
} from "@/lib/supabase/auth-server";
import type { UserRole } from "@/lib/supabase/auth-server";

const navItems = [
    { href: "/", label: "Trang chủ" },
    { href: "/chien-dich", label: "Chiến dịch" },
    { href: "/reels", label: "Reels" },
    { href: "/quyen-gop", label: "Quyên góp" },
    { href: "/minh-bach", label: "Minh bạch" },
    { href: "/ung-dung", label: "Ứng dụng" },
];

type HeaderItem = {
    href: string;
    label: string;
};

export async function SiteHeader() {
    const user = await getCurrentUser();
    const role = user ? await getCurrentUserRole() : null;
    const roleItems = getRoleItems(role);

    return (
        <header className="sticky top-0 z-50 border-b border-emerald-300/30 bg-primary/95 text-white shadow-[0_10px_30px_rgba(11,31,58,0.18)] backdrop-blur-md">
            <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-4 sm:px-8">
                <Link
                    href="/"
                    className="font-display text-2xl font-black tracking-tight text-white"
                >
                    TuThien.vn<span className="text-emerald-300">.</span>
                </Link>

                <nav className="hidden items-center gap-2 md:flex">
                    {[...navItems, ...roleItems].map((item) => (
                        <HeaderLink key={`${item.href}-${item.label}`} item={item} />
                    ))}
                </nav>

                <div className="hidden items-center gap-3 md:flex">
                    {user ? (
                        <>
                            <Link
                                href="/tai-khoan"
                                className="rounded-lg border border-white/10 bg-white/10 px-4 py-2 font-display text-sm font-semibold text-white transition hover:border-emerald-300/50 hover:bg-emerald-400/20"
                            >
                                Tài khoản
                            </Link>
                            <AuthSignOutButton />
                        </>
                    ) : (
                        <>
                            <Link
                                href="/dang-nhap"
                                className="rounded-lg border border-emerald-300/40 bg-white/10 px-4 py-2 font-display text-sm font-semibold text-white transition hover:border-emerald-200 hover:bg-emerald-400/20 active:scale-95"
                            >
                                Đăng nhập
                            </Link>
                            <Link href="/dang-ky" className="neo-btn neo-btn-primary">
                                Đăng ký
                            </Link>
                        </>
                    )}
                </div>

                <Link href="/quyen-gop" className="neo-btn neo-btn-primary md:hidden">
                    Ủng hộ
                </Link>
            </div>

            <nav className="no-scrollbar mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 pb-3 md:hidden">
                {[...navItems, ...roleItems].map((item) => (
                    <Link
                        key={`${item.href}-${item.label}`}
                        href={item.href}
                        className="shrink-0 rounded-lg border border-emerald-300/30 bg-emerald-400/15 px-3 py-1.5 text-xs font-bold text-white shadow-ambient"
                    >
                        {item.label}
                    </Link>
                ))}
                <Link
                    href={user ? "/tai-khoan" : "/dang-nhap"}
                    className="shrink-0 rounded-lg border border-emerald-300/30 bg-white/10 px-3 py-1.5 text-xs font-bold text-white shadow-ambient"
                >
                    {user ? "Tài khoản" : "Đăng nhập"}
                </Link>
            </nav>
        </header>
    );
}

function HeaderLink({ item }: { item: HeaderItem }) {
    return (
        <Link
            href={item.href}
            className="rounded-lg border border-transparent px-3 py-2 font-display text-sm font-semibold tracking-tight text-white/80 transition hover:border-emerald-300/40 hover:bg-emerald-400/15 hover:text-white active:scale-95"
        >
            {item.label}
        </Link>
    );
}

function getRoleItems(role: UserRole | null): HeaderItem[] {
    const items: HeaderItem[] = [];

    if (canAccessAdmin(role)) {
        items.push({ href: "/quan-tri", label: "Quản trị" });
    }

    if (role === "project_owner") {
        items.push({ href: "/chien-dich/tao", label: "Tạo dự án" });
    }

    if (role === "partner_org") {
        items.push({ href: "/chien-dich/ho-tro", label: "Đồng hành dự án" });
    }

    return items;
}
