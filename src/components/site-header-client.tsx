"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { AuthSignOutButton } from "@/components/auth-sign-out-button";

type HeaderItem = {
    href: string;
    label: string;
};

type SiteHeaderClientProps = {
    isAuthenticated: boolean;
    navItems: HeaderItem[];
    roleItems: HeaderItem[];
};

export function SiteHeaderClient({
    isAuthenticated,
    navItems,
    roleItems,
}: SiteHeaderClientProps) {
    const pathname = usePathname();
    const isHome = pathname === "/";
    const allItems = [...navItems, ...roleItems];

    return (
        <header
            className={
                isHome
                    ? "sticky top-0 z-50 border-b border-transparent bg-[linear-gradient(180deg,#222957_0%,#0b1f3a_100%)] text-white shadow-none"
                    : "sticky top-0 z-50 border-b border-slate-200 bg-white text-primary shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
            }
        >
            <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-4 sm:px-8">
                <Link
                    href="/"
                    className={`font-display text-3xl font-black tracking-tight ${
                        isHome ? "text-white" : "text-primary"
                    }`}
                >
                    TuThien.vn
                </Link>

                <nav className="hidden items-center gap-2 md:flex">
                    {allItems.map((item) => (
                        <HeaderLink
                            key={`${item.href}-${item.label}`}
                            isActive={isActivePath(pathname, item.href)}
                            isHome={isHome}
                            item={item}
                        />
                    ))}
                </nav>

                <div className="hidden items-center gap-3 md:flex">
                    {isAuthenticated ? (
                        <>
                            <Link
                                href="/tai-khoan"
                                className={accountLinkClassName(
                                    isHome,
                                    isActivePath(pathname, "/tai-khoan"),
                                )}
                            >
                                Tài khoản
                            </Link>
                            <AuthSignOutButton />
                        </>
                    ) : (
                        <>
                            <Link
                                href="/dang-nhap"
                                className={accountLinkClassName(
                                    isHome,
                                    isActivePath(pathname, "/dang-nhap"),
                                )}
                            >
                                Đăng nhập
                            </Link>
                            <Link href="/dang-ky" className="neo-btn neo-btn-nav-primary text-base">
                                Đăng ký
                            </Link>
                        </>
                    )}
                </div>

                <Link href="/quyen-gop" className="neo-btn neo-btn-nav-primary text-base md:hidden">
                    Ủng hộ
                </Link>
            </div>

            <nav className="no-scrollbar mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 pb-3 md:hidden">
                {allItems.map((item) => (
                    <Link
                        key={`${item.href}-${item.label}`}
                        href={item.href}
                        aria-current={isActivePath(pathname, item.href) ? "page" : undefined}
                        className={mobileLinkClassName(
                            isHome,
                            isActivePath(pathname, item.href),
                        )}
                    >
                        {item.label}
                    </Link>
                ))}
                <Link
                    href={isAuthenticated ? "/tai-khoan" : "/dang-nhap"}
                    aria-current={
                        isActivePath(pathname, isAuthenticated ? "/tai-khoan" : "/dang-nhap")
                            ? "page"
                            : undefined
                    }
                    className={mobileLinkClassName(
                        isHome,
                        isActivePath(pathname, isAuthenticated ? "/tai-khoan" : "/dang-nhap"),
                    )}
                >
                    {isAuthenticated ? "Tài khoản" : "Đăng nhập"}
                </Link>
            </nav>
        </header>
    );
}

function HeaderLink({
    isActive,
    isHome,
    item,
}: {
    isActive: boolean;
    isHome: boolean;
    item: HeaderItem;
}) {
    return (
        <Link
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={desktopLinkClassName(isHome, isActive)}
        >
            {item.label}
        </Link>
    );
}

function isActivePath(pathname: string, href: string) {
    if (href === "/") {
        return pathname === "/";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
}

function desktopLinkClassName(isHome: boolean, isActive: boolean) {
    const base =
        "inline-flex h-10 items-center justify-center rounded-lg border px-5 py-0 font-display text-lg font-bold leading-none tracking-tight transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 active:scale-95";

    if (isHome) {
        return `${base} ${
            isActive
                ? "border-white/30 bg-white/10 text-white"
                : "border-transparent text-white/80"
        } hover:border-emerald-300 hover:bg-emerald-400 hover:text-primary`;
    }

    return `${base} ${
        isActive
            ? "border-primary bg-primary text-white"
            : "border-transparent text-primary/80"
    } hover:border-emerald-500 hover:bg-emerald-500 hover:text-white`;
}

function mobileLinkClassName(isHome: boolean, isActive: boolean) {
    const base =
        "inline-flex h-9 shrink-0 items-center justify-center rounded-lg border px-4 py-0 text-base font-bold leading-none shadow-ambient transition active:scale-95";

    if (isHome) {
        return `${base} ${
            isActive
                ? "border-white/40 bg-white/20 text-white"
                : "border-emerald-300/30 bg-emerald-400/20 text-white"
        } hover:border-emerald-300 hover:bg-emerald-400 hover:text-primary`;
    }

    return `${base} ${
        isActive
            ? "border-primary bg-primary text-white"
            : "border-slate-200 bg-white text-primary"
    } hover:border-emerald-500 hover:bg-emerald-500 hover:text-white`;
}

function accountLinkClassName(isHome: boolean, isActive: boolean) {
    const base =
        "inline-flex h-10 items-center justify-center rounded-lg border px-5 py-0 font-display text-lg font-bold leading-none transition active:scale-95";

    if (isHome) {
        return `${base} ${
            isActive
                ? "border-white/40 bg-white/20 text-white"
                : "border-white/10 bg-white/10 text-white"
        } hover:border-emerald-300 hover:bg-emerald-400 hover:text-primary`;
    }

    return `${base} ${
        isActive
            ? "border-primary bg-primary text-white"
            : "border-slate-200 bg-white text-primary"
    } hover:border-emerald-500 hover:bg-emerald-500 hover:text-white`;
}
