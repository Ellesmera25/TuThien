import { NextResponse } from "next/server";

import {
  createSupabaseServerAuthClient,
  getCurrentUserProfile,
} from "@/lib/supabase/auth-server";
import { isSameOriginMutation } from "@/lib/http-security";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

type ReelCommentRow = {
  id: string;
  reel_id: string;
  author_name: string;
  content: string;
  created_at: string;
};

function isValidUuid(value: string): boolean {
  return /^[0-9a-fA-F-]{36}$/.test(value);
}

function mapComment(comment: ReelCommentRow) {
  return {
    id: comment.id,
    reelId: comment.reel_id,
    authorName: comment.author_name,
    content: comment.content,
    createdAt: comment.created_at,
  };
}

function isMissingInteractionTable(error: { code?: string; message?: string } | null) {
  if (!error) {
    return false;
  }

  const message = error.message?.toLowerCase() ?? "";
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    message.includes("reel_comments") ||
    message.includes("could not find the table")
  );
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ reelId: string }> },
) {
  const { reelId } = await context.params;

  if (!reelId || !isValidUuid(reelId)) {
    return NextResponse.json(
      { error: "Ma reel khong hop le.", comments: [], count: 0 },
      { status: 400 },
    );
  }

  const { client: authClient } = await createSupabaseServerAuthClient();
  const dbClient = getSupabaseServiceClient() ?? authClient;

  if (!dbClient) {
    return NextResponse.json(
      {
        error: "Chua cau hinh Supabase nen chua the tai binh luan reel.",
        comments: [],
        count: 0,
      },
      { status: 503 },
    );
  }

  const { count, error: countError } = await dbClient
    .from("reel_comments")
    .select("id", { count: "exact", head: true })
    .eq("reel_id", reelId);

  if (countError) {
    console.error(countError);
  }

  const { data: comments, error: queryError } = await dbClient
    .from("reel_comments")
    .select("id, reel_id, author_name, content, created_at")
    .eq("reel_id", reelId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (queryError) {
    console.error(queryError);
    if (isMissingInteractionTable(queryError)) {
      return NextResponse.json({
        comments: [],
        count: 0,
        needsMigration: true,
      });
    }

    return NextResponse.json(
      {
        error: "Không thể tải bình luận.",
        comments: [],
        count: count ?? 0,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    comments: (comments ?? []).map((comment) => mapComment(comment)),
    count: count ?? 0,
  });
}

function sanitizeCommentInput(content: string): string {
  return content.trim().replace(/\s+/g, " ");
}

export async function POST(
  request: Request,
  context: { params: Promise<{ reelId: string }> },
) {
  if (!isSameOriginMutation(request)) {
    return NextResponse.json(
      {
        error: "Nguon request khong hop le.",
        comments: [],
        count: 0,
        canInteract: false,
      },
      { status: 403 },
    );
  }

  const { reelId } = await context.params;

  if (!reelId || !isValidUuid(reelId)) {
    return NextResponse.json(
      { error: "Ma reel khong hop le.", comments: [], count: 0 },
      { status: 400 },
    );
  }

  const { client: authClient } = await createSupabaseServerAuthClient();

  if (!authClient) {
    return NextResponse.json(
      {
        error: "Chua cau hinh Supabase Auth nen chua the binh luan reel.",
        comments: [],
        count: 0,
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
        error: "Ban can dang nhap de binh luan.",
        comments: [],
        count: 0,
        canInteract: false,
      },
      { status: 401 },
    );
  }

  const rawBody = (await request.json().catch(() => null)) as
    | { content?: string }
    | null;
  const content = sanitizeCommentInput(rawBody?.content ?? "");

  if (content.length < 2 || content.length > 180) {
    return NextResponse.json(
      {
        error: "Noi dung binh luan phai tu 2 den 180 ky tu.",
        comments: [],
        count: 0,
      },
      { status: 400 },
    );
  }

  const dbClient = getSupabaseServiceClient() ?? authClient;
  const profile = await getCurrentUserProfile();
  const authorName =
    profile?.fullName ??
    user.user_metadata.full_name ??
    user.email?.split("@")[0] ??
    "An danh";

  const { data: reel, error: reelError } = await dbClient
    .from("reels")
    .select("id")
    .eq("id", reelId)
    .maybeSingle();

  if (reelError) {
    console.error(reelError);
    return NextResponse.json(
      {
        error: "Khong the kiem tra reel de binh luan.",
        comments: [],
        count: 0,
      },
      { status: 500 },
    );
  }

  if (!reel) {
    return NextResponse.json(
      { error: "Reel khong ton tai.", comments: [], count: 0 },
      { status: 404 },
    );
  }

  const { data: insertedComment, error: insertError } = await dbClient
    .from("reel_comments")
    .insert({
      reel_id: reelId,
      user_id: user.id,
      author_name: authorName,
      content,
    })
    .select("id, reel_id, author_name, content, created_at")
    .single();

  if (insertError) {
    console.error(insertError);
    if (isMissingInteractionTable(insertError)) {
      return NextResponse.json(
        {
          error:
            "Database chưa có bảng bình luận reel. Cần apply migration Supabase mới nhất.",
          comments: [],
          count: 0,
          needsMigration: true,
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { error: "Gửi bình luận thất bại.", comments: [], count: 0 },
      { status: 500 },
    );
  }

  const { count, error: countError } = await dbClient
    .from("reel_comments")
    .select("id", { count: "exact", head: true })
    .eq("reel_id", reelId);

  if (countError) {
    console.error(countError);
  } else {
    const { error: updateError } = await dbClient
      .from("reels")
      .update({ comments: count ?? 0 })
      .eq("id", reelId);

    if (updateError) {
      console.error(updateError);
    }
  }

  return NextResponse.json({
    comments: insertedComment ? [mapComment(insertedComment)] : [],
    count: count ?? 0,
    canInteract: true,
  });
}
