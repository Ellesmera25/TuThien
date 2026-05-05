"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type PaymentDetails = {
  id: string;
  paymentReference: string;
  qrImageUrl: string;
  qrContent: string;
  instruction: string;
  demo?: boolean;
};

export default function QrModal({
  paymentDetails,
  onClose,
  lastInputsSnapshot,
}: {
  paymentDetails: PaymentDetails;
  onClose: () => void;
  lastInputsSnapshot?: string | null;
}) {
  const router = useRouter();
  const expiryMs = 5 * 60 * 1000; // 5 minutes
  const [remaining, setRemaining] = useState(expiryMs);
  const [status, setStatus] = useState<"pending" | "confirmed" | "failed">("pending");
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const left = Math.max(0, expiryMs - elapsed);
      setRemaining(left);
      if (left === 0) {
        setStatus("failed");
      }
    };

    const t = setInterval(tick, 1000);
    tick();
    return () => clearInterval(t);
  }, [paymentDetails.paymentReference]);

  useEffect(() => {
    if (status === "confirmed") return;
    if (status === "failed") {
      // on failure, navigate back to home after short delay
      setTimeout(() => router.push("/"), 3000);
      return;
    }

    let mounted = true;
    const poll = async () => {
      setChecking(true);
      try {
        const res = await fetch(`/api/donations/status?paymentReference=${encodeURIComponent(paymentDetails.paymentReference)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!mounted) return;
        if (data?.status === "confirmed") {
          setStatus("confirmed");
          // redirect to account history
          router.push("/tai-khoan#lich-su-dong-gop");
        }
      } catch (e) {
        // ignore
      } finally {
        setChecking(false);
      }
    };

    const iv = setInterval(poll, 5000);
    // run immediately
    poll();
    return () => {
      mounted = false;
      clearInterval(iv);
    };
  }, [paymentDetails.paymentReference, router, status]);

  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000)
    .toString()
    .padStart(2, "0");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl rounded-2xl bg-white p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-bold">Mã QR thanh toán</h3>
          <div className="text-sm text-slate-500">Hết hạn sau: {minutes}:{seconds}</div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-[220px_1fr] md:items-center">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <img src={paymentDetails.qrImageUrl} alt="Mã QR" className="h-auto w-full rounded-xl bg-white" />
          </div>

          <div className="space-y-3 text-sm text-slate-600">
            <p>{paymentDetails.instruction}</p>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">Nội dung chuyển khoản</p>
              <p className="mt-1 break-words font-mono text-sm font-semibold text-ink">{paymentDetails.qrContent}</p>
            </div>

            {status === "pending" && (
              <p className="text-sm text-on-surface-variant">Trạng thái: Đang chờ xác minh tự động. {checking ? "(Kiểm tra...)" : ""}</p>
            )}
            {status === "confirmed" && (
              <p className="text-sm text-emerald-700 font-semibold">Thanh toán thành công — chuyển hướng...</p>
            )}
            {status === "failed" && (
              <p className="text-sm text-red-700 font-semibold">Giao dịch không được phát hiện trong 5 phút. Quay về trang chủ...</p>
            )}
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="neo-btn neo-btn-ghost">Quay lại</button>
        </div>
      </div>
    </div>
  );
}
