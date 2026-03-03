"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type GenericSupabaseClient = SupabaseClient;

let browserClient: GenericSupabaseClient | null = null;

export function getSupabaseBrowserClient(): GenericSupabaseClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  if (!browserClient) {
    browserClient = createClient(supabaseUrl, supabaseAnonKey);
  }

  return browserClient;
}
