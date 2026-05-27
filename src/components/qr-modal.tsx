"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type PaymentDetails = {
  id: string;
  paymentReference: string;
  qrImageUrl: string;
  qrContent: string;
  instruction: string;
  demo?: boolean;
};

type QrModalProps = {
  paymentDetails: PaymentDetails;
  onClose: () => void;
  lastInputsSnapshot?: string | null;
};

const expiryMs = 5 * 60 * 1000;

export default function QrModal(props: QrModalProps) {
  return (
    <QrModalSession
      key={props.paymentDetails.paymentReference}
      {...props}
    />
  );
}

function QrModalSession({
  paymentDetails,
  onClose,
}: QrModalProps) {
  const router = useRouter();
  const [remaining, setRemaining] = useState(expiryMs);
  const [status, setStatus] = useState<"pending" | "confirmed" | "failed">(
    "pending",
  );
  const [connected, setConnected] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState("");
  const expiryStartedAtRef = useRef(0);
  const redirectTimerRef = useRef<number | null>(null);
  const channelRef = useRef<ReturnType<NonNullable<ReturnType<typeof getSupabaseBrowserClient>>["channel"]> | null>(null);

  useEffect(() => {
    expiryStartedAtRef.current = Date.now();

    const timerId = window.setInterval(() => {
      const elapsed = Date.now() - expiryStartedAtRef.current;
      const left = Math.max(0, expiryMs - elapsed);
      setRemaining(left);

      if (left === 0) {
        setStatus((current) => (current === "pending" ? "failed" : current));
      }
    }, 1000);

    return () => {
      window.clearInterval(timerId);
    };
  }, [paymentDetails.paymentReference]);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      return undefined;
    }

    if (redirectTimerRef.current) {
      window.clearTimeout(redirectTimerRef.current);
      redirectTimerRef.current = null;
    }

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    if (status === "confirmed") {
      redirectTimerRef.current = window.setTimeout(() => {
        router.replace("/tai-khoan#lich-su-dong-gop");
      }, 1200);

      return () => {
        if (redirectTimerRef.current) {
          window.clearTimeout(redirectTimerRef.current);
          redirectTimerRef.current = null;
        }
      };
    }

    if (status === "failed") {
      redirectTimerRef.current = window.setTimeout(() => {
        router.replace("/");
      }, 2200);

      return () => {
        if (redirectTimerRef.current) {
          window.clearTimeout(redirectTimerRef.current);
          redirectTimerRef.current = null;
        }
      };
    }

    const channel = supabase
      .channel(`donation-status-${paymentDetails.paymentReference}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "donations",
          filter: `payment_reference=eq.${paymentDetails.paymentReference}`,
        },
        (payload) => {
          const nextStatus = payload.new?.status as string | undefined;
          if (nextStatus === "confirmed") {
            setStatus("confirmed");
          }
        },
      )
      .subscribe((nextStatus) => {
        setConnected(nextStatus === "SUBSCRIBED");
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [paymentDetails.paymentReference, router, status]);

  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000)
    .toString()
    .padStart(2, "0");

  const statusText = useMemo(() => {
    if (status === "confirmed") {
      return "Thanh toán thành công. Đang chuyển đến lịch sử đóng góp...";
    }

    if (status === "failed") {
      return "QR đã hết hạn sau 5 phút. Bạn sẽ được chuyển về trang chủ.";
    }

    return `Đang chờ webhook xác minh${connected ? "..." : "."}`;
  }, [connected, status]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Đóng popup QR"
        className="absolute inset-0 cursor-default bg-black/50 backdrop-blur-[2px]"
        onClick={status === "pending" ? onClose : undefined}
      />

      <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-[28px] border border-white/60 bg-white shadow-[0_30px_100px_rgba(15,23,42,0.22)]">
        <div className="bg-[linear-gradient(135deg,rgba(249,115,22,0.16),rgba(15,23,42,0.04))] px-6 py-5 sm:px-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                Thanh toán Sepay
              </p>
              <h3 className="mt-1 font-display text-2xl font-bold text-ink">
                Quét QR để hoàn tất quyên góp
              </h3>
            </div>
            <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-right shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                QR hết hạn sau
              </p>
              <p className="font-display text-xl font-bold text-ink">
                {minutes}:{seconds}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-5 px-6 py-6 sm:px-7 md:grid-cols-[240px_1fr] md:items-center">
          <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-slate-50 p-4">
            <Image
              src={paymentDetails.qrImageUrl}
              alt="Mã QR"
              width={240}
              height={240}
              unoptimized
              className="h-auto w-full rounded-2xl bg-white"
            />
          </div>

          <div className="space-y-4 text-sm text-slate-600">
            <p>{paymentDetails.instruction}</p>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
                Nội dung chuyển khoản
              </p>
              <p className="mt-1 break-words font-mono text-sm font-semibold text-ink">
                {paymentDetails.qrContent}
              </p>
            </div>

            <div
              className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
                status === "confirmed"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : status === "failed"
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-slate-200 bg-white text-slate-600"
              }`}
            >
              {statusText}
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(paymentDetails.qrContent);
                    setCopyFeedback("Đã sao chép!");
                    setTimeout(() => setCopyFeedback(""), 2000);
                  } catch {
                    setCopyFeedback("Sao chép thất bại");
                    setTimeout(() => setCopyFeedback(""), 2000);
                  }
                }}
                className="neo-btn neo-btn-ghost"
              >
                {copyFeedback || "Sao chép nội dung"}
              </button>

              {status === "pending" ? (
                <button
                  type="button"
                  onClick={onClose}
                  className="neo-btn neo-btn-ghost"
                >
                  Quay lại form
                </button>
              ) : null}
            </div>

            {paymentDetails.demo ? (
              <p className="text-xs font-semibold text-amber-700">
                Đây là QR bản demo vì môi trường chưa có đủ cấu hình Sepay.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
