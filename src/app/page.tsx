import Link from "next/link";

import { CampaignCard } from "@/components/campaign-card";
import {
  getCampaigns,
  getDashboardSummary,
  getReels,
} from "@/lib/data";
import { formatCompactNumber, formatVnd } from "@/lib/format";

const homeHeroBackground = [
  "linear-gradient(180deg, rgba(11, 31, 58, 0.98) 0%, rgba(34, 41, 87, 0.92) 18%, rgba(13, 148, 136, 0.68) 50%, rgba(34, 41, 87, 0.92) 82%, rgba(11, 31, 58, 0.98) 100%)",
  "linear-gradient(180deg, rgba(11, 31, 58, 0.36) 0%, rgba(11, 31, 58, 0.18) 48%, rgba(11, 31, 58, 0.48) 100%)",
  'url("https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=1800&q=85")',
].join(", ");

export default async function HomePage() {
  const [campaigns, summary, reels] = await Promise.all([
    getCampaigns(),
    getDashboardSummary(),
    getReels(),
  ]);

  const campaignList = Array.isArray(campaigns) ? campaigns : [];
  const reelList = Array.isArray(reels) ? reels : [];
  const featuredCampaigns = campaignList.slice(0, 3);
  const featuredReels = reelList.slice(0, 4);

  return (
    <div className="-mt-8 pb-8">
      <section
        className="relative left-1/2 min-h-[640px] w-screen -translate-x-1/2 overflow-hidden bg-primary text-white"
        style={{
          backgroundImage: homeHeroBackground,
          backgroundPosition: "center",
          backgroundSize: "cover",
        }}
      >
        <div className="relative z-10 mx-auto flex min-h-[640px] max-w-7xl flex-col justify-end px-4 pb-14 pt-28 sm:px-6 lg:min-h-[calc(100vh-80px)] lg:pb-20">
          <div className="max-w-4xl">
            <div className="inline-flex w-max items-center gap-2 border border-emerald-200/60 bg-emerald-300/20 px-4 py-2 text-emerald-50 backdrop-blur">
              <Icon name="shield" className="h-4 w-4 text-emerald-200" />
              <span className="text-xs font-bold uppercase tracking-[0.08em]">
                Đối soát minh bạch từng khoản đóng góp
              </span>
            </div>

            <h1 className="mt-7 font-display text-5xl font-black leading-[1.02] tracking-tight text-white sm:text-7xl">
              TuThien.vn
            </h1>
            <p className="mt-5 max-w-2xl text-xl font-semibold leading-8 text-white/90 sm:text-2xl">
              Minh bạch tuyệt đối trong từng khoản quyên góp, từ lúc tiếp nhận
              đến khi giải ngân.
            </p>
            <p className="mt-4 max-w-2xl text-base leading-7 text-white/75 sm:text-lg">
              Nền tảng giúp nhà hảo tâm theo dõi chiến dịch, dòng tiền và chứng
              từ theo một luồng rõ ràng để cộng đồng dễ kiểm chứng.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/quyen-gop"
                className="neo-btn border border-white bg-white px-8 text-primary hover:border-emerald-200 hover:bg-emerald-200"
              >
                Quyên góp ngay
                <Icon name="heartHands" className="h-4 w-4" />
              </Link>
              <Link
                href="/minh-bach"
                className="neo-btn border border-white/70 bg-transparent px-8 text-white hover:border-emerald-200 hover:bg-emerald-300 hover:text-primary"
              >
                Xem minh bạch
                <Icon name="arrowRight" className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="mt-12 flex flex-col gap-3 border-t border-white/20 pt-6 text-sm font-bold uppercase tracking-[0.08em] text-white/90 sm:flex-row sm:items-center sm:justify-between">
            <span>Nền tảng thiện nguyện công khai, dễ đối soát</span>
            <span className="text-emerald-200">
              {formatVnd(summary.totalRaised)} đã được ghi nhận
            </span>
          </div>
        </div>
      </section>

      <section className="relative left-1/2 w-screen -translate-x-1/2 bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto mb-10 max-w-4xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-emerald-700">
              Nền tảng quyên góp minh bạch
            </p>
            <h2 className="mt-4 font-display text-4xl font-semibold leading-tight tracking-tight text-primary sm:text-5xl">
              Góp một bàn tay cho nhiều cuộc đời nhỏ
            </h2>
            <p className="mt-4 text-base leading-7 text-on-surface-variant">
              Số liệu, chiến dịch và chứng từ được tổ chức rõ ràng để người dùng
              theo dõi đầy đủ mà không bị rối bởi phần trình bày.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <Metric
              label="Tổng tiền quyên góp"
              value={formatVnd(summary.totalRaised)}
            />
            <Metric
              label="Chiến dịch đang chạy"
              value={`${summary.activeCampaignCount}`}
            />
            <Metric label="Nhà hảo tâm" value={`${summary.donorCount}+`} />
          </div>
        </div>
      </section>

      <section className="soft-band relative left-1/2 w-screen -translate-x-1/2 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="font-display text-4xl font-semibold tracking-tight text-ink">
                Reels tác động
              </h2>
              <p className="mt-2 max-w-2xl text-base leading-7 text-on-surface-variant">
                Các câu chuyện ngắn giúp người xem hiểu nhanh tình hình thực tế
                và đi thẳng đến hành động quyên góp.
              </p>
            </div>
            <Link
              href="/reels"
              className="inline-flex items-center gap-1 font-bold text-primary transition hover:text-primary-container"
            >
              Lướt reels{" "}
              <Icon name="arrowRight" className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {featuredReels.map((reel) => (
              <Link
                key={reel.id}
                href="/reels"
                className="group relative aspect-[9/16] overflow-hidden rounded-xl bg-surface-highest shadow-ambient transition hover:-translate-y-1 hover:shadow-card"
              >
                <div className="absolute inset-0 bg-[linear-gradient(135deg,#0b1f3a_0%,#123b66_54%,#020617_100%)] transition group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                  <div className="mb-2 flex items-center gap-1">
                    <Icon name="play" className="h-4 w-4" />
                    <span className="text-xs font-semibold">
                      {formatCompactNumber(reel.views)}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-sm font-bold leading-5">
                    {reel.title}
                  </p>
                  <div className="mt-2 w-max rounded bg-white/20 px-2 py-1 backdrop-blur">
                    <p className="text-xs font-bold text-primary-fixed">
                      {reel.location}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="soft-band relative left-1/2 w-screen -translate-x-1/2 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="font-display text-4xl font-semibold tracking-tight text-ink">
                Chiến dịch đang nhận ủng hộ
              </h2>
              <p className="mt-2 max-w-2xl text-base leading-7 text-on-surface-variant">
                Mọi đóng góp đều được ghi nhận trực tiếp để cộng đồng cùng theo
                dõi tiến độ và kết quả giải ngân.
              </p>
            </div>
            <Link
              href="/chien-dich"
              className="inline-flex items-center gap-1 font-bold text-primary transition hover:text-primary-container"
            >
              Xem tất cả{" "}
              <Icon name="arrowRight" className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {featuredCampaigns.map((campaign) => (
              <CampaignCard key={campaign.id} campaign={campaign} />
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <h2 className="font-display text-4xl font-semibold tracking-tight text-ink">
            Quy trình 3 lớp đối soát
          </h2>
          <p className="mt-4 text-lg leading-8 text-on-surface-variant">
            Chúng tôi tổ chức dữ liệu theo từng bước để người đóng góp dễ kiểm
            chứng trước, trong và sau khi chiến dịch triển khai.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <StepCard
            icon="check"
            title="1. Kiểm chứng chặt chẽ"
            content="Chiến dịch được rà soát hồ sơ, mục tiêu tài chính và kế hoạch thực thi trước khi hiển thị."
          />
          <StepCard
            highlighted
            icon="globe"
            title="2. Công khai real-time"
            content="Số tiền tiếp nhận, tiến độ và các bản ghi liên quan được cập nhật để cộng đồng cùng theo dõi."
          />
          <StepCard
            icon="chart"
            title="3. Báo cáo giải ngân"
            content="Mỗi khoản chi được lưu vào trang minh bạch kèm thời gian, nội dung và chứng từ đối soát."
          />
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article className="surface-card p-8 text-center">
      <p className="mb-2 text-xs font-bold uppercase tracking-[0.1em] text-on-surface-variant">
        {label}
      </p>
      <p className="font-display text-3xl font-semibold text-primary">
        {value}
      </p>
    </article>
  );
}

function StepCard({
  content,
  highlighted = false,
  icon,
  title,
}: {
  content: string;
  highlighted?: boolean;
  icon: IconName;
  title: string;
}) {
  return (
    <article className="surface-card relative overflow-hidden rounded-xl p-8">
      {highlighted ? (
        <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-primary/5 blur-2xl" />
      ) : null}
      <div
        className={`mb-6 flex h-12 w-12 items-center justify-center rounded-full ${
          highlighted ? "bg-primary text-white" : "bg-surface-container text-on-secondary-fixed"
        }`}
      >
        <Icon name={icon} className="h-6 w-6" />
      </div>
      <h3 className="font-display text-2xl font-semibold text-ink">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-on-surface-variant">
        {content}
      </p>
    </article>
  );
}

type IconName =
  | "arrowRight"
  | "chart"
  | "check"
  | "globe"
  | "heartHands"
  | "play"
  | "receipt"
  | "shield";

function Icon({
  className = "h-5 w-5",
  name,
}: {
  className?: string;
  name: IconName;
}) {
  const common = {
    className,
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 2,
    viewBox: "0 0 24 24",
  };

  switch (name) {
    case "arrowRight":
      return (
        <svg {...common} aria-hidden="true">
          <path d="M5 12h14" />
          <path d="m13 6 6 6-6 6" />
        </svg>
      );
    case "chart":
      return (
        <svg {...common} aria-hidden="true">
          <path d="M4 19V5" />
          <path d="M4 19h16" />
          <path d="M8 16v-5" />
          <path d="M12 16V8" />
          <path d="M16 16v-3" />
        </svg>
      );
    case "check":
      return (
        <svg {...common} aria-hidden="true">
          <path d="M9 11.5 11 14l4-5" />
          <path d="M5 4h14v16H5z" />
        </svg>
      );
    case "globe":
      return (
        <svg {...common} aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18" />
          <path d="M12 3c2.5 2.7 2.5 15.3 0 18" />
          <path d="M12 3c-2.5 2.7-2.5 15.3 0 18" />
        </svg>
      );
    case "heartHands":
      return (
        <svg {...common} aria-hidden="true">
          <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" />
          <path d="M4 14.5 2.5 16" />
          <path d="M20 14.5l1.5 1.5" />
          <path d="M8 21h8" />
        </svg>
      );
    case "play":
      return (
        <svg {...common} aria-hidden="true" fill="currentColor" stroke="none">
          <path d="M8 5v14l11-7L8 5Z" />
        </svg>
      );
    case "receipt":
      return (
        <svg {...common} aria-hidden="true">
          <path d="M7 3h10a2 2 0 0 1 2 2v16l-3-2-2 2-2-2-2 2-2-2-3 2V5a2 2 0 0 1 2-2Z" />
          <path d="M9 8h6" />
          <path d="M9 12h6" />
          <path d="M9 16h4" />
        </svg>
      );
    case "shield":
      return (
        <svg {...common} aria-hidden="true">
          <path d="M12 3 5 6v5c0 4.6 2.8 8.7 7 10 4.2-1.3 7-5.4 7-10V6l-7-3Z" />
          <path d="m9 12 2 2 4-5" />
        </svg>
      );
  }
}
