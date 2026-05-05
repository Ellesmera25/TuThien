"use client";

import Link from "next/link";
import { useState } from "react";

import { formatCompactNumber } from "@/lib/format";
import type { ReelItem } from "@/lib/types";

type ReelFeedProps = {
  reels: ReelItem[];
};

type ReelIconName = "comment" | "donate" | "heart" | "music" | "share" | "verified";

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

export function ReelFeed({ reels }: ReelFeedProps) {
  const [likedIds, setLikedIds] = useState<string[]>([]);

  if (reels.length === 0) {
    return (
      <section className="flex h-[calc(100vh-80px)] items-center justify-center bg-black px-4 text-sm text-white/70">
        Chưa có reel nào được đăng.
      </section>
    );
  }

  function toggleLike(reelId: string) {
    setLikedIds((current) =>
      current.includes(reelId)
        ? current.filter((id) => id !== reelId)
        : [...current, reelId],
    );
  }

  return (
    <section className="reel-scroll relative h-[calc(100vh-80px)] snap-y snap-mandatory overflow-y-auto bg-black/95">
      <div className="pointer-events-none fixed inset-x-0 top-20 z-40 flex h-16 items-center justify-between px-5 text-white md:hidden">
        <span className="font-display text-lg font-black tracking-tight">
          TuThien.vn
        </span>
      </div>

      {reels.map((reel, index) => {
        const liked = likedIds.includes(reel.id);
        const likeCount = reel.likes + (liked ? 1 : 0);
        const cover = fallbackCover[reel.coverTone];

        return (
          <article
            key={reel.id}
            className="flex min-h-[calc(100vh-80px)] snap-start snap-always items-center justify-center px-0 py-0 sm:px-4 sm:py-5"
          >
            <div className="relative h-[calc(100vh-80px)] w-full max-w-[500px] overflow-hidden bg-black shadow-2xl sm:h-[min(820px,calc(100vh-120px))] sm:rounded-2xl">
              {reel.videoUrl ? (
                <video
                  className="absolute inset-0 h-full w-full object-cover"
                  src={reel.videoUrl}
                  autoPlay={index === 0}
                  loop
                  muted
                  playsInline
                  controls
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
                  <Link
                    href={`/chien-dich/${reel.campaignSlug}`}
                    className="ml-1 rounded-full border border-white/40 px-3 py-1 text-xs font-semibold text-white transition hover:bg-white/10"
                  >
                    Theo dõi
                  </Link>
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
                  value={formatCompactNumber(reel.comments)}
                  icon="comment"
                />
                <ReelAction label="Chia sẻ" value="Chia sẻ" icon="share" />
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
