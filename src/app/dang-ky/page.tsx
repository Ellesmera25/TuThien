import type { Metadata } from "next";

import { AuthCard } from "@/components/auth-card";

export const metadata: Metadata = {
  title: "Đăng ký",
  description: "Đăng ký tài khoản thành viên TuThien.vn",
};

export default function RegisterPage() {
  return (
    <div className="pb-8">
      <AuthCard mode="sign_up" />
    </div>
  );
}
