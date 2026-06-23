import { NextResponse } from "next/server";

import { isSameOriginMutation } from "@/lib/http-security";
import {
  canAccessAdmin,
  createSupabaseServerAuthClient,
  getCurrentUserRole,
} from "@/lib/supabase/auth-server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const allowedBuckets = new Set(["campaign-assets", "role-proofs"]);
const signedUrlTtlSeconds = 60 * 10;
const noStoreHeaders = {
  "cache-control": "no-store, max-age=0",
};

function isSafeStoragePath(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }

  const path = value.trim();

  if (!path || /^https?:\/\//i.test(path)) {
    return false;
  }

  return !path.includes("..") && !path.startsWith("/") && !path.startsWith("\\");
}

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) {
    return NextResponse.json(
      { error: "Nguon request khong hop le." },
      { status: 403, headers: noStoreHeaders },
    );
  }

  const { client: authClient } = await createSupabaseServerAuthClient();

  if (!authClient) {
    return NextResponse.json(
      { error: "Chua cau hinh Supabase Auth." },
      { status: 503, headers: noStoreHeaders },
    );
  }

  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Ban can dang nhap de mo tai lieu." },
      { status: 401, headers: noStoreHeaders },
    );
  }

  const role = await getCurrentUserRole();

  if (!canAccessAdmin(role)) {
    return NextResponse.json(
      { error: "Ban khong co quyen mo tai lieu quan tri." },
      { status: 403, headers: noStoreHeaders },
    );
  }

  const body = (await request.json().catch(() => null)) as
    | { bucket?: unknown; path?: unknown }
    | null;
  const bucket = typeof body?.bucket === "string" ? body.bucket : "";
  const path = typeof body?.path === "string" ? body.path.trim() : "";

  if (!allowedBuckets.has(bucket) || !isSafeStoragePath(path)) {
    return NextResponse.json(
      { error: "Tai lieu khong hop le." },
      { status: 400, headers: noStoreHeaders },
    );
  }

  const supabase = getSupabaseServiceClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Chua cau hinh Supabase service role key." },
      { status: 503, headers: noStoreHeaders },
    );
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, signedUrlTtlSeconds);

  if (error || !data?.signedUrl) {
    return NextResponse.json(
      { error: "Khong tao duoc lien ket tai lieu." },
      { status: 500, headers: noStoreHeaders },
    );
  }

  return NextResponse.json(
    { signedUrl: data.signedUrl },
    { headers: noStoreHeaders },
  );
}
