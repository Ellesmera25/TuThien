"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { createSupabaseBrowserAuthClient } from "@/lib/supabase/auth-client";
import type { ReelPayload } from "@/lib/types";

type ReelCreateFormProps = {
  campaigns: Array<{ slug: string; title: string }>;
  defaultCreatorName: string;
};

type FormState = Omit<ReelPayload, "videoUrl">;

const bucketName = "reel-videos";
const maxVideoSize = 100 * 1024 * 1024;
const inputClass =
  "w-full rounded-lg border border-outline bg-white px-3 py-2.5 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

export function ReelCreateForm({
  campaigns,
  defaultCreatorName,
}: ReelCreateFormProps) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserAuthClient(), []);
  const [state, setState] = useState<FormState>({
    campaignSlug: campaigns[0]?.slug ?? "",
    caption: "",
    coverTone: "warm",
    creatorName: defaultCreatorName,
    location: "",
    title: "",
  });
  const [error, setError] = useState("");
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingText, setUploadingText] = useState("");
  const [videoPreviewUrl, setVideoPreviewUrl] = useState("");

  useEffect(() => {
    if (!selectedVideo) {
      setVideoPreviewUrl("");
      return;
    }

    const objectUrl = URL.createObjectURL(selectedVideo);
    setVideoPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedVideo]);

  async function submitReel(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setUploadingText("");

    if (!state.campaignSlug) {
      setError("Cần có ít nhất một chiến dịch trong database trước khi tạo reel.");
      return;
    }

    if (!selectedVideo) {
      setError("Vui lòng chọn một file video để upload.");
      return;
    }

    if (!selectedVideo.type.startsWith("video/")) {
      setError("File được chọn phải là video.");
      return;
    }

    if (selectedVideo.size > maxVideoSize) {
      setError("Video tối đa 100MB để tránh tải quá lâu.");
      return;
    }

    if (!supabase) {
      setError("Chưa cấu hình Supabase nên không thể upload video.");
      return;
    }

    let storagePath = "";

    try {
      setSubmitting(true);
      setUploadingText("Đang upload video...");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError("Bạn cần đăng nhập lại trước khi upload video.");
        return;
      }

      storagePath = buildStoragePath(user.id, selectedVideo.name);
      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(storagePath, selectedVideo, {
          cacheControl: "3600",
          contentType: selectedVideo.type,
          upsert: false,
        });

      if (uploadError) {
        setError(
          uploadError.message.includes("Bucket not found")
            ? "Chưa tạo bucket `reel-videos` trong Supabase Storage."
            : uploadError.message,
        );
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(storagePath);

      setUploadingText("Đang lưu thông tin reel...");

      const response = await fetch("/api/reels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...state,
          videoUrl: publicUrlData.publicUrl,
        }),
      });
      const payload = (await response.json()) as { error?: string; id?: string };

      if (!response.ok) {
        await supabase.storage.from(bucketName).remove([storagePath]);
        setError(payload.error ?? "Không thể tạo reel. Vui lòng thử lại.");
        return;
      }

      router.push("/reels");
      router.refresh();
    } catch {
      if (storagePath && supabase) {
        await supabase.storage.from(bucketName).remove([storagePath]);
      }
      setError("Mất kết nối máy chủ. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
      setUploadingText("");
    }
  }

  return (
    <form onSubmit={submitReel} className="surface-card space-y-5 rounded-xl p-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Chiến dịch">
          <select
            required
            value={state.campaignSlug}
            onChange={(event) =>
              setState((prev) => ({ ...prev, campaignSlug: event.target.value }))
            }
            className={inputClass}
            disabled={campaigns.length === 0}
          >
            {campaigns.length === 0 ? (
              <option value="">Chưa có chiến dịch</option>
            ) : null}
            {campaigns.map((campaign) => (
              <option key={campaign.slug} value={campaign.slug}>
                {campaign.title}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Tên đội / người đăng">
          <input
            required
            value={state.creatorName}
            onChange={(event) =>
              setState((prev) => ({ ...prev, creatorName: event.target.value }))
            }
            className={inputClass}
            placeholder="TuThien Field Team"
          />
        </Field>
      </div>

      <Field label="Video reel">
        <input
          required
          type="file"
          accept="video/*"
          onChange={(event) => setSelectedVideo(event.target.files?.[0] ?? null)}
          className="w-full rounded-lg border border-dashed border-outline bg-white px-3 py-3 text-sm text-on-surface-variant file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-bold file:text-white"
        />
        <span className="text-xs font-medium text-on-surface-variant">
          Nên dùng video dọc 9:16, dung lượng tối đa 100MB.
        </span>
      </Field>

      {selectedVideo ? (
        <div className="grid gap-4 rounded-lg border border-outline-variant/40 bg-surface-low p-4 md:grid-cols-[120px_1fr]">
          <div className="aspect-[9/16] overflow-hidden rounded-lg bg-black">
            {videoPreviewUrl ? (
              <video
                src={videoPreviewUrl}
                className="h-full w-full object-cover"
                muted
                playsInline
                controls
              />
            ) : null}
          </div>
          <div className="flex flex-col justify-center gap-1 text-sm">
            <p className="font-bold text-ink">{selectedVideo.name}</p>
            <p className="text-on-surface-variant">
              {formatFileSize(selectedVideo.size)} ·{" "}
              {selectedVideo.type || "video"}
            </p>
            <p className="text-xs leading-5 text-on-surface-variant">
              Nếu lưu metadata thất bại sau khi upload, hệ thống sẽ tự xóa file
              vừa upload để tránh rác trong Storage.
            </p>
          </div>
        </div>
      ) : null}

      <Field label="Tiêu đề reel">
        <input
          required
          minLength={4}
          value={state.title}
          onChange={(event) =>
            setState((prev) => ({ ...prev, title: event.target.value }))
          }
          className={inputClass}
          placeholder="Dòng nước đầu tiên về bản"
        />
      </Field>

      <Field label="Mô tả">
        <textarea
          required
          minLength={8}
          rows={4}
          value={state.caption}
          onChange={(event) =>
            setState((prev) => ({ ...prev, caption: event.target.value }))
          }
          className={inputClass}
          placeholder="Tóm tắt câu chuyện, hoạt động tại hiện trường, kết quả đạt được..."
        />
      </Field>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Địa điểm">
          <input
            required
            value={state.location}
            onChange={(event) =>
              setState((prev) => ({ ...prev, location: event.target.value }))
            }
            className={inputClass}
            placeholder="Y Tý, Lào Cai"
          />
        </Field>

        <Field label="Tông cover dự phòng">
          <select
            value={state.coverTone}
            onChange={(event) =>
              setState((prev) => ({
                ...prev,
                coverTone: event.target.value as FormState["coverTone"],
              }))
            }
            className={inputClass}
          >
            <option value="warm">Ấm áp</option>
            <option value="cool">Xanh dương</option>
            <option value="mint">Xanh lá</option>
            <option value="violet">Tím nhạt</option>
          </select>
        </Field>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
          {error}
        </p>
      ) : null}

      {uploadingText ? (
        <p className="rounded-lg border border-primary/20 bg-primary-fixed/30 px-3 py-2 text-sm font-semibold text-primary">
          {uploadingText}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitting || campaigns.length === 0}
        className="neo-btn neo-btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Đang xử lý..." : "Upload và tạo reel"}
      </button>
    </form>
  );
}

function buildStoragePath(userId: string, fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "mp4";
  const safeExtension = extension.replace(/[^a-z0-9]/g, "") || "mp4";
  return `${userId}/${Date.now()}-${crypto.randomUUID()}.${safeExtension}`;
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) {
    return `${Math.max(size / 1024, 1).toFixed(1)} KB`;
  }

  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function Field({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-bold text-on-surface-variant">
      {label}
      {children}
    </label>
  );
}
