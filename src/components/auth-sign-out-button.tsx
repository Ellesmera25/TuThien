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
      className="rounded-lg border border-outline-variant/70 bg-white px-4 py-2 text-sm font-bold text-slate-600 transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-70"
    >
      {loading ? "Đang thoát..." : "Đăng xuất"}
    </button>
  );
}
