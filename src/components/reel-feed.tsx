"use client";

import Link from "next/link";
import { useRef, useState } from "react";

import { formatCompactNumber } from "@/lib/format";
import type { ReelComment, ReelItem } from "@/lib/types";

type ReelFeedProps = {
  reels: ReelItem[];
};

type ReelIconName =
  | "comment"
  | "donate"
  | "heart"
  | "music"
  | "pause"
  | "play"
  | "share"
  | "verified";

const fallbackCover: Record<ReelItem["coverTone"], string> = {
  warm:
    "https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?auto=format&fit=crop&w=900&q=80",
  cool:
    "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=900&q=80",
  mint:
    "https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=900&q=80",
  violet:
    "https://images.unsplash.com/photo-1491438590914-bc09fcaaf77a?auto=format&fit=crop&w=900&q=80",
};

type ReelsCommentResponse = {
  comments: ReelComment[];
  count: number;
};

type ReelsLikeResponse = {
  liked: boolean;
  likes: number;
  canInteract: boolean;
};

type ReelsFollowResponse = {
  followed: boolean;
  canInteract: boolean;
};

export function ReelFeed({ reels }: ReelFeedProps) {
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

  const [commentDraft, setCommentDraft] = useState("");
  const [commentingReelId, setCommentingReelId] = useState("");
  const [followedCampaigns, setFollowedCampaigns] = useState<Record<string, boolean>>(
    () =>
      Object.fromEntries(
        reels.map((reel) => [reel.campaignSlug, Boolean(reel.isFollowedByCurrentUser)]),
      ),
  );
  const [likedIds, setLikedIds] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(reels.map((reel) => [reel.id, Boolean(reel.isLikedByCurrentUser)])),
  );
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>(() =>
    Object.fromEntries(reels.map((reel) => [reel.id, reel.likes])),
  );
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>(() =>
    Object.fromEntries(reels.map((reel) => [reel.id, reel.comments])),
  );
  const [reelComments, setReelComments] = useState<Record<string, ReelComment[]>>({});
  const [commentLoadingIds, setCommentLoadingIds] = useState<Record<string, boolean>>({});
  const [interactionError, setInteractionError] = useState("");
  const [pausedIds, setPausedIds] = useState<string[]>([]);
  const [sharedId, setSharedId] = useState("");

  if (reels.length === 0) {
    return (
      <section className="flex h-[calc(100vh-80px)] flex-col items-center justify-center gap-4 bg-black px-4 text-center text-sm text-white/70">
        Chưa có reel nào được đăng.
        <Link
          href="/reels/tao"
          className="rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-white transition hover:bg-primary-container"
        >
          Tạo reel đầu tiên
        </Link>
      </section>
    );
  }

  async function toggleLike(reelId: string) {
    setInteractionError("");
    const previousLiked = Boolean(likedIds[reelId]);
    const nextLiked = !previousLiked;
    const previousCount = likeCounts[reelId] ?? 0;

    setLikedIds((current) => ({ ...current, [reelId]: nextLiked }));
    setLikeCounts((current) => ({
      ...current,
      [reelId]: Math.max(0, previousCount + (nextLiked ? 1 : -1)),
    }));

    try {
      const response = await fetch(`/api/reels/${encodeURIComponent(reelId)}/like`, {
        method: "POST",
      });

      const payload: ReelsLikeResponse | { error?: string } = await response.json();

      if (!response.ok) {
        throw new Error((payload as { error?: string }).error ?? "Không thể cập nhật tim.");
      }

      if ((payload as ReelsLikeResponse).canInteract === false) {
        throw new Error("Bạn cần đăng nhập để thích reel này.");
      }

      const result = payload as ReelsLikeResponse;
      setLikedIds((current) => ({ ...current, [reelId]: result.liked }));
      setLikeCounts((current) => ({ ...current, [reelId]: Number(result.likes) }));
    } catch (error) {
      setLikedIds((current) => ({ ...current, [reelId]: previousLiked }));
      setLikeCounts((current) => ({
        ...current,
        [reelId]: previousCount,
      }));
      setInteractionError(
        error instanceof Error ? error.message : "Không thể lưu lượt thích vào database.",
      );
    }
  }

  async function toggleFollow(campaignSlug: string) {
    setInteractionError("");
    const previousFollowed = Boolean(followedCampaigns[campaignSlug]);
    const nextFollowed = !previousFollowed;

    setFollowedCampaigns((current) => ({
      ...current,
      [campaignSlug]: nextFollowed,
    }));

    try {
      const response = await fetch(
        `/api/reels/${encodeURIComponent(campaignSlug)}/follow`,
        {
          method: "POST",
        },
      );

      const payload: ReelsFollowResponse | { error?: string } = await response.json();

      if (!response.ok) {
        throw new Error((payload as { error?: string }).error ?? "Không thể cập nhật theo dõi.");
      }

      if ((payload as ReelsFollowResponse).canInteract === false) {
        throw new Error("Bạn cần đăng nhập để theo dõi chiến dịch.");
      }

      setFollowedCampaigns((current) => ({
        ...current,
        [campaignSlug]: (payload as ReelsFollowResponse).followed,
      }));
    } catch (error) {
      setFollowedCampaigns((current) => ({
        ...current,
        [campaignSlug]: previousFollowed,
      }));
      setInteractionError(
        error instanceof Error ? error.message : "Không thể lưu trạng thái theo dõi.",
      );
    }
  }

  function togglePause(reelId: string) {
    const video = videoRefs.current[reelId];
    const paused = pausedIds.includes(reelId);

    if (paused) {
      void video?.play().catch(() => undefined);
      setPausedIds((current) => current.filter((id) => id !== reelId));
      return;
    }

    video?.pause();
    setPausedIds((current) =>
      current.includes(reelId) ? current : [...current, reelId],
    );
  }

  async function openComments(reelId: string) {
    setInteractionError("");
    const wasOpen = commentingReelId === reelId;
    setCommentingReelId((current) => (current === reelId ? "" : reelId));
    setCommentDraft("");

    if (wasOpen || reelComments[reelId]) {
      return;
    }

    setCommentLoadingIds((current) => ({ ...current, [reelId]: true }));
    try {
      const response = await fetch(`/api/reels/${encodeURIComponent(reelId)}/comments`);
      const payload: ReelsCommentResponse | { error?: string } = await response.json();

      if (!response.ok) {
        const errorPayload = payload as { error?: string };
        setInteractionError(errorPayload.error ?? "Không thể tải bình luận.");
        return;
      }

      const result = payload as ReelsCommentResponse;
      setReelComments((current) => ({
        ...current,
        [reelId]: result.comments ?? [],
      }));
      setCommentCounts((current) => ({
        ...current,
        [reelId]: result.count ?? result.comments.length,
      }));
    } finally {
      setCommentLoadingIds((current) => ({ ...current, [reelId]: false }));
    }
  }

  async function submitComment(reelId: string) {
    setInteractionError("");
    const content = commentDraft.trim();

    if (content.length < 2 || content.length > 180) {
      setInteractionError("Bình luận phải từ 2 đến 180 ký tự.");
      return;
    }

    try {
      const response = await fetch(`/api/reels/${encodeURIComponent(reelId)}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content }),
      });

      const payload: ReelsCommentResponse & { error?: string } = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Không thể gửi bình luận.");
      }

      const createdComment = payload.comments?.[0];
      if (!createdComment) {
        throw new Error("Database đã nhận request nhưng không trả về bình luận mới.");
      }

      setCommentDraft("");
      setReelComments((current) => ({
        ...current,
        [reelId]: [createdComment, ...(current[reelId] ?? [])],
      }));
      setCommentCounts((current) => ({ ...current, [reelId]: payload.count }));
    } catch (error) {
      setInteractionError(
        error instanceof Error ? error.message : "Không thể lưu bình luận vào database.",
      );
    }
  }

  async function shareReel(reel: ReelItem) {
    const shareUrl = `${window.location.origin}/reels?reel=${encodeURIComponent(
      reel.id,
    )}`;
    const shareData = {
      text: reel.caption,
      title: reel.title,
      url: shareUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareUrl);
      }
      setSharedId(reel.id);
      window.setTimeout(() => setSharedId(""), 1800);
    } catch {
      // User cancelled native share dialog.
    }
  }

  return (
    <section className="reel-scroll relative h-[calc(100vh-80px)] snap-y snap-mandatory overflow-y-auto bg-black/95">
      <div className="pointer-events-none fixed inset-x-0 top-20 z-40 flex h-16 items-center justify-between px-5 text-white md:hidden">
        <span className="font-display text-lg font-black tracking-tight">
          TuThien.vn
        </span>
      </div>
      <Link
        href="/reels/tao"
        className="fixed right-4 top-24 z-50 rounded-full bg-white/12 px-4 py-2 text-xs font-bold text-white backdrop-blur transition hover:bg-white/20"
      >
        Tạo reel
      </Link>
      {interactionError ? (
        <div className="fixed left-1/2 top-24 z-50 w-[min(92vw,420px)] -translate-x-1/2 rounded-lg border border-red-100 bg-white px-4 py-3 text-sm font-semibold text-red-700 shadow-xl">
          {interactionError}
        </div>
      ) : null}

      {reels.map((reel, index) => {
        const liked = Boolean(likedIds[reel.id]);
        const likeCount = likeCounts[reel.id] ?? reel.likes;
        const comments = reelComments[reel.id] ?? [];
        const commentCount = commentCounts[reel.id] ?? reel.comments;
        const commentLoading = Boolean(commentLoadingIds[reel.id]);
        const cover = fallbackCover[reel.coverTone];
        const followed = Boolean(followedCampaigns[reel.campaignSlug]);
        const paused = pausedIds.includes(reel.id);
        const commentOpen = commentingReelId === reel.id;

        return (
          <article
            key={reel.id}
            className="flex min-h-[calc(100vh-80px)] snap-start snap-always items-center justify-center px-0 py-0 sm:px-4 sm:py-5"
          >
            <div className="relative h-[calc(100vh-80px)] w-full max-w-[500px] overflow-hidden bg-black shadow-2xl sm:h-[min(820px,calc(100vh-120px))] sm:rounded-2xl">
              {reel.videoUrl ? (
                <video
                  ref={(node) => {
                    videoRefs.current[reel.id] = node;
                  }}
                  className="absolute inset-0 h-full w-full object-cover"
                  src={reel.videoUrl}
                  autoPlay={index === 0}
                  loop
                  muted
                  playsInline
                  onClick={() => togglePause(reel.id)}
                />
              ) : (
                <div
                  role="img"
                  aria-label={reel.title}
                  className="absolute inset-0 h-full w-full bg-cover bg-center opacity-80"
                  style={{ backgroundImage: `url(${cover})` }}
                />
              )}

              <div className="absolute inset-0 bg-gradient-to-b from-black/28 via-transparent to-black/92" />

              {reel.videoUrl ? (
                <button
                  type="button"
                  onClick={() => togglePause(reel.id)}
                  className={`absolute left-1/2 top-1/2 z-20 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur transition ${
                    paused ? "opacity-100" : "opacity-0 hover:opacity-100"
                  }`}
                  aria-label={paused ? "Phát video" : "Tạm dừng video"}
                >
                  <ReelIcon
                    name={paused ? "play" : "pause"}
                    className="h-8 w-8"
                    filled
                  />
                </button>
              ) : null}

              <div className="absolute left-0 top-0 z-10 h-1 w-full bg-white/20">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${((index + 1) / reels.length) * 100}%` }}
                />
              </div>

              <div className="absolute bottom-0 left-0 right-16 z-10 flex flex-col gap-4 p-5 text-white sm:p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-primary bg-white/15 font-display text-sm font-black backdrop-blur">
                    TT
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-sm font-bold">
                        {reel.creatorName}
                      </h3>
                      <ReelIcon name="verified" className="h-4 w-4 text-primary" />
                    </div>
                    <p className="truncate text-xs text-white/78">
                      {reel.location}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleFollow(reel.campaignSlug)}
                    className={`ml-1 rounded-full border px-3 py-1 text-xs font-semibold transition ${
                      followed
                        ? "border-primary bg-primary text-white"
                        : "border-white/40 text-white hover:bg-white/10"
                    }`}
                  >
                    {followed ? "Đang theo dõi" : "Theo dõi"}
                  </button>
                </div>

                <div>
                  <h2 className="font-display text-2xl font-bold leading-tight">
                    {reel.title}
                  </h2>
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-white/90">
                    {reel.caption} #TuThien #MinhBach #CongDong
                  </p>
                </div>

                <div className="flex w-fit items-center gap-2 rounded-full bg-black/30 px-3 py-1.5 text-xs text-white/80 backdrop-blur">
                  <ReelIcon name="music" className="h-4 w-4" />
                  <span>Âm thanh gốc - {reel.creatorName}</span>
                </div>
              </div>

              <div className="absolute bottom-4 right-2 z-20 flex flex-col items-center gap-5 pb-16 sm:right-4">
                <ReelAction
                  active={liked}
                  label="Thích"
                  value={formatCompactNumber(likeCount)}
                  icon="heart"
                  onClick={() => toggleLike(reel.id)}
                />
                <ReelAction
                  label="Bình luận"
                  value={formatCompactNumber(commentCount)}
                  icon="comment"
                  active={commentOpen}
                  onClick={() => openComments(reel.id)}
                />
                <ReelAction
                  label="Chia sẻ"
                  value={sharedId === reel.id ? "Đã copy" : "Chia sẻ"}
                  icon="share"
                  onClick={() => shareReel(reel)}
                />
                <ReelAction
                  active={paused}
                  label={paused ? "Phát" : "Tạm dừng"}
                  value={paused ? "Phát" : "Tạm dừng"}
                  icon={paused ? "play" : "pause"}
                  onClick={() => togglePause(reel.id)}
                />
                <Link
                  href={`/quyen-gop?campaign=${reel.campaignSlug}`}
                  className="group mt-2 flex flex-col items-center gap-1"
                >
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary shadow-[0_0_15px_rgba(234,88,12,0.45)] transition group-active:scale-95">
                    <ReelIcon name="donate" className="h-8 w-8 text-white" />
                  </span>
                  <span className="text-xs font-bold text-primary-fixed drop-shadow">
                    Quyên góp
                  </span>
                </Link>
              </div>

              {commentOpen ? (
                <div
                  className="absolute inset-x-4 bottom-4 z-30 rounded-xl border border-stone-200 bg-white/95 p-4 shadow-2xl backdrop-blur sm:bottom-5 sm:left-5 sm:right-20"
                  style={{ color: "#1a1c1c" }}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-bold">Bình luận</h3>
                    <button
                      type="button"
                      onClick={() => setCommentingReelId("")}
                      className="rounded-full px-2 py-1 text-xs font-bold text-stone-600 transition hover:bg-stone-100 hover:text-stone-950"
                    >
                      Đóng
                    </button>
                  </div>
                  {interactionError ? (
                    <p className="mb-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                      {interactionError}
                    </p>
                  ) : null}
                  <div className="max-h-32 space-y-2 overflow-y-auto pr-1">
                    {commentLoading ? (
                      <p className="rounded-lg bg-stone-100 px-3 py-2 text-xs text-stone-700">
                        Đang tải bình luận...
                      </p>
                    ) : comments.length > 0 ? (
                      comments.map((comment) => (
                        <p
                          key={comment.id}
                          className="rounded-lg bg-stone-100 px-3 py-2 text-xs leading-5 text-stone-900"
                        >
                          <span className="font-bold text-primary">
                            {comment.authorName}
                          </span>{" "}
                          {comment.content}
                        </p>
                      ))
                    ) : (
                      <p className="rounded-lg bg-stone-100 px-3 py-2 text-xs text-stone-700">
                        Chưa có bình luận mới trong phiên này.
                      </p>
                    )}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <input
                      value={commentDraft}
                      onChange={(event) => setCommentDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          void submitComment(reel.id);
                        }
                      }}
                      maxLength={180}
                      className="min-w-0 flex-1 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none placeholder:text-stone-500 focus:border-primary"
                      style={{
                        backgroundColor: "#ffffff",
                        caretColor: "#a33900",
                        color: "#1a1c1c",
                      }}
                      placeholder="Viết bình luận..."
                    />
                    <button
                      type="button"
                      onClick={() => void submitComment(reel.id)}
                      className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white transition hover:bg-primary-container"
                    >
                      Gửi
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </article>
        );
      })}
    </section>
  );
}

