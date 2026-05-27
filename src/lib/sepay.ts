import { createHmac, randomBytes, timingSafeEqual } from "crypto";

export type SepayConfig = {
  bankId: string;
  accountNo: string;
  accountName: string;
  qrBaseUrl: string;
  webhookSecret?: string;
};

const paymentReferenceLength = 8;
const paymentReferencePattern = new RegExp(
  `TUTHIEN(?:-)?([A-F0-9]{${paymentReferenceLength}})`,
  "i",
);

type AnyRecord = Record<string, unknown>;

export function getSepayConfig(): SepayConfig | null {
  const bankId = process.env.SEPAY_BANK_ID;
  const accountNo = process.env.SEPAY_ACCOUNT_NO;
  const accountName = process.env.SEPAY_ACCOUNT_NAME;

  if (!bankId || !accountNo || !accountName) {
    return null;
  }

  return {
    bankId,
    accountNo,
    accountName,
    qrBaseUrl: process.env.SEPAY_QR_BASE_URL ?? "https://qr.sepay.vn/img",
    webhookSecret: process.env.SEPAY_WEBHOOK_SECRET,
  };
}

export function createSepayPaymentReference(): string {
  return `TUTHIEN-${randomBytes(4).toString("hex").toUpperCase()}`;
}

export function buildSepayTransferContent(
  paymentReference: string,
): string {
  return `TU THIEN ${paymentReference}`;
}

export function buildSepayQrImageUrl(
  qrContent: string,
  amount: number,
  config: SepayConfig | null,
): string {
  if (!config) {
    const fallback = new URL("https://quickchart.io/qr");
    fallback.searchParams.set("text", qrContent);
    fallback.searchParams.set("size", "280");
    return fallback.toString();
  }

  const qrUrl = new URL(config.qrBaseUrl);
  qrUrl.searchParams.set("acc", config.accountNo);
  qrUrl.searchParams.set("bank", config.bankId);
  qrUrl.searchParams.set("amount", String(Math.max(0, Math.round(amount))));
  qrUrl.searchParams.set("des", qrContent);
  qrUrl.searchParams.set("template", "compact");
  return qrUrl.toString();
}

export function extractSepayReference(input: unknown): string | null {
  if (typeof input !== "string") {
    return null;
  }

  const normalizedInput = input
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  const match = normalizedInput.match(paymentReferencePattern);

  if (!match?.[1]) {
    return null;
  }

  const referenceSuffix = match[1].replace(/O/g, "0");

  return `TUTHIEN-${referenceSuffix}`;
}

export function parseSepayWebhookPayload(payload: unknown): {
  raw: AnyRecord;
  paymentReference: string | null;
  providerTransactionId: string | null;
  amount: number | null;
  status: string | null;
} {
  const raw = isPlainObject(payload) ? payload : {};
  const contentCandidates = [
    raw.content,
    raw.transactionContent,
    raw.description,
    raw.addInfo,
    raw.memo,
    raw.reference,
    raw.orderCode,
  ];

  const paymentReference =
    contentCandidates.map(extractSepayReference).find(Boolean) ?? null;

  const providerTransactionId =
    toStringValue(raw.transactionId) ??
    toStringValue(raw.id) ??
    toStringValue(raw.paymentId) ??
    toStringValue(raw.refNo) ??
    null;

  const amount = toNumberValue(raw.amount ?? raw.creditAmount ?? raw.transAmount);
  const status = toStringValue(raw.status ?? raw.transactionStatus);

  return {
    raw,
    paymentReference,
    providerTransactionId,
    amount,
    status,
  };
}

export function isWebhookSignatureValid(
  request: Request,
  rawBody: string,
  secret?: string | null,
): boolean {
  if (!secret) {
    return true;
  }

  const candidate =
    request.headers.get("x-sepay-signature") ??
    request.headers.get("x-webhook-signature") ??
    request.headers.get("x-sepay-secret") ??
    request.headers.get("x-webhook-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    null;

  if (candidate && safeEquals(candidate, secret)) {
    return true;
  }

  const hmac = createHmac("sha256", secret).update(rawBody).digest("hex");
  return candidate ? safeEquals(candidate, hmac) : false;
}

function isPlainObject(value: unknown): value is AnyRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toStringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function toNumberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function safeEquals(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}
