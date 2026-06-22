import type {
  PdfSignatureInfo,
  StoredInvoiceSignatureFields,
} from "@/lib/invoice-signature-types";
import { repairUtf8Mojibake } from "@/lib/mojibake";

type InvoiceSignatureSummaryProps = {
  info?: PdfSignatureInfo | null;
};

export function storedInvoiceSignatureInfoFromRow(
  row: StoredInvoiceSignatureFields,
): PdfSignatureInfo | null {
  const status = row.invoice_signature_status;

  if (!status || status === "not_checked") {
    return null;
  }

  return {
    status:
      status === "extracted" ||
      status === "missing_signature" ||
      status === "parse_failed"
        ? status
        : "parse_failed",
    signatureCount: row.invoice_signature_signature_count ?? 0,
    signerName: normalizeStoredText(row.invoice_signature_signer_name),
    signerOrganization: normalizeStoredText(row.invoice_signature_signer_organization),
    signerTaxCode: normalizeStoredText(row.invoice_signature_signer_tax_code),
    signedAt: row.invoice_signature_signed_at ?? null,
    certificateSerial: row.invoice_signature_certificate_serial ?? null,
    certificateValidFrom: row.invoice_signature_certificate_valid_from ?? null,
    certificateValidTo: row.invoice_signature_certificate_valid_to ?? null,
    extractedAt: row.invoice_signature_extracted_at ?? "",
    error: row.invoice_signature_error ?? null,
  };
}

function normalizeStoredText(value?: string | null) {
  return value ? repairUtf8Mojibake(value) : null;
}

export function InvoiceSignatureSummary({
  info,
}: InvoiceSignatureSummaryProps) {
  if (!info) {
    return null;
  }

  return (
    <div
      className={`rounded-xl border p-4 text-sm ${
        info.status === "extracted"
          ? "border-emerald-100 bg-emerald-50 text-emerald-900"
          : "border-amber-100 bg-amber-50 text-amber-900"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-bold text-ink">Thông tin chữ ký số trong PDF</p>
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${
            info.status === "extracted"
              ? "bg-emerald-100 text-emerald-700"
              : "bg-amber-100 text-amber-700"
          }`}
        >
          {formatSignatureStatus(info.status)}
        </span>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <SignatureInfo label="Người ký" value={info.signerName} />
        <SignatureInfo label="Ngày ký" value={formatDateTime(info.signedAt)} />
        <SignatureInfo label="Tổ chức" value={info.signerOrganization} />
        <SignatureInfo label="Mã số thuế/định danh" value={info.signerTaxCode} />
        <SignatureInfo
          label="Serial chứng thư"
          value={info.certificateSerial}
        />
        <SignatureInfo
          label="Hiệu lực chứng thư"
          value={formatValidity(info.certificateValidFrom, info.certificateValidTo)}
        />
      </div>

      {info.error ? (
        <p className="mt-3 rounded-lg border border-amber-200 bg-white/70 p-3 text-xs font-semibold text-amber-800">
          {info.error}
        </p>
      ) : null}
    </div>
  );
}

function SignatureInfo({
  className = "",
  label,
  value,
}: {
  className?: string;
  label: string;
  value?: string | null;
}) {
  return (
    <div className={className}>
      <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 break-words font-semibold text-slate-800">
        {value && value.trim() ? value : "Chưa trích xuất được"}
      </p>
    </div>
  );
}

function formatSignatureStatus(status: PdfSignatureInfo["status"]) {
  switch (status) {
    case "extracted":
      return "Đã trích xuất";
    case "missing_signature":
      return "Không thấy chữ ký";
    case "parse_failed":
      return "Không đọc được";
  }
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatValidity(from?: string | null, to?: string | null) {
  const formattedFrom = formatDateTime(from);
  const formattedTo = formatDateTime(to);

  if (!formattedFrom && !formattedTo) {
    return null;
  }

  return `${formattedFrom ?? "?"} - ${formattedTo ?? "?"}`;
}
