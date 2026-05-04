"use client";

import Link from "next/link";
import { useState } from "react";

import { formatCompactNumber } from "@/lib/format";
import type { ReelItem } from "@/lib/types";

type ReelFeedProps = {
  reels: ReelItem[];
};

const toneClass: Record<ReelItem["coverTone"], string> = {
  warm: "from-primary via-accent to-amber-300",
  cool: "from-cool via-sky-500 to-indigo-500",
  mint: "from-mint via-emerald-500 to-cyan-500",
  violet: "from-violet-600 via-fuchsia-500 to-primary",
};

export function ReelFeed({ reels }: ReelFeedProps) {
  const [likedIds, setLikedIds] = useState<string[]>([]);

  if (reels.length === 0) {
    return (
      <section className="flex h-[calc(100vh-96px)] items-center justify-center bg-[linear-gradient(180deg,#fff7ef_0%,#eef4ff_100%)] px-4 text-sm text-slate-600">
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
    <section className="reel-scroll h-[calc(100vh-96px)] snap-y snap-mandatory overflow-y-auto bg-[linear-gradient(180deg,#fff7ef_0%,#ffffff_46%,#eef4ff_100%)]">
      {reels.map((reel, index) => {
        const liked = likedIds.includes(reel.id);
        const likeCount = reel.likes + (liked ? 1 : 0);

        return (
          <article
            key={reel.id}
            className="flex min-h-[calc(100vh-96px)] snap-start snap-always items-center justify-center px-3 py-4"
          >
            <div className="grid h-[min(760px,calc(100vh-128px))] w-full max-w-[540px] grid-cols-[minmax(0,1fr)_64px] items-end gap-3 sm:grid-cols-[minmax(280px,430px)_76px]">
              <div className="relative mx-auto h-full w-full max-w-[430px] overflow-hidden rounded-[1.7rem] border border-white/80 bg-slate-950 shadow-[0_28px_80px_-38px_rgba(17,20,38,0.72)]">
                {reel.videoUrl ? (
                  <video
                    className="h-full w-full object-cover"
                    src={reel.videoUrl}
                    autoPlay={index === 0}
                    loop
                    muted
                    playsInline
                    controls
                  />
                ) : (
                  <div
                    className={`relative h-full w-full bg-gradient-to-br ${toneClass[reel.coverTone]}`}
                  >
                    <span className="absolute -left-16 top-20 h-48 w-48 rounded-full bg-white/20 blur-2xl" />
                    <span className="absolute -right-20 bottom-28 h-56 w-56 rounded-full bg-black/20 blur-2xl" />
                    <div className="absolute inset-x-5 top-5 flex items-center justify-between">
                      <span className="rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-white backdrop-blur">
                        TuThien Reels
                      </span>
                      <span className="rounded-full bg-black/25 px-2.5 py-1 text-xs font-bold text-white backdrop-blur">
                        {index + 1}/{reels.length}
                      </span>
                    </div>
                    <div className="absolute inset-x-6 top-1/2 -translate-y-1/2">
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-white/75">
                        {reel.location}
                      </p>
                      <h2 className="mt-3 font-display text-4xl font-bold leading-tight text-white sm:text-5xl">
                        {reel.title}
                      </h2>
                    </div>
                  </div>
                )}

                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/58 to-transparent p-5 text-white">
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/18 text-xs font-bold backdrop-blur">
                      TT
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">
                        {reel.creatorName}
                      </p>
                      <p className="truncate text-xs text-white/65">
                        {formatCompactNumber(reel.views)} lượt xem
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-white/88">
                    {reel.caption}
                  </p>
                  <div className="mt-4 flex gap-2">
                    <Link
                      href={`/quyen-gop?campaign=${reel.campaignSlug}`}
                      className="rounded-full bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] text-ink transition hover:bg-primary hover:text-white"
                    >
                      Ủng hộ
                    </Link>
                    <Link
                      href={`/chien-dich/${reel.campaignSlug}`}
                      className="rounded-full border border-white/28 bg-white/12 px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] text-white backdrop-blur transition hover:bg-white/20"
                    >
                      Chi tiết
                    </Link>
                  </div>
                </div>
              </div>

              <div className="flex h-full flex-col justify-end gap-3 pb-4">
                <ReelAction
                  active={liked}
                  label="Thích"
                  value={formatCompactNumber(likeCount)}
                  symbol="♥"
                  onClick={() => toggleLike(reel.id)}
                />
                <ReelAction
                  label="Bình luận"
                  value={formatCompactNumber(reel.comments)}
                  symbol="..."
                />
                <ReelAction label="Chia sẻ" value="Gửi" symbol="↗" />
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
  label,
  value,
  symbol,
  onClick,
}: {
  active?: boolean;
  label: string;
  value: string;
  symbol: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-14 w-14 flex-col items-center justify-center rounded-full border border-white/80 bg-white/90 text-center text-ink shadow-soft backdrop-blur transition hover:-translate-y-0.5 hover:border-primary/30 hover:bg-white sm:h-16 sm:w-16"
      aria-label={label}
    >
      <span
        className={`text-lg leading-none ${active ? "text-primary" : "text-ink"}`}
        aria-hidden="true"
      >
        {symbol}
      </span>
      <span className="mt-1 max-w-full truncate px-1 text-[10px] font-bold uppercase tracking-[0.04em] text-slate-500">
        {value}
      </span>
    </button>
  );
}
