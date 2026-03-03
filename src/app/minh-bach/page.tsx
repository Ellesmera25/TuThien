import type { Metadata } from "next";

import { getRecentDonations, getTransparencyItems } from "@/lib/data";
import { formatDate, formatVnd } from "@/lib/format";

export const metadata: Metadata = {
  title: "Minh bach",
  description: "Theo doi sao ke dong gop va nhat ky giai ngan.",
};

export default async function TransparencyPage() {
  const [logs, donations] = await Promise.all([
    getTransparencyItems(),
    getRecentDonations(),
  ]);

  const totalDisbursement = logs.reduce((sum, item) => sum + item.amount, 0);
  const totalRecentDonation = donations.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="space-y-8 pb-8">
      <header className="neo-panel-strong p-7 sm:p-9">
        <p className="neo-badge border-white/30 bg-white/20 text-white">Transparency Board</p>
        <h1 className="mt-3 font-display text-4xl font-bold text-white sm:text-5xl">
          Bang minh bach tai chinh
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-100 sm:text-base">
          Moi khoan dong gop va khoan chi deu duoc cap nhat de cong dong theo doi
          day du, ro rang va de doi soat.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <SmallMetric label="Tong khoan chi" value={formatVnd(totalDisbursement)} />
        <SmallMetric label="Dong gop gan day" value={formatVnd(totalRecentDonation)} />
        <SmallMetric label="So ban ghi doi soat" value={`${logs.length}`} />
      </section>

      <section className="neo-panel overflow-hidden p-0">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="font-display text-2xl font-bold text-ink">Nhat ky giai ngan</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-cream text-[11px] uppercase tracking-[0.1em] text-slate-500">
              <tr>
                <th className="px-5 py-3">Ngay chi</th>
                <th className="px-5 py-3">Noi dung</th>
                <th className="px-5 py-3">Chien dich</th>
                <th className="px-5 py-3 text-right">So tien</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-t border-slate-100 bg-white/75">
                  <td className="px-5 py-4 font-semibold text-slate-600">
                    {formatDate(log.spentAt)}
                  </td>
                  <td className="px-5 py-4 text-slate-700">
                    <p className="font-semibold text-ink">{log.title}</p>
                    <p className="text-xs text-slate-500">{log.description}</p>
                  </td>
                  <td className="px-5 py-4 text-slate-600">{log.campaignSlug}</td>
                  <td className="px-5 py-4 text-right font-bold text-primary">
                    {formatVnd(log.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="neo-panel p-6">
        <h2 className="font-display text-2xl font-bold text-ink">Dong gop gan day</h2>
        <ul className="mt-4 grid gap-3 md:grid-cols-2">
          {donations.map((donation) => (
            <li key={donation.id} className="rounded-xl border border-slate-100 bg-white/80 p-4 shadow-soft">
              <div className="flex items-center justify-between gap-3">
                <p className="font-bold text-ink">{donation.donorName}</p>
                <p className="text-sm font-semibold text-primary">{formatVnd(donation.amount)}</p>
              </div>
              <p className="mt-1 text-xs uppercase tracking-[0.1em] text-slate-500">
                {formatDate(donation.createdAt)} - {donation.campaignSlug ?? "quy chung"}
              </p>
              {donation.note ? (
                <p className="mt-2 text-sm text-slate-600">{donation.note}</p>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function SmallMetric({ label, value }: { label: string; value: string }) {
  return (
    <article className="neo-panel bg-white/90 p-5">
      <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">{label}</p>
      <p className="mt-2 font-display text-2xl font-bold text-ink">{value}</p>
    </article>
  );
}
