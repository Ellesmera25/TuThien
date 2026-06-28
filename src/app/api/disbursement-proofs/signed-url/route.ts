import { NextResponse } from "next/server";

import { noStoreHeaders } from "@/lib/cache-revalidation";
import { isSameOriginMutation } from "@/lib/http-security";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const signedUrlTtlSeconds = 60 * 10;

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

  const body = (await request.json().catch(() => null)) as
    | { bucket?: unknown; path?: unknown }
    | null;
  const bucket = typeof body?.bucket === "string" ? body.bucket : "";
  const path = typeof body?.path === "string" ? body.path.trim() : "";

  if (bucket !== "campaign-assets" || !isSafeStoragePath(path)) {
    return NextResponse.json(
      { error: "Hoa don do khong hop le." },
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

  const { data: disbursementProof } = await supabase
    .from("disbursements")
    .select("id")
    .eq("proof_url", path)
    .limit(1);

  let isPublicDisbursementProof = Boolean(disbursementProof?.length);

  if (!isPublicDisbursementProof) {
    const { data: roundProof } = await supabase
      .from("disbursement_rounds")
      .select("id")
      .eq("proof_url", path)
      .limit(10);
    const roundIds = (roundProof ?? []).map((round) => round.id).filter(Boolean);

    if (roundIds.length > 0) {
      const { data: linkedDisbursementProof } = await supabase
        .from("disbursements")
        .select("id")
        .in("disbursement_round_id", roundIds)
        .limit(1);

      isPublicDisbursementProof = Boolean(linkedDisbursementProof?.length);
    }
  }

  if (!isPublicDisbursementProof) {
    return NextResponse.json(
      { error: "Hoa don do chua duoc cong khai trong nhat ky giai ngan." },
      { status: 404, headers: noStoreHeaders },
    );
  }

  const { data, error } = await supabase.storage
    .from("campaign-assets")
    .createSignedUrl(path, signedUrlTtlSeconds);

  if (error || !data?.signedUrl) {
    return NextResponse.json(
      { error: "Khong tao duoc lien ket tai hoa don do." },
      { status: 500, headers: noStoreHeaders },
    );
  }

  return NextResponse.json(
    { signedUrl: data.signedUrl },
    { headers: noStoreHeaders },
  );
}
