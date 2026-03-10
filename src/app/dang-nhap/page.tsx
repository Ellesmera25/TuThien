import type { Metadata } from "next";

import { AuthCard } from "@/components/auth-card";

type LoginPageProps = {
  searchParams: Promise<{ next?: string }>;
};

export const metadata: Metadata = {
  title: "Đăng nhập",
  description: "Đăng nhập tài khoản thành viên TuThien.vn",
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next } = await searchParams;

  return (
    <div className="pb-8">
      <AuthCard mode="sign_in" nextPath={next ?? "/tai-khoan"} />
    </div>
  );
}
