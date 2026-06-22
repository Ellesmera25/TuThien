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
        <header className="sticky top-0 z-50 border-b border-outline-variant/30 bg-white/90 backdrop-blur-md">
            <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-4 shadow-ambient sm:px-8">
                <Link
                    href="/"
                    className="font-display text-2xl font-black tracking-tight text-primary"
                >
                    TuThien.vn
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
                                className="rounded-lg px-4 py-2 font-display text-sm font-semibold text-slate-600 transition hover:bg-surface-low hover:text-primary"
                            >
                                Tài khoản
                            </Link>
                            <AuthSignOutButton />
                        </>
                    ) : (
                        <>
                            <Link
                                href="/dang-nhap"
                                className="rounded-lg border border-outline-variant/70 bg-white px-4 py-2 font-display text-sm font-semibold text-slate-600 transition hover:border-primary hover:text-primary active:scale-95"
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
                        className="shrink-0 rounded-lg border border-outline-variant/40 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-ambient"
                    >
                        {item.label}
                    </Link>
                ))}
                <Link
                    href={user ? "/tai-khoan" : "/dang-nhap"}
                    className="shrink-0 rounded-lg border border-outline-variant/40 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-ambient"
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
            className="rounded-lg px-3 py-2 font-display text-sm font-semibold tracking-tight text-slate-600 transition hover:bg-surface-low hover:text-primary active:scale-95"
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
