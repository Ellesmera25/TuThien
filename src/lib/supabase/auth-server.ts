import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { cookies } from "next/headers";

type GenericSupabaseClient = SupabaseClient;

type AuthContext = {
  client: GenericSupabaseClient | null;
  configured: boolean;
};

function getPublicSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return { supabaseUrl, supabaseAnonKey };
}

export async function createSupabaseServerAuthClient(): Promise<AuthContext> {
  const config = getPublicSupabaseConfig();
  if (!config) {
    return { client: null, configured: false };
  }

  const cookieStore = await cookies();

  const client = createServerClient(
    config.supabaseUrl,
    config.supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Ignore in contexts where mutating cookies is not supported.
          }
        },
      },
      cookieOptions: {
        name: "tuthien-auth",
        maxAge: 60 * 60 * 24 * 7,
        sameSite: "lax",
        path: "/",
      },
    },
  );

  return { client, configured: true };
}

export async function getCurrentUser(): Promise<User | null> {
  const { client } = await createSupabaseServerAuthClient();
  if (!client) {
    return null;
  }

  const { data, error } = await client.auth.getUser();
  if (error) {
    return null;
  }

  return data.user ?? null;
}
