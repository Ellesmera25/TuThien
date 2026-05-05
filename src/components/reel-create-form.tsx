"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { ReelPayload } from "@/lib/types";

type ReelCreateFormProps = {
  campaigns: Array<{ slug: string; title: string }>;
  defaultCreatorName: string;
};

type FormState = ReelPayload;

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
    videoUrl: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submitReel(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!state.campaignSlug) {
      setError("Cần có ít nhất một chiến dịch trong database trước khi tạo reel.");
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch("/api/reels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...state,
          videoUrl: state.videoUrl?.trim() || undefined,
        }),
      });
      const payload = (await response.json()) as { error?: string; id?: string };

      if (!response.ok) {
        setError(payload.error ?? "Không thể tạo reel. Vui lòng thử lại.");
        return;
      }

      router.push("/reels");
      router.refresh();
    } catch {
      setError("Mất kết nối máy chủ. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
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

        <Field label="Tông cover khi chưa có video">
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

      <Field label="URL video dọc (không bắt buộc)">
        <input
          type="url"
          value={state.videoUrl ?? ""}
          onChange={(event) =>
            setState((prev) => ({ ...prev, videoUrl: event.target.value }))
          }
          className={inputClass}
          placeholder="https://..."
        />
      </Field>

      {error ? (
        <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitting || campaigns.length === 0}
        className="neo-btn neo-btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Đang tạo reel..." : "Tạo reel"}
      </button>
    </form>
  );
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
