"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { createSupabaseBrowserAuthClient } from "@/lib/supabase/auth-client";

export function AuthSignOutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    const supabase = createSupabaseBrowserAuthClient();
    if (!supabase) {
      return;
    }

    setLoading(true);
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
    setLoading(false);
  };

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={loading}
      className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-[0.08em] text-slate-600 transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-70"
    >
      {loading ? "Đang thoát..." : "Đăng xuất"}
    </button>
  );
}
