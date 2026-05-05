import { NextResponse } from "next/server";

import { createSupabaseServerAuthClient } from "@/lib/supabase/auth-server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import type { ReelPayload } from "@/lib/types";

const coverTones = ["warm", "cool", "mint", "violet"] as const;

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isValidPayload(payload: Partial<ReelPayload>): payload is ReelPayload {
  if (typeof payload.campaignSlug !== "string" || !payload.campaignSlug.trim()) {
    return false;
  }

  if (typeof payload.title !== "string" || payload.title.trim().length < 4) {
    return false;
  }

  if (typeof payload.caption !== "string" || payload.caption.trim().length < 8) {
    return false;
  }

  if (
    typeof payload.creatorName !== "string" ||
    payload.creatorName.trim().length < 2
  ) {
    return false;
  }

  if (typeof payload.location !== "string" || payload.location.trim().length < 2) {
    return false;
  }

  if (!coverTones.includes(payload.coverTone as (typeof coverTones)[number])) {
    return false;
  }

  if (typeof payload.videoUrl !== "string" || !isValidUrl(payload.videoUrl)) {
    return false;
  }

  return true;
}

export async function POST(request: Request) {
  const { client: authClient } = await createSupabaseServerAuthClient();

  if (!authClient) {
    return NextResponse.json(
      { error: "Chưa cấu hình Supabase Auth nên không thể tạo reel." },
      { status: 503 },
    );
  }

  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Bạn cần đăng nhập để tạo reel." },
      { status: 401 },
    );
  }

  const body = (await request.json()) as Partial<ReelPayload>;

  if (!isValidPayload(body)) {
    return NextResponse.json(
      { error: "Dữ liệu reel không hợp lệ." },
      { status: 400 },
    );
  }

  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return NextResponse.json(
      {
        error:
          "Chưa cấu hình Supabase service role key nên không thể ghi reel vào database.",
      },
      { status: 503 },
    );
  }

  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .select("slug")
    .eq("slug", body.campaignSlug.trim())
    .maybeSingle();

  if (campaignError || !campaign) {
    return NextResponse.json(
      { error: "Chiến dịch được chọn không tồn tại trong database." },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("reels")
    .insert({
      user_id: user.id,
      campaign_slug: body.campaignSlug.trim(),
      title: body.title.trim(),
      caption: body.caption.trim(),
      creator_name: body.creatorName.trim(),
      location: body.location.trim(),
      video_url: body.videoUrl.trim(),
      cover_tone: body.coverTone,
      views: 0,
      likes: 0,
      comments: 0,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Không thể tạo reel. Vui lòng thử lại." },
      { status: 500 },
    );
  }

  return NextResponse.json({ id: data.id });
}
