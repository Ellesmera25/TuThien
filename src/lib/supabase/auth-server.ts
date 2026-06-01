import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { getSupabaseServiceClient } from "@/lib/supabase/server";

type GenericSupabaseClient = SupabaseClient;

type AuthContext = {
    client: GenericSupabaseClient | null;
    configured: boolean;
};

export type UserRole = "donor" | "project_owner" | "partner_org" | "admin";

export type CurrentUserProfile = {
    id: string;
    fullName: string | null;
    role: UserRole;
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

function normalizeRole(value: unknown): UserRole {
    return value === "project_owner" ||
        value === "partner_org" ||
        value === "admin"
        ? value
        : "donor";
}

export async function getCurrentUserProfile(): Promise<CurrentUserProfile | null> {
    const user = await getCurrentUser();

    if (!user) {
        return null;
    }

    const fallbackFullName =
        (user.user_metadata.full_name as string | undefined) ??
        user.email?.split("@")[0] ??
        null;
    const serviceClient = getSupabaseServiceClient();

    if (serviceClient) {
        const { data } = await serviceClient
            .from("profiles")
            .select("id, full_name, role")
            .eq("id", user.id)
            .maybeSingle();

        if (data) {
            return {
                id: data.id,
                fullName: data.full_name ?? null,
                role: normalizeRole(data.role),
            };
        }

        const { data: createdProfile } = await serviceClient
            .from("profiles")
            .upsert(
                {
                    id: user.id,
                    full_name: fallbackFullName,
                    role: "donor",
                },
                { onConflict: "id" },
            )
            .select("id, full_name, role")
            .maybeSingle();

        if (createdProfile) {
            return {
                id: createdProfile.id,
                fullName: createdProfile.full_name ?? null,
                role: normalizeRole(createdProfile.role),
            };
        }
    }

    const { client } = await createSupabaseServerAuthClient();

    if (!client) {
        return {
            id: user.id,
            fullName: fallbackFullName,
            role: "donor",
        };
    }

    const { data } = await client
        .from("profiles")
        .select("id, full_name, role")
        .eq("id", user.id)
        .maybeSingle();

    return {
        id: user.id,
        fullName: data?.full_name ?? fallbackFullName,
        role: normalizeRole(data?.role),
    };
}

export async function getCurrentUserRole(): Promise<UserRole | null> {
    const profile = await getCurrentUserProfile();
    return profile?.role ?? null;
}

export function canCreateReel(role: UserRole | null | undefined): boolean {
    return (
        role === "donor" ||
        role === "project_owner" ||
        role === "partner_org" ||
        role === "admin"
    );
}

export function canPublishReelImmediately(
    role: UserRole | null | undefined,
): boolean {
    return role === "admin";
}

export function canAccessAdmin(role: UserRole | null | undefined): boolean {
    return role === "admin";
}
