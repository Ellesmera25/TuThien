"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useRouter } from "next/navigation";
import type { ReelPayload } from "@/lib/types";

type ReelCreateFormProps = {
  campaigns: Array<{ slug: string; title: string }>;
  defaultCreatorName: string;
};

type FormState = Omit<ReelPayload, "videoUrl">;

const maxVideoSize = 100 * 1024 * 1024;
const inputClass =
  "w-full rounded-lg border border-outline bg-white px-3 py-2.5 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

export function ReelCreateForm({
  campaigns,
  defaultCreatorName,
}: ReelCreateFormProps) {
  const router = useRouter();
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
  const [selectedStatus, setSelectedStatus] = useState("");
  const [videoPreviewUrl, setVideoPreviewUrl] = useState("");
  const videoPreviewRef = useRef("");

  const campaignsOptions = useMemo(() => campaigns, [campaigns]);

  useEffect(() => {
    return () => {
      if (videoPreviewRef.current) {
        URL.revokeObjectURL(videoPreviewRef.current);
        videoPreviewRef.current = "";
      }
    };
  }, []);

  if (campaignsOptions.length === 0) {
    return (
      <section className="surface-card rounded-xl p-6">
        <p className="text-sm text-on-surface-variant">
          Chưa có chiến dịch phù hợp để tạo reel.
        </p>
      </section>
    );
  }

  function handleVideoChange(file: File | null) {
    if (videoPreviewRef.current) {
      URL.revokeObjectURL(videoPreviewRef.current);
      videoPreviewRef.current = "";
    }

    setSelectedVideo(file);
    if (!file) {
      setVideoPreviewUrl("");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    videoPreviewRef.current = objectUrl;
    setVideoPreviewUrl(objectUrl);
  }

  async function submitReel(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSelectedStatus("");

    if (!state.campaignSlug) {
      setError("Vui lòng chọn một chiến dịch.");
      return;
    }

    if (!selectedVideo) {
      setError("Vui lòng chọn file video.");
      return;
    }

    if (!selectedVideo.type.startsWith("video/")) {
      setError("Tệp đã chọn phải là video.");
      return;
    }

    if (!selectedVideo.size || selectedVideo.size > maxVideoSize) {
      setError("Video phải nhỏ hơn hoặc bằng 100MB.");
      return;
    }

    const payload = new FormData();
    payload.append("campaignSlug", state.campaignSlug);
    payload.append("title", state.title.trim());
    payload.append("caption", state.caption.trim());
    payload.append("creatorName", state.creatorName.trim());
    payload.append("location", state.location.trim());
    payload.append("coverTone", state.coverTone);
    payload.append("videoFile", selectedVideo);

    setSubmitting(true);
    setSelectedStatus("Đang upload video và tạo reel...");

    try {
      const response = await fetch("/api/reels", {
        method: "POST",
        body: payload,
      });

      const result = (await response.json()) as { error?: string; id?: string };

      if (!response.ok) {
        setError(result.error ?? "Không thể tạo reel.");
        return;
      }

      if (!result.id) {
        setError("Không thể tạo reel. Vui lòng thử lại.");
        return;
      }

      router.push("/reels");
      router.refresh();
    } catch {
      setError("Mất kết nối mạng. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
      setSelectedStatus("");
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
          >
            {campaignsOptions.map((campaign) => (
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
          onChange={(event) => handleVideoChange(event.target.files?.[0] ?? null)}
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
              {formatFileSize(selectedVideo.size)} · {selectedVideo.type || "video"}
            </p>
            <p className="text-xs leading-5 text-on-surface-variant">
              Nếu upload thất bại, file vừa chọn sẽ được giải phóng khỏi preview.
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
          placeholder="Dòng mở đầu mạnh mẽ cho câu chuyện"
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
          placeholder="Tóm tắt câu chuyện, hoạt động hiện tại, kết quả mong đạt..."
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

        <Field label="Tone nền">
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

      {selectedStatus ? (
        <p className="rounded-lg border border-primary/20 bg-primary-fixed/30 px-3 py-2 text-sm font-semibold text-primary">
          {selectedStatus}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="neo-btn neo-btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Đang xử lý..." : "Upload và tạo reel"}
      </button>
    </form>
  );
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
