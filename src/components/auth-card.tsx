"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { createSupabaseBrowserAuthClient } from "@/lib/supabase/auth-client";

type AuthCardProps = {
  mode: "sign_in" | "sign_up";
  nextPath?: string;
};

export function AuthCard({ mode, nextPath = "/tai-khoan" }: AuthCardProps) {
  const router = useRouter();
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
    setError("");
    setMessage("");

    if (!supabase) {
      setError("Chua cau hinh Supabase env. Khong the dang nhap dang ky.");
      return;
    }

    if (password.length < 6) {
      setError("Mat khau toi thieu 6 ky tu.");
      return;
    }

    setLoading(true);

    if (isSignUp) {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
      } else {
        setMessage("Dang ky thanh cong. Vui long kiem tra email de xac nhan tai khoan.");
      }

      setLoading(false);
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    router.push(nextPath);
    router.refresh();
    setLoading(false);
  };

  return (
    <section className="mx-auto max-w-md">
      <div className="neo-panel p-6 sm:p-7">
        <p className="neo-badge">{isSignUp ? "Create Account" : "Welcome Back"}</p>
        <h1 className="mt-3 font-display text-3xl font-bold text-ink">
          {isSignUp ? "Dang ky thanh vien" : "Dang nhap tai khoan"}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {isSignUp
            ? "Tao tai khoan de theo doi lich su dong gop va cap nhat chien dich."
            : "Dang nhap de quan ly thong tin tai khoan va truy cap trang quan tri."}
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {isSignUp ? (
            <Field label="Ho ten">
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className={inputClass}
                placeholder="Nguyen Van A"
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
              required
            />
          </Field>

          <Field label="Mat khau">
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={inputClass}
              placeholder="******"
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
              ? "Dang xu ly..."
              : isSignUp
                ? "Tao tai khoan"
                : "Dang nhap"}
          </button>
        </form>

        <p className="mt-4 text-sm text-slate-600">
          {isSignUp ? "Da co tai khoan?" : "Chua co tai khoan?"}{" "}
          <Link
            href={isSignUp ? "/dang-nhap" : "/dang-ky"}
            className="font-semibold text-primary hover:text-orange-700"
          >
            {isSignUp ? "Dang nhap" : "Dang ky ngay"}
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
