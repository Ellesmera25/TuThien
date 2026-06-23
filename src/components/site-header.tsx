import { SiteHeaderClient } from "@/components/site-header-client";
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
        <SiteHeaderClient
            isAuthenticated={Boolean(user)}
            navItems={navItems}
            roleItems={roleItems}
        />
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
