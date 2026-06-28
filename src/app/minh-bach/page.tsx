import Link from "next/link";
import type { Metadata } from "next";

import { LazySignedFileLink } from "@/components/lazy-signed-file-link";
import { getDonationChain, getTransparencyItems } from "@/lib/data";
import { formatDate, formatVnd } from "@/lib/format";

export const metadata: Metadata = {
  title: "Minh bạch",
  description: "Theo dõi sao kê đóng góp và nhật ký giải ngân.",
};

type TransparencyPageProps = {
  searchParams: Promise<{
    chainPage?: string;
    view?: string;
  }>;
};

type TransparencyView = "donate-chain" | "disbursements";

const chainPageSize = 20;

export default async function TransparencyPage({
  searchParams,
}: TransparencyPageProps) {
  const params = await searchParams;
  const activeView = getTransparencyView(params.view);
  const currentChainPage = Math.max(Number(params.chainPage ?? "1") || 1, 1);
  const logs =
    activeView === "disbursements" ? await getTransparencyItems() : [];
  const donationChainPage =
    activeView === "donate-chain"
      ? await getDonationChain({
          page: currentChainPage,
          pageSize: chainPageSize,
        })
      : {
          items: [],
          page: 1,
          pageSize: chainPageSize,
          totalItems: 0,
          totalPages: 1,
        };
  const donationChain = donationChainPage.items;

  const totalDisbursement = logs.reduce((sum, item) => sum + item.amount, 0);
  const currentPageDonation = donationChain.reduce(
    (sum, item) => sum + item.amount,
    0,
  );
  const invoiceCount = logs.filter((item) => item.proofUrl).length;

  return (
    <div className="space-y-8 pb-8">
      <header className="neo-panel-strong bg-white p-7 sm:p-9">
        <p className="neo-badge border-outline-variant bg-primary-fixed text-primary">
          Transparency Board
        </p>
        <h1 className="mt-3 font-display text-4xl font-bold text-primary sm:text-5xl">
          Bảng minh bạch tài chính
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-on-surface-variant sm:text-base">
          Mỗi khoản đóng góp và khoản chi đều được cập nhật để cộng đồng theo
          dõi đầy đủ, rõ ràng và dễ đối soát.
        </p>
      </header>

      <nav className="grid gap-4 md:grid-cols-2">
        <TransparencyNavCard
          active={activeView === "donate-chain"}
          description="Theo dõi từng block đóng góp đã xác minh."
          href="/minh-bach?view=donate-chain"
          label="Donate chain"
        />
        <TransparencyNavCard
          active={activeView === "disbursements"}
          description="Theo dõi khoản chi và hóa đơn đỏ đi kèm."
          href="/minh-bach?view=disbursements"
          label="Nhật ký giải ngân"
        />
      </nav>

      <section className="grid gap-4 md:grid-cols-3">
        {activeView === "donate-chain" ? (
          <>
            <SmallMetric
              label="Donate chain trang này"
              value={formatVnd(currentPageDonation)}
            />
            <SmallMetric
              label="Tổng block đối soát"
              value={`${donationChainPage.totalItems}`}
            />
            <SmallMetric
              label="Trang hiện tại"
              value={`${donationChainPage.page}/${donationChainPage.totalPages}`}
            />
          </>
        ) : (
          <>
            <SmallMetric
              label="Tổng khoản chi"
              value={formatVnd(totalDisbursement)}
            />
            <SmallMetric label="Dòng nhật ký" value={`${logs.length}`} />
            <SmallMetric label="Có hóa đơn đỏ" value={`${invoiceCount}`} />
          </>
        )}
      </section>

      {activeView === "donate-chain" ? (
      <section className="neo-panel overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-primary">
              Live donation ledger
            </p>
            <h2 className="mt-1 font-display text-2xl font-bold text-ink">
              Donate chain
            </h2>
          </div>
          <span className="rounded-full bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700">
            {donationChainPage.totalItems} block đã xác minh
          </span>
        </div>

        <div className="grid gap-3 bg-surface-low p-4 md:hidden">
          {donationChain.length === 0 ? (
            <p className="border border-outline-variant bg-white px-4 py-6 text-center text-sm font-semibold text-slate-500">
              Chưa có donate chain được xác minh.
            </p>
          ) : (
            donationChain.map((item) => (
              <article
                key={item.id}
                className="border border-outline-variant bg-white p-4 shadow-soft"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs font-bold uppercase tracking-[0.08em] text-primary">
                      Block #{item.blockNumber.toString().padStart(3, "0")}
                    </p>
                    <h3 className="mt-1 font-display text-lg font-bold text-ink">
                      {item.donorName}
                    </h3>
                    <p className="mt-1 text-xs font-semibold text-on-surface-variant">
                      {formatDate(item.createdAt)}
                    </p>
                  </div>
                  <p className="text-right font-display text-lg font-bold text-emerald-700">
                    +{formatVnd(item.amount)}
                  </p>
                </div>

                <div className="mt-4 grid gap-2 text-sm">
                  <LedgerInfo label="Chiến dịch" value={item.campaignSlug || "quy-chung"} />
                  <LedgerInfo label="Sepay ref" value={item.paymentReference || "N/A"} />
                  <LedgerInfo label="TX" value={shortHash(item.providerTransactionId)} />
                </div>

                <div className="mt-4 grid gap-2 border border-slate-200 bg-slate-50 p-3 font-mono text-xs">
                  <p className="break-all text-emerald-700">
                    H {shortHash(item.hash)}
                  </p>
                  <p className="break-all text-slate-500">
                    P {shortHash(item.previousHash)}
                  </p>
                </div>

                <span className="mt-3 inline-flex bg-emerald-50 px-2 py-1 text-[11px] font-bold uppercase text-emerald-700">
                  {item.status}
                </span>
              </article>
            ))
          )}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-[1080px] text-left text-sm">
            <thead className="bg-primary text-[11px] uppercase tracking-[0.08em] text-white">
              <tr>
                <th className="px-4 py-3">Block</th>
                <th className="px-4 py-3">Thời gian</th>
                <th className="px-4 py-3">Nhà hảo tâm</th>
                <th className="px-4 py-3">Chiến dịch</th>
                <th className="px-4 py-3 text-right">Số tiền</th>
                <th className="px-4 py-3">Sepay ref</th>
                <th className="px-4 py-3">TX</th>
                <th className="px-4 py-3">Hash chain</th>
                <th className="px-4 py-3">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="bg-white font-mono text-xs text-slate-700">
              {donationChain.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-6 text-center text-slate-500"
                  >
                    Chưa có donate chain được xác minh.
                  </td>
                </tr>
              ) : (
                donationChain.map((item) => (
                  <tr
                    key={item.id}
                    className="border-t border-slate-200 transition hover:bg-surface-low"
                  >
                    <td className="px-4 py-3 font-bold text-primary">
                      #{item.blockNumber.toString().padStart(3, "0")}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDate(item.createdAt)}
                    </td>
                    <td className="px-4 py-3 font-sans text-sm font-bold text-ink">
                      {item.donorName}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {item.campaignSlug || "quy-chung"}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-700">
                      +{formatVnd(item.amount)}
                    </td>
                    <td className="px-4 py-3 text-primary">
                      {item.paymentReference || "N/A"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {shortHash(item.providerTransactionId)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="grid gap-1 border border-slate-200 bg-slate-50 p-2">
                        <span className="break-all text-emerald-700">
                          H {shortHash(item.hash)}
                        </span>
                        <span className="break-all text-slate-500">
                          P {shortHash(item.previousHash)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="bg-emerald-50 px-2 py-1 font-sans text-[11px] font-bold uppercase text-emerald-700">
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={donationChainPage.page}
          totalPages={donationChainPage.totalPages}
        />
      </section>
      ) : null}

      {activeView === "disbursements" ? (
      <section className="neo-panel overflow-hidden p-0">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="font-display text-2xl font-bold text-ink">
            Nhật ký giải ngân
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-cream text-[11px] uppercase tracking-[0.1em] text-slate-500">
              <tr>
                <th className="px-5 py-3">Ngày chi</th>
                <th className="px-5 py-3">Nội dung</th>
                <th className="px-5 py-3">Chiến dịch</th>
                <th className="px-5 py-3 text-right">Số tiền</th>
                <th className="px-5 py-3 text-right">Hóa đơn đỏ</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-6 text-center text-sm text-slate-500"
                  >
                    Chưa có nhật ký giải ngân.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-t border-slate-100 bg-white/75"
                  >
                    <td className="px-5 py-4 font-semibold text-slate-600">
                      {formatDate(log.spentAt)}
                    </td>
                    <td className="px-5 py-4 text-slate-700">
                      <p className="font-semibold text-ink">{log.title}</p>
                      <p className="text-xs text-slate-500">
                        {log.description}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {log.campaignSlug}
                    </td>
                    <td className="px-5 py-4 text-right font-bold text-primary">
                      {formatVnd(log.amount)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {log.proofUrl ? (
                        <LazySignedFileLink
                          bucket="campaign-assets"
                          endpoint="/api/disbursement-proofs/signed-url"
                          path={log.proofUrl}
                          label="Tải hóa đơn đỏ"
                          className="inline-flex border border-primary px-4 py-2 text-xs font-bold text-primary transition hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                        />
                      ) : (
                        <span className="inline-flex border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-500">
                          Chưa có
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
      ) : null}
    </div>
  );
}

function Pagination({
  currentPage,
  totalPages,
}: {
  currentPage: number;
  totalPages: number;
}) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-6 py-4 text-sm text-slate-700">
      <p className="font-semibold">
        Trang {currentPage}/{totalPages}
      </p>
      <div className="flex items-center gap-2">
        <Link
          href={buildTransparencyHref(Math.max(currentPage - 1, 1))}
          aria-disabled={currentPage <= 1}
          className={`rounded-lg border px-3 py-2 font-bold transition ${
            currentPage <= 1
              ? "pointer-events-none border-slate-100 text-slate-300"
              : "border-slate-200 text-slate-700 hover:border-primary hover:text-primary"
          }`}
        >
          Trước
        </Link>
        <Link
          href={buildTransparencyHref(Math.min(currentPage + 1, totalPages))}
          aria-disabled={currentPage >= totalPages}
          className={`rounded-lg border px-3 py-2 font-bold transition ${
            currentPage >= totalPages
              ? "pointer-events-none border-slate-100 text-slate-300"
              : "border-slate-200 text-slate-700 hover:border-primary hover:text-primary"
          }`}
        >
          Sau
        </Link>
      </div>
    </div>
  );
}

function TransparencyNavCard({
  active,
  description,
  href,
  label,
}: {
  active: boolean;
  description: string;
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`nav-tile p-5 transition ${active ? "nav-tile-active" : ""}`}
    >
      <span className="nav-eyebrow text-xs font-bold uppercase tracking-[0.1em]">
        Minh bạch
      </span>
      <span className="nav-title mt-2 block font-display text-2xl font-bold">
        {label}
      </span>
      <span className="nav-description mt-2 block text-sm leading-6">
        {description}
      </span>
    </Link>
  );
}

function getTransparencyView(value?: string): TransparencyView {
  return value === "disbursements" ? "disbursements" : "donate-chain";
}

function LedgerInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2 last:border-b-0 last:pb-0">
      <span className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
        {label}
      </span>
      <span className="text-right font-semibold text-ink">{value}</span>
    </div>
  );
}

function buildTransparencyHref(chainPage: number) {
  const params = new URLSearchParams({ view: "donate-chain" });

  if (chainPage > 1) {
    params.set("chainPage", String(chainPage));
  }

  return `/minh-bach?${params.toString()}`;
}

function shortHash(value?: string | null) {
  if (!value) {
    return "N/A";
  }

  if (value.length <= 14) {
    return value;
  }

  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

function SmallMetric({ label, value }: { label: string; value: string }) {
  return (
    <article className="neo-panel bg-white/90 p-5">
      <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 font-display text-2xl font-bold text-ink">{value}</p>
    </article>
  );
}
