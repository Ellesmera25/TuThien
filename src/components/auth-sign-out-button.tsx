"use client";

import { useState } from "react";

import { createSupabaseBrowserAuthClient } from "@/lib/supabase/auth-client";

export function AuthSignOutButton() {
    const [loading, setLoading] = useState(false);

    const handleSignOut = async () => {
        const supabase = createSupabaseBrowserAuthClient();
        if (!supabase || loading) {
            return;
        }

        setLoading(true);

        await supabase.auth.signOut();

        window.location.replace("/dang-nhap?signed_out=1");
    };

    return (
        <button
            type="button"
            onClick={handleSignOut}
            disabled={loading}
            className="rounded-lg border border-outline-variant/70 bg-white px-4 py-2 text-base font-bold text-slate-700 transition hover:border-emerald-500 hover:bg-emerald-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-70"
        >
            {loading ? "Đang thoát..." : "Đăng xuất"}
        </button>
    );
}
