import type { Metadata } from "next";

import { AuthCard } from "@/components/auth-card";

export const metadata: Metadata = {
    title: "Đăng nhập",
    description: "Đăng nhập tài khoản thành viên TuThien.vn",
};

export default function LoginPage() {
    return (
        <div className="pb-8">
            <AuthCard mode="sign_in" nextPath="/" />
        </div>
    );
}