function ReelAction({
  active = false,
  icon,
  label,
  onClick,
  value,
}: {
  active?: boolean;
  icon: ReelIconName;
  label: string;
  onClick?: () => void;
  value: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col items-center gap-1"
      aria-label={label}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/40 backdrop-blur transition group-hover:bg-black/60">
        <ReelIcon
          name={icon}
          className={`h-7 w-7 ${active ? "text-primary" : "text-white"}`}
          filled={active}
        />
      </span>
      <span className="max-w-[64px] truncate text-xs font-bold text-white drop-shadow-md">
        {value}
      </span>
    </button>
  );
}

function ReelIcon({
  className,
  filled = false,
  name,
}: {
  className: string;
  filled?: boolean;
  name: ReelIconName;
}) {
  const common = {
    className,
    fill: filled ? "currentColor" : "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 2,
    viewBox: "0 0 24 24",
  };

  switch (name) {
    case "comment":
      return (
        <svg {...common} aria-hidden="true">
          <path d="M21 12a8 8 0 0 1-8 8H7l-4 3v-6a8 8 0 1 1 18-5Z" />
        </svg>
      );
    case "donate":
      return (
        <svg {...common} aria-hidden="true">
          <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" />
          <path d="M4 15.5 2.5 17" />
          <path d="M20 15.5l1.5 1.5" />
        </svg>
      );
    case "heart":
      return (
        <svg {...common} aria-hidden="true">
          <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />
        </svg>
      );
    case "music":
      return (
        <svg {...common} aria-hidden="true">
          <path d="M9 18V5l10-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="16" cy="16" r="3" />
        </svg>
      );
    case "pause":
      return (
        <svg {...common} aria-hidden="true">
          <path d="M8 5v14" />
          <path d="M16 5v14" />
        </svg>
      );
    case "play":
      return (
        <svg {...common} aria-hidden="true" fill="currentColor">
          <path d="M8 5v14l11-7-11-7Z" />
        </svg>
      );
    case "share":
      return (
        <svg {...common} aria-hidden="true">
          <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
          <path d="m16 6-4-4-4 4" />
          <path d="M12 2v14" />
        </svg>
      );
    case "verified":
      return (
        <svg {...common} aria-hidden="true" fill="currentColor" stroke="none">
          <path d="M12 2 9.8 4.2 6.7 3.8l-.5 3.1L3.5 8.5 5 11.3 3.5 14l2.7 1.6.5 3.1 3.1-.4L12 20.5l2.2-2.2 3.1.4.5-3.1 2.7-1.6-1.5-2.7 1.5-2.8-2.7-1.6-.5-3.1-3.1.4L12 2Zm-1 13.2-3.2-3.2 1.4-1.4 1.8 1.8 4.1-4.1 1.4 1.4-5.5 5.5Z" />
        </svg>
      );
  }
}
