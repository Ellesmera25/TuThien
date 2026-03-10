"use client";

import { useState } from "react";

type DonationFormProps = {
  campaigns: Array<{ slug: string; title: string }>;
  initialCampaignSlug?: string;
};

type FormState = {
  donorName: string;
  email: string;
  amount: string;
  campaignSlug: string;
  paymentMethod: "bank_transfer" | "momo" | "zalo_pay";
  message: string;
};

const minimumDonation = 10_000;

const quickAmounts = ["100000", "200000", "500000", "1000000"];

export function DonationForm({
  campaigns,
  initialCampaignSlug = "",
}: DonationFormProps) {
  const [state, setState] = useState<FormState>({
    donorName: "",
    email: "",
    amount: "100000",
    campaignSlug: initialCampaignSlug,
    paymentMethod: "bank_transfer",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  const submitDonation = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setResult("");

    const parsedAmount = Number(state.amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount < minimumDonation) {
      setError("Số tiền tối thiểu là 10.000đ.");
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch("/api/donations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          donorName: state.donorName.trim(),
          email: state.email.trim(),
          amount: parsedAmount,
          campaignSlug: state.campaignSlug || undefined,
          paymentMethod: state.paymentMethod,
          message: state.message.trim() || undefined,
        }),
      });

      const payload = (await response.json()) as {
        error?: string;
        id?: string;
        demo?: boolean;
      };

      if (!response.ok) {
        setError(payload.error ?? "Không thể gửi quyên góp. Vui lòng thử lại.");
        return;
      }

      setResult(
        payload.demo
          ? `Đã ghi nhận bản demo (${payload.id ?? "N/A"}).`
          : `Đã tạo phiếu quyên góp thành công (${payload.id ?? "N/A"}).`,
      );
      setState((prev) => ({
        ...prev,
        donorName: "",
        email: "",
        amount: "100000",
        message: "",
      }));
    } catch {
      setError("Mất kết nối máy chủ. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submitDonation} className="neo-panel space-y-5 p-6 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-display text-lg font-bold text-ink">
          Thông tin quyên góp
        </p>
        <span className="neo-badge">Secure Form</span>
      </div>

      <div className="grid gap-2">
        <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
          Mức nhanh
        </p>
        <div className="flex flex-wrap gap-2">
          {quickAmounts.map((amount) => (
            <button
              key={amount}
              type="button"
              onClick={() => setState((prev) => ({ ...prev, amount }))}
              className={`rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-[0.08em] transition ${
                state.amount === amount
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-slate-200 bg-white text-slate-600 hover:border-primary/40 hover:text-primary"
              }`}
            >
              {Number(amount).toLocaleString("vi-VN")}đ
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Họ tên">
          <input
            required
            value={state.donorName}
            onChange={(event) =>
              setState((prev) => ({ ...prev, donorName: event.target.value }))
            }
            className={inputClass}
            placeholder="Nguyễn Văn A"
          />
        </Field>

        <Field label="Email">
          <input
            required
            type="email"
            value={state.email}
            onChange={(event) =>
              setState((prev) => ({ ...prev, email: event.target.value }))
            }
            className={inputClass}
            placeholder="ban@example.com"
          />
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Chiến dịch">
          <select
            value={state.campaignSlug}
            onChange={(event) =>
              setState((prev) => ({
                ...prev,
                campaignSlug: event.target.value,
              }))
            }
            className={inputClass}
          >
            <option value="">Ủng hộ quỹ chung</option>
            {campaigns.map((campaign) => (
              <option key={campaign.slug} value={campaign.slug}>
                {campaign.title}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Số tiền (VND)">
          <input
            required
            inputMode="numeric"
            value={state.amount}
            onChange={(event) =>
              setState((prev) => ({ ...prev, amount: event.target.value }))
            }
            className={inputClass}
            placeholder="100000"
          />
        </Field>
      </div>

      <Field label="Phương thức thanh toán">
        <select
          value={state.paymentMethod}
          onChange={(event) =>
            setState((prev) => ({
              ...prev,
              paymentMethod: event.target.value as FormState["paymentMethod"],
            }))
          }
          className={inputClass}
        >
          <option value="bank_transfer">Chuyển khoản ngân hàng</option>
          <option value="momo">Ví MoMo</option>
          <option value="zalo_pay">ZaloPay</option>
        </select>
      </Field>

      <Field label="Lời nhắn (không bắt buộc)">
        <textarea
          rows={4}
          value={state.message}
          onChange={(event) =>
            setState((prev) => ({ ...prev, message: event.target.value }))
          }
          className={inputClass}
          placeholder="Gửi lời động viên..."
        />
      </Field>

      {error ? (
        <p className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
          {error}
        </p>
      ) : null}
      {result ? (
        <p className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
          {result}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="neo-btn neo-btn-primary w-full disabled:cursor-not-allowed disabled:opacity-70"
      >
        {submitting ? "Đang gửi..." : "Xác nhận quyên góp"}
      </button>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-1.5 text-sm font-semibold text-slate-700">
      {label}
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";
