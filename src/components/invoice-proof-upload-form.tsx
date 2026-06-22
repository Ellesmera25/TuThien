"use client";

import { useRef, useState } from "react";

import {
  InvoiceSignatureSummary,
} from "@/components/invoice-signature-summary";
import type { PdfSignatureInfo } from "@/lib/invoice-signature-types";
import { createSupabaseBrowserAuthClient } from "@/lib/supabase/auth-client";

type SubmitInvoiceProofAction = (formData: FormData) => void | Promise<void>;

type InvoiceProofUploadFormProps = {
  action: SubmitInvoiceProofAction;
  existingProofNote?: string | null;
  existingProofSignedUrl?: string | null;
  existingProofUrl?: string | null;
  roundId: string;
};

const maxInvoicePdfSize = 20 * 1024 * 1024;

export function InvoiceProofUploadForm({
  action,
  existingProofNote,
  existingProofSignedUrl,
  existingProofUrl,
  roundId,
}: InvoiceProofUploadFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const proofUrlInputRef = useRef<HTMLInputElement>(null);
  const readyToSubmitRef = useRef(false);

  const [file, setFile] = useState<File | null>(null);
  const [signatureInfo, setSignatureInfo] = useState<PdfSignatureInfo | null>(
    null,
  );
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleFileChange(nextFile: File | null) {
    setError("");
    setStatus("");
    setSignatureInfo(null);
    setFile(nextFile);
    readyToSubmitRef.current = false;

    if (!proofUrlInputRef.current) {
      return;
    }

    proofUrlInputRef.current.value = "";

    if (!nextFile) {
      return;
    }

    if (!isPdfFile(nextFile)) {
      setError("Vui lòng chọn file hóa đơn đỏ định dạng PDF.");
      return;
    }

    if (nextFile.size <= 0 || nextFile.size > maxInvoicePdfSize) {
      setError("File PDF hóa đơn phải nhỏ hơn hoặc bằng 20MB.");
      return;
    }

    setStatus("Đang trích xuất chữ ký số từ PDF...");

    const payload = new FormData();
    payload.append("file", nextFile);

    try {
      const response = await fetch("/api/invoice-signatures/extract", {
        method: "POST",
        body: payload,
      });
      const result = (await response.json()) as {
        error?: string;
        signature?: PdfSignatureInfo;
      };

      if (!response.ok || !result.signature) {
        setError(result.error ?? "Không thể trích xuất chữ ký số từ PDF.");
        setStatus("");
        return;
      }

      setSignatureInfo(result.signature);

      if (result.signature.status !== "extracted") {
        setError(
          result.signature.error ??
            "PDF chưa có chữ ký số hợp lệ để trích xuất thông tin.",
        );
      }
    } catch {
      setError("Mất kết nối máy chủ khi trích xuất chữ ký số.");
    } finally {
      setStatus("");
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (readyToSubmitRef.current) {
      readyToSubmitRef.current = false;
      return;
    }

    event.preventDefault();
    setError("");

    if (!file) {
      setError("Vui lòng chọn file PDF hóa đơn đỏ.");
      return;
    }

    if (!signatureInfo || signatureInfo.status !== "extracted") {
      setError("Vui lòng chọn PDF có chữ ký số đã trích xuất thành công.");
      return;
    }

    const supabase = createSupabaseBrowserAuthClient();

    if (!supabase) {
      setError("Chưa cấu hình Supabase để upload hóa đơn.");
      return;
    }

    setSubmitting(true);
    setStatus("Đang upload PDF hóa đơn...");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Bạn cần đăng nhập để nộp hóa đơn.");
        setSubmitting(false);
        setStatus("");
        return;
      }

      const filePath = `${user.id}/disbursement-proofs/${roundId}/${Date.now()}-${crypto.randomUUID()}-${sanitizeFileName(file.name)}`;
      const { error: uploadError } = await supabase.storage
        .from("campaign-assets")
        .upload(filePath, file, {
          cacheControl: "3600",
          contentType: "application/pdf",
          upsert: false,
        });

      if (uploadError) {
        setError(`Không thể upload hóa đơn: ${uploadError.message}`);
        setSubmitting(false);
        setStatus("");
        return;
      }

      if (proofUrlInputRef.current) {
        proofUrlInputRef.current.value = filePath;
      }

      readyToSubmitRef.current = true;
      setStatus("Đã upload. Đang lưu thông tin chữ ký số...");
      window.setTimeout(() => formRef.current?.requestSubmit(), 0);
    } catch {
      setError("Mất kết nối máy chủ khi upload hóa đơn.");
      setSubmitting(false);
      setStatus("");
    }
  }

  return (
    <form
      ref={formRef}
      action={action}
      onSubmit={handleSubmit}
      className="mt-4 grid gap-3"
    >
      <input type="hidden" name="roundId" value={roundId} />
      <input ref={proofUrlInputRef} type="hidden" name="invoiceDocumentUrl" />

      {existingProofUrl ? (
        <div className="rounded-xl border border-slate-100 bg-surface-low p-3 text-sm text-slate-700">
          <p className="font-bold text-ink">Hóa đơn đã nộp trước đó</p>
          <a
            href={existingProofSignedUrl ?? existingProofUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex break-all font-semibold text-primary hover:underline"
          >
            {existingProofUrl}
          </a>
        </div>
      ) : null}

      <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
        File hóa đơn đỏ PDF có chữ ký số
        <input
          type="file"
          accept="application/pdf,.pdf"
          onChange={(event) =>
            void handleFileChange(event.target.files?.[0] ?? null)
          }
          className="w-full rounded-lg border border-dashed border-outline bg-white px-3 py-3 text-sm text-on-surface-variant file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-bold file:text-white"
          required
        />
        <span className="text-xs font-normal text-slate-500">
          Hệ thống sẽ đọc chữ ký số trong PDF, hiển thị người ký và ngày ký
          trước khi lưu.
        </span>
      </label>

      {signatureInfo ? <InvoiceSignatureSummary info={signatureInfo} /> : null}

      <textarea
        name="invoiceDocumentNote"
        defaultValue={existingProofNote ?? ""}
        placeholder="Ghi chú hóa đơn: số hóa đơn, nội dung chi, đơn vị phát hành..."
        rows={3}
        className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
      />

      {status ? (
        <p className="rounded-lg border border-primary/20 bg-primary-fixed/30 px-3 py-2 text-sm font-semibold text-primary">
          {status}
        </p>
      ) : null}

      {error ? (
        <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitting || !signatureInfo || signatureInfo.status !== "extracted"}
        className="w-fit rounded-lg bg-primary px-5 py-2 text-sm font-bold text-white transition hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Đang lưu hóa đơn..." : "Nộp hóa đơn đỏ PDF"}
      </button>
    </form>
  );
}

function isPdfFile(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

function sanitizeFileName(fileName: string) {
  const safeName = fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(-90);

  return safeName || "invoice.pdf";
}
