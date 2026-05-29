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
            className="rounded-lg border border-outline-variant/70 bg-white px-4 py-2 text-sm font-bold text-slate-600 transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-70"
        >
            {loading ? "Đang thoát..." : "Đăng xuất"}
        </button>
    );
}
