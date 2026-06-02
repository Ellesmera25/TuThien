import type { Metadata } from "next";

import { getDonationChain, getTransparencyItems } from "@/lib/data";
import { formatDate, formatVnd } from "@/lib/format";

export const metadata: Metadata = {
  title: "Minh bạch",
  description: "Theo dõi sao kê đóng góp và nhật ký giải ngân.",
};

export default async function TransparencyPage() {
  const [logs, donationChain] = await Promise.all([
    getTransparencyItems(),
    getDonationChain(),
  ]);

  const totalDisbursement = logs.reduce((sum, item) => sum + item.amount, 0);
  const totalChainDonation = donationChain.reduce(
    (sum, item) => sum + item.amount,
    0,
  );

  return (
    <div className="space-y-8 pb-8">
      <header className="neo-panel-strong p-7 sm:p-9">
        <p className="neo-badge border-white/30 bg-white/20 text-white">
          Transparency Board
        </p>
        <h1 className="mt-3 font-display text-4xl font-bold text-white sm:text-5xl">
          Bảng minh bạch tài chính
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-100 sm:text-base">
          Mọi khoản đóng góp và khoản chi đều được cập nhật để cộng đồng theo
          dõi đầy đủ, rõ ràng và dễ đối soát.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <SmallMetric
          label="Tổng khoản chi"
          value={formatVnd(totalDisbursement)}
        />
        <SmallMetric
          label="Donate chain"
          value={formatVnd(totalChainDonation)}
        />
        <SmallMetric
          label="Số block đối soát"
          value={`${donationChain.length}`}
        />
      </section>

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
            {donationChain.length} block đã xác minh
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1040px] text-left text-sm">
            <thead className="bg-[#111827] text-[11px] uppercase tracking-[0.08em] text-slate-300">
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
            <tbody className="bg-[#0f172a] font-mono text-xs text-slate-200">
              {donationChain.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-6 text-center text-slate-400"
                  >
                    Chưa có donate chain được xác minh.
                  </td>
                </tr>
              ) : (
                donationChain.map((item) => (
                  <tr
                    key={item.id}
                    className="border-t border-white/10 transition hover:bg-white/[0.06]"
                  >
                    <td className="px-4 py-3 font-bold text-primary-fixed">
                      #{item.blockNumber.toString().padStart(3, "0")}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {formatDate(item.createdAt)}
                    </td>
                    <td className="px-4 py-3 font-sans text-sm font-bold text-white">
                      {item.donorName}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {item.campaignSlug || "quy-chung"}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-300">
                      +{formatVnd(item.amount)}
                    </td>
                    <td className="px-4 py-3 text-sky-300">
                      {item.paymentReference || "N/A"}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {shortHash(item.providerTransactionId)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="grid gap-1">
                        <span className="text-emerald-300">
                          H {shortHash(item.hash)}
                        </span>
                        <span className="text-slate-500">
                          P {shortHash(item.previousHash)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-emerald-400/15 px-2 py-1 font-sans text-[11px] font-bold uppercase text-emerald-300">
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

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
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
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
