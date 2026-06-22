"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { createSupabaseBrowserAuthClient } from "@/lib/supabase/auth-client";

type AuthCardProps = {
  mode: "sign_in" | "sign_up";
  nextPath?: string;
};

function normalizeNextPath(value: string) {
  if (!value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  return value;
}

export function AuthCard({ mode, nextPath = "/" }: AuthCardProps) {
  const supabase = useMemo(() => createSupabaseBrowserAuthClient(), []);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const isSignUp = mode === "sign_up";

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (loading) {
      return;
    }

    setError("");
    setMessage("");

    if (!supabase) {
      setError(
        "Chưa cấu hình Supabase env. Không thể đăng nhập hoặc đăng ký.",
      );
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedFullName = fullName.trim();

    if (!normalizedEmail) {
      setError("Vui lòng nhập email.");
      return;
    }

    if (password.length < 6) {
      setError("Mật khẩu tối thiểu 6 ký tự.");
      return;
    }

    if (isSignUp && !normalizedFullName) {
      setError("Vui lòng nhập họ tên.");
      return;
    }

    setLoading(true);

    if (isSignUp) {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            full_name: normalizedFullName,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
      } else {
        if (signUpData.user) {
          await supabase.from("profiles").upsert(
            {
              id: signUpData.user.id,
              full_name: normalizedFullName,
              role: "donor",
            },
            { onConflict: "id" },
          );
        }

        setMessage(
          "Đăng ký thành công. Vui lòng kiểm tra email để xác nhận tài khoản.",
        );
      }

      setLoading(false);
      return;
    }

    await supabase.auth.signOut({ scope: "local" });

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    window.location.replace(normalizeNextPath(nextPath || "/"));
  };

  return (
    <section className="mx-auto max-w-md">
      <div className="neo-panel p-6 sm:p-7">
        <p className="neo-badge">
          {isSignUp ? "Tạo tài khoản" : "Chào mừng trở lại"}
        </p>
        <h1 className="mt-3 font-display text-3xl font-bold text-ink">
          {isSignUp ? "Đăng ký thành viên" : "Đăng nhập tài khoản"}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {isSignUp
            ? "Tạo tài khoản để theo dõi lịch sử đóng góp và cập nhật chiến dịch."
            : "Đăng nhập để quản lý thông tin tài khoản và truy cập trang quản trị."}
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {isSignUp ? (
            <Field label="Họ tên">
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className={inputClass}
                placeholder="Nguyễn Văn A"
                autoComplete="name"
                required
              />
            </Field>
          ) : null}

          <Field label="Email">
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={inputClass}
              placeholder="ban@example.com"
              autoComplete="email"
              required
            />
          </Field>

          <Field label="Mật khẩu">
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={inputClass}
              placeholder="******"
              autoComplete={isSignUp ? "new-password" : "current-password"}
              required
            />
          </Field>

          {error ? (
            <p className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
              {message}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="neo-btn neo-btn-primary w-full disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading
              ? "Đang xử lý..."
              : isSignUp
                ? "Tạo tài khoản"
                : "Đăng nhập"}
          </button>
        </form>

        <p className="mt-4 text-sm text-slate-600">
          {isSignUp ? "Đã có tài khoản?" : "Chưa có tài khoản?"}{" "}
          <Link
            href={isSignUp ? "/dang-nhap" : "/dang-ky"}
            className="font-semibold text-primary hover:text-primary-container"
          >
            {isSignUp ? "Đăng nhập" : "Đăng ký ngay"}
          </Link>
        </p>
      </div>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-1.5 text-sm font-semibold text-slate-700">
      {label}
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";
