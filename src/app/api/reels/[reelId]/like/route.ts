import { NextResponse } from "next/server";

import { createSupabaseServerAuthClient } from "@/lib/supabase/auth-server";
import { isSameOriginMutation } from "@/lib/http-security";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

function isValidUuid(value: string): boolean {
  return /^[0-9a-fA-F-]{36}$/.test(value);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ reelId: string }> },
) {
  if (!isSameOriginMutation(request)) {
    return NextResponse.json(
      { error: "Nguon request khong hop le.", canInteract: false },
      { status: 403 },
    );
  }

  const { reelId } = await context.params;

  if (!reelId || !isValidUuid(reelId)) {
    return NextResponse.json(
      { error: "Ma reel khong hop le.", canInteract: false },
      { status: 400 },
    );
  }

  const { client: authClient } = await createSupabaseServerAuthClient();

  if (!authClient) {
    return NextResponse.json(
      {
        error: "Chua cau hinh Supabase Auth nen chua the tuong tac voi reel.",
        canInteract: false,
      },
      { status: 503 },
    );
  }

  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return NextResponse.json(
      {
        error: "Ban can dang nhap de thich reel nay.",
        canInteract: false,
      },
      { status: 401 },
    );
  }

  const dbClient = getSupabaseServiceClient() ?? authClient;

  const { data: reel, error: reelError } = await dbClient
    .from("reels")
    .select("id")
    .eq("id", reelId)
    .maybeSingle();

  if (reelError) {
    console.error(reelError);
    return NextResponse.json(
      { error: "Khong the kiem tra reel.", canInteract: true },
      { status: 500 },
    );
  }

  if (!reel) {
    return NextResponse.json(
      { error: "Reel khong ton tai.", canInteract: true },
      { status: 404 },
    );
  }

  const { data: existingLike, error: existingError } = await dbClient
    .from("reel_likes")
    .select("id")
    .eq("reel_id", reelId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingError) {
    console.error(existingError);
    return NextResponse.json(
      {
        error: "Khong the tai trang thai thich hien tai.",
        canInteract: true,
      },
      { status: 500 },
    );
  }

  if (existingLike?.id) {
    const { error: deleteError } = await dbClient
      .from("reel_likes")
      .delete()
      .eq("reel_id", reelId)
      .eq("user_id", user.id);

    if (deleteError) {
      console.error(deleteError);
      return NextResponse.json(
        { error: "Khong the bo thich.", canInteract: true },
        { status: 500 },
      );
    }
  } else {
    const { error: insertError } = await dbClient
      .from("reel_likes")
      .insert({ reel_id: reelId, user_id: user.id });

    if (insertError) {
      console.error(insertError);
      return NextResponse.json(
        { error: "Khong the thich reel.", canInteract: true },
        { status: 500 },
      );
    }
  }

  const { data: latestLike, error: latestLikeError } = await dbClient
    .from("reel_likes")
    .select("id")
    .eq("reel_id", reelId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (latestLikeError) {
    console.error(latestLikeError);
  }

  const { count, error: countError } = await dbClient
    .from("reel_likes")
    .select("id", { count: "exact", head: true })
    .eq("reel_id", reelId);

  if (countError) {
    console.error(countError);
  } else {
    const { error: updateError } = await dbClient
      .from("reels")
      .update({ likes: count ?? 0 })
      .eq("id", reelId);

    if (updateError) {
      console.error(updateError);
    }
  }

  return NextResponse.json({
    liked: Boolean(latestLike?.id),
    likes: count ?? 0,
    canInteract: true,
  });
}
