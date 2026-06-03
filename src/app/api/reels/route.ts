import { NextResponse } from "next/server";

import { createSupabaseServerAuthClient } from "@/lib/supabase/auth-server";
import { isSameOriginMutation } from "@/lib/http-security";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import type { ReelPayload } from "@/lib/types";

const bucketName = "reel-videos";
const maxVideoSizeBytes = 100 * 1024 * 1024;
const coverTones = ["warm", "cool", "mint", "violet"] as const;
const allowedVideoTypes = new Map([
  ["mp4", "video/mp4"],
  ["webm", "video/webm"],
  ["mov", "video/quicktime"],
  ["m4v", "video/x-m4v"],
]);

function sanitizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isStorageVideoUrl(value: string): boolean {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl || !isValidUrl(value)) {
    return false;
  }

  const parsedValue = new URL(value);
  const parsedSupabaseUrl = new URL(supabaseUrl);

  return (
    parsedValue.origin === parsedSupabaseUrl.origin &&
    parsedValue.pathname.includes("/storage/v1/object/public/reel-videos/")
  );
}

function isValidPayload(payload: Partial<ReelPayload>): payload is ReelPayload {
  if (!sanitizeText(payload.campaignSlug)) {
    return false;
  }

  const title = sanitizeText(payload.title);
  if (!title || title.length < 4 || title.length > 120) {
    return false;
  }

  const caption = sanitizeText(payload.caption);
  if (!caption || caption.length < 8 || caption.length > 800) {
    return false;
  }

  const creatorName = sanitizeText(payload.creatorName);
  if (!creatorName || creatorName.length < 2 || creatorName.length > 120) {
    return false;
  }

  const location = sanitizeText(payload.location);
  if (!location || location.length < 2 || location.length > 160) {
    return false;
  }

  if (!coverTones.includes(payload.coverTone as (typeof coverTones)[number])) {
    return false;
  }

  if (payload.videoUrl !== undefined && !isStorageVideoUrl(payload.videoUrl)) {
    return false;
  }

  return true;
}

function buildStoragePath(userId: string, fileName: string) {
  const extension = sanitizeText(fileName).split(".").pop()?.toLowerCase() ?? "mp4";
  const safeExtension = allowedVideoTypes.has(extension) ? extension : "mp4";
  return `${userId}/${Date.now()}-${crypto.randomUUID()}.${safeExtension}`;
}

function getVideoExtension(fileName: string) {
  return sanitizeText(fileName).split(".").pop()?.toLowerCase() ?? "";
}

function getUploadContentType(file: File) {
  if (file.type && file.type.startsWith("video/")) {
    return file.type;
  }

  return allowedVideoTypes.get(getVideoExtension(file.name)) ?? null;
}

async function ensureReelVideoBucket(
  storage: NonNullable<ReturnType<typeof getSupabaseServiceClient>>["storage"],
) {
  const allowedMimeTypes = Array.from(new Set(allowedVideoTypes.values()));
  const { error: getBucketError } = await storage.getBucket(bucketName);

  if (!getBucketError) {
    await storage.updateBucket(bucketName, {
      public: true,
      fileSizeLimit: maxVideoSizeBytes,
      allowedMimeTypes,
    });
    return null;
  }

  const { error: createBucketError } = await storage.createBucket(bucketName, {
    public: true,
    fileSizeLimit: maxVideoSizeBytes,
    allowedMimeTypes,
  });

  return createBucketError;
}

function parseMultipartBody(formData: FormData) {
  const uploadedVideo = formData.get("videoFile");

  return {
    campaignSlug: sanitizeText(formData.get("campaignSlug")),
    title: sanitizeText(formData.get("title")),
    caption: sanitizeText(formData.get("caption")),
    creatorName: sanitizeText(formData.get("creatorName")),
    location: sanitizeText(formData.get("location")),
    coverTone: sanitizeText(formData.get("coverTone")),
    videoUrl: sanitizeText(formData.get("videoUrl")),
    uploadedVideo: uploadedVideo instanceof File ? uploadedVideo : null,
  };
}

