"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

type GenericSupabaseClient = SupabaseClient;

let browserAuthClient: GenericSupabaseClient | null = null;

export function createSupabaseBrowserAuthClient(): GenericSupabaseClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  if (!browserAuthClient) {
    browserAuthClient = createBrowserClient(supabaseUrl, supabaseAnonKey, {
      cookieOptions: {
        name: "tuthien-auth",
        maxAge: 60 * 60 * 24 * 7,
        sameSite: "lax",
        path: "/",
      },
    });
  }

  return browserAuthClient;
}