function parseJsonBody(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const raw = payload as Partial<ReelPayload>;

  return {
    campaignSlug: sanitizeText(raw.campaignSlug),
    title: sanitizeText(raw.title),
    caption: sanitizeText(raw.caption),
    creatorName: sanitizeText(raw.creatorName),
    location: sanitizeText(raw.location),
    coverTone: sanitizeText(raw.coverTone),
    videoUrl: sanitizeText(raw.videoUrl),
    uploadedVideo: null,
  };
}

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) {
    return NextResponse.json(
      { error: "Nguồn request không hợp lệ." },
      { status: 403 },
    );
  }

  const { client: authClient } = await createSupabaseServerAuthClient();

  if (!authClient) {
    return NextResponse.json(
      {
        error: "Chưa cấu hình Supabase Auth nên chưa thể tạo reel.",
      },
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

  const dbClient = getSupabaseServiceClient();

  if (!dbClient) {
    return NextResponse.json(
      { error: "Chưa cấu hình Supabase service role key nên chưa thể tạo reel." },
      { status: 503 },
    );
  }

  const contentType = request.headers.get("content-type") ?? "";
  let parsed:
    | ReturnType<typeof parseMultipartBody>
    | ReturnType<typeof parseJsonBody>
    | null;

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    parsed = parseMultipartBody(formData);
  } else if (contentType.includes("application/json")) {
    const body = (await request.json().catch(() => null)) as unknown;
    parsed = parseJsonBody(body);
  } else {
    return NextResponse.json(
      { error: "Nội dung request không hợp lệ." },
      { status: 400 },
    );
  }

  if (!parsed) {
    return NextResponse.json(
      { error: "Nội dung request không hợp lệ." },
      { status: 400 },
    );
  }

  const body: Partial<ReelPayload> = {
    campaignSlug: parsed.campaignSlug,
    title: parsed.title,
    caption: parsed.caption,
    creatorName: parsed.creatorName,
    location: parsed.location,
    coverTone: parsed.coverTone as ReelPayload["coverTone"],
    videoUrl: parsed.videoUrl || undefined,
  };

  if (!isValidPayload(body)) {
    return NextResponse.json(
      { error: "Dữ liệu reel không hợp lệ." },
      { status: 400 },
    );
  }

  const { data: campaign, error: campaignError } = await dbClient
    .from("campaigns")
    .select("slug")
    .eq("slug", body.campaignSlug.trim())
    .eq("review_status", "published")
    .maybeSingle();

  if (campaignError || !campaign) {
    return NextResponse.json(
      { error: "Chiến dịch đã chọn không tồn tại trong cơ sở dữ liệu." },
      { status: 400 },
    );
  }

  let uploadedPath: string | null = null;
  let videoUrl = body.videoUrl;
  if (parsed.uploadedVideo) {
    const contentType = getUploadContentType(parsed.uploadedVideo);

    if (!contentType) {
      return NextResponse.json({ error: "File đã chọn phải là video." }, { status: 400 });
    }

    if (!parsed.uploadedVideo.size || parsed.uploadedVideo.size > maxVideoSizeBytes) {
      return NextResponse.json({ error: "Video phải nhỏ hơn hoặc bằng 100MB." }, { status: 400 });
    }

    const bucketError = await ensureReelVideoBucket(dbClient.storage);

    if (bucketError) {
      console.error("Ensure reel bucket error:", bucketError);
      return NextResponse.json(
        { error: "Không thể chuẩn bị storage bucket để upload reel." },
        { status: 500 },
      );
    }

    uploadedPath = buildStoragePath(user.id, parsed.uploadedVideo.name);
    const { error: uploadError } = await dbClient.storage
      .from(bucketName)
      .upload(uploadedPath, parsed.uploadedVideo, {
        cacheControl: "3600",
        contentType,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        {
          error:
            uploadError.message === "Bucket not found"
              ? "Chưa tạo bucket `reel-videos` trong Supabase Storage."
              : "Không thể tải video lên. Vui lòng thử lại.",
        },
        { status: 500 },
      );
    }

    const { data: publicUrlData } = dbClient.storage
      .from(bucketName)
      .getPublicUrl(uploadedPath);
    videoUrl = publicUrlData.publicUrl;
  }

  if (!videoUrl || !isStorageVideoUrl(videoUrl)) {
    return NextResponse.json(
      {
        error:
          "Video URL không hợp lệ. Vui lòng upload video hoặc cung cấp URL đã lưu trên Storage.",
      },
      { status: 400 },
    );
  }

  const { data, error } = await dbClient
    .from("reels")
    .insert({
      user_id: user.id,
      campaign_slug: body.campaignSlug.trim(),
      title: body.title.trim(),
      caption: body.caption.trim(),
      creator_name: body.creatorName.trim(),
      location: body.location.trim(),
      video_url: videoUrl.trim(),
      cover_tone: body.coverTone,
      views: 0,
      likes: 0,
      comments: 0,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Create reel error:", error);

    if (uploadedPath) {
      await dbClient.storage.from(bucketName).remove([uploadedPath]).catch(() => {});
    }

    return NextResponse.json(
      { error: "Không thể tạo reel. Vui lòng thử lại." },
      { status: 500 },
    );
  }

  return NextResponse.json({ id: data.id });
}
