import forge from "node-forge";

import type { PdfSignatureInfo } from "@/lib/invoice-signature-types";
import { repairUtf8Mojibake } from "@/lib/mojibake";

const signingTimeOid = "1.2.840.113549.1.9.5";
const maxErrorLength = 500;

type Asn1Node = forge.asn1.Asn1;

type SignatureRange = {
  byteRange: [number, number, number, number];
};

export function extractPdfSignatureInfoFromBuffer(
  input: Buffer | Uint8Array,
): PdfSignatureInfo {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input);
  const extractedAt = new Date().toISOString();

  if (!isPdf(buffer)) {
    return createResult({
      extractedAt,
      status: "parse_failed",
      error: "File khong phai PDF hop le.",
    });
  }

  const rawPdf = buffer.toString("latin1");
  const ranges = findSignatureRanges(rawPdf);

  if (ranges.length === 0) {
    return createResult({
      extractedAt,
      status: "missing_signature",
      error: "Khong tim thay ByteRange cua chu ky so trong PDF.",
    });
  }

  const fallbackSignedAt = extractPdfModifiedDate(rawPdf);
  const errors: string[] = [];

  for (const range of ranges) {
    try {
      const signatureBytes = extractSignatureBytes(buffer, range.byteRange);
      const asn1 = forge.asn1.fromDer(
        forge.util.createBuffer(signatureBytes.toString("binary")),
      );
      const message = forge.pkcs7.messageFromAsn1(asn1) as {
        certificates?: forge.pki.Certificate[];
        rawCapture?: unknown;
      };
      const certificates = message.certificates ?? [];
      const signerSerial = getSignerSerialNumber(message.rawCapture);
      const signerCertificate = pickSignerCertificate(certificates, signerSerial);
      const signedAt =
        findSigningTime(asn1)?.toISOString() ?? fallbackSignedAt ?? null;

      if (!signerCertificate) {
        return createResult({
          extractedAt,
          status: "extracted",
          signatureCount: ranges.length,
          signedAt,
          error: "Da tim thay chu ky so nhung khong doc duoc chung thu nguoi ky.",
        });
      }

      return createResult({
        extractedAt,
        status: "extracted",
        signatureCount: ranges.length,
        signerName: getCertificateAttribute(signerCertificate.subject.attributes, [
          "CN",
          "commonName",
        ]),
        signerOrganization: getCertificateAttribute(
          signerCertificate.subject.attributes,
          ["O", "organizationName"],
        ),
        signerTaxCode: getSignerTaxCode(signerCertificate),
        signedAt,
        certificateSerial: signerCertificate.serialNumber || signerSerial,
        certificateValidFrom:
          signerCertificate.validity.notBefore?.toISOString() ?? null,
        certificateValidTo:
          signerCertificate.validity.notAfter?.toISOString() ?? null,
      });
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  return createResult({
    extractedAt,
    status: "parse_failed",
    signatureCount: ranges.length,
    signedAt: fallbackSignedAt ?? null,
    error: trimError(errors.join("; ") || "Khong the phan tich chu ky so."),
  });
}

export function toInvoiceSignatureDatabaseFields(info: PdfSignatureInfo) {
  return {
    invoice_signature_status: info.status,
    invoice_signature_signature_count: info.signatureCount,
    invoice_signature_signer_name: info.signerName,
    invoice_signature_signer_organization: info.signerOrganization,
    invoice_signature_signer_tax_code: info.signerTaxCode,
    invoice_signature_signed_at: info.signedAt,
    invoice_signature_certificate_serial: info.certificateSerial,
    invoice_signature_certificate_valid_from: info.certificateValidFrom,
    invoice_signature_certificate_valid_to: info.certificateValidTo,
    invoice_signature_raw: info,
    invoice_signature_extracted_at: info.extractedAt,
    invoice_signature_error: info.error,
  };
}

function createResult(
  overrides: Partial<PdfSignatureInfo> & {
    extractedAt: string;
    status: PdfSignatureInfo["status"];
  },
): PdfSignatureInfo {
  return {
    status: overrides.status,
    signatureCount: overrides.signatureCount ?? 0,
    signerName: overrides.signerName ?? null,
    signerOrganization: overrides.signerOrganization ?? null,
    signerTaxCode: overrides.signerTaxCode ?? null,
    signedAt: overrides.signedAt ?? null,
    certificateSerial: overrides.certificateSerial ?? null,
    certificateValidFrom: overrides.certificateValidFrom ?? null,
    certificateValidTo: overrides.certificateValidTo ?? null,
    extractedAt: overrides.extractedAt,
    error: overrides.error ? trimError(overrides.error) : null,
  };
}

function isPdf(buffer: Buffer): boolean {
  return buffer.subarray(0, 5).toString("latin1") === "%PDF-";
}

function findSignatureRanges(rawPdf: string): SignatureRange[] {
  const ranges: SignatureRange[] = [];
  const pattern =
    /\/ByteRange\s*\[\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*\]/g;

  for (const match of rawPdf.matchAll(pattern)) {
    ranges.push({
      byteRange: [
        Number(match[1]),
        Number(match[2]),
        Number(match[3]),
        Number(match[4]),
      ],
    });
  }

  return ranges.filter(({ byteRange }) =>
    byteRange.every((item) => Number.isFinite(item) && item >= 0),
  );
}

function extractSignatureBytes(
  pdfBuffer: Buffer,
  [start, firstLength, secondStart]: [number, number, number, number],
): Buffer {
  const contentsStart = start + firstLength;
  const contentsEnd = secondStart;

  if (
    contentsStart < 0 ||
    contentsEnd <= contentsStart ||
    contentsEnd > pdfBuffer.length
  ) {
    throw new Error("ByteRange chu ky khong hop le.");
  }

  const contents = pdfBuffer.subarray(contentsStart, contentsEnd);
  const decoded = decodePdfContents(contents);

  if (decoded.length === 0) {
    throw new Error("Contents chu ky trong PDF rong.");
  }

  return trimDerPadding(decoded);
}

function decodePdfContents(contents: Buffer): Buffer {
  const text = contents.toString("latin1").trim();

  if (text.startsWith("(")) {
    return decodePdfLiteralString(text);
  }

  const hexMatch = text.match(/<([\s\S]*)>/);
  const hex = (hexMatch?.[1] ?? text).replace(/[^0-9a-fA-F]/g, "");
  const evenHex = hex.length % 2 === 0 ? hex : hex.slice(0, -1);

  return Buffer.from(evenHex, "hex");
}

function decodePdfLiteralString(value: string): Buffer {
  const endIndex = value.lastIndexOf(")");
  const body = value.slice(1, endIndex >= 0 ? endIndex : undefined);
  const bytes: number[] = [];

  for (let index = 0; index < body.length; index += 1) {
    const char = body[index];

    if (char !== "\\") {
      bytes.push(body.charCodeAt(index) & 0xff);
      continue;
    }

    const next = body[index + 1];

    if (!next) {
      break;
    }

    if (next === "\r" || next === "\n") {
      index += next === "\r" && body[index + 2] === "\n" ? 2 : 1;
      continue;
    }

    const escaped: Record<string, number> = {
      b: 0x08,
      f: 0x0c,
      n: 0x0a,
      r: 0x0d,
      t: 0x09,
      "(": 0x28,
      ")": 0x29,
      "\\": 0x5c,
    };

    if (escaped[next] !== undefined) {
      bytes.push(escaped[next]);
      index += 1;
      continue;
    }

    if (/[0-7]/.test(next)) {
      const octal = body.slice(index + 1, index + 4).match(/^[0-7]{1,3}/)?.[0];
      if (octal) {
        bytes.push(Number.parseInt(octal, 8));
        index += octal.length;
        continue;
      }
    }

    bytes.push(next.charCodeAt(0) & 0xff);
    index += 1;
  }

  return Buffer.from(bytes);
}

function trimDerPadding(input: Buffer): Buffer {
  if (input[0] !== 0x30 || input.length < 2) {
    return stripTrailingZeros(input);
  }

  const lengthByte = input[1];

  if (lengthByte < 0x80) {
    const total = 2 + lengthByte;
    return total <= input.length ? input.subarray(0, total) : input;
  }

  const lengthByteCount = lengthByte & 0x7f;

  if (lengthByteCount === 0 || lengthByteCount > 6) {
    return stripTrailingZeros(input);
  }

  let contentLength = 0;
  for (let index = 0; index < lengthByteCount; index += 1) {
    contentLength = contentLength * 256 + input[2 + index];
  }

  const total = 2 + lengthByteCount + contentLength;
  return total <= input.length ? input.subarray(0, total) : input;
}

function stripTrailingZeros(input: Buffer): Buffer {
  let end = input.length;
  while (end > 0 && input[end - 1] === 0) {
    end -= 1;
  }
  return input.subarray(0, end);
}

function getSignerSerialNumber(rawCapture: unknown): string | null {
  const signerInfos = getRawSignerInfos(rawCapture);
  const firstSigner = signerInfos[0];
  const issuerAndSerial = getAsn1Child(firstSigner, 1);
  const serialNode = getAsn1Child(issuerAndSerial, 1);
  const serialValue = serialNode?.value;

  return typeof serialValue === "string"
    ? normalizeSerial(forge.util.createBuffer(serialValue).toHex())
    : null;
}

function getAsn1Child(node: Asn1Node | undefined | null, index: number) {
  if (!node || !Array.isArray(node.value)) {
    return null;
  }

  const child = node.value[index];
  return typeof child === "object" ? child : null;
}

function getRawSignerInfos(rawCapture: unknown): Asn1Node[] {
  if (!rawCapture || typeof rawCapture !== "object") {
    return [];
  }

  const signerInfos = (rawCapture as { signerInfos?: unknown }).signerInfos;

  if (Array.isArray(signerInfos)) {
    return signerInfos as Asn1Node[];
  }

  if (
    signerInfos &&
    typeof signerInfos === "object" &&
    Array.isArray((signerInfos as { value?: unknown }).value)
  ) {
    return (signerInfos as { value: Asn1Node[] }).value;
  }

  return [];
}

function pickSignerCertificate(
  certificates: forge.pki.Certificate[],
  signerSerial: string | null,
): forge.pki.Certificate | null {
  if (certificates.length === 0) {
    return null;
  }

  if (signerSerial) {
    const matched = certificates.find(
      (certificate) => normalizeSerial(certificate.serialNumber) === signerSerial,
    );

    if (matched) {
      return matched;
    }
  }

  return (
    certificates.find((certificate) => {
      const basicConstraints = certificate.getExtension("basicConstraints") as
        | { cA?: boolean }
        | undefined;
      return basicConstraints?.cA !== true;
    }) ?? certificates[0]
  );
}

function normalizeSerial(value?: string | null): string {
  return (value ?? "").replace(/^00+/, "").toUpperCase();
}

function findSigningTime(node: Asn1Node): Date | null {
  if (Array.isArray(node.value)) {
    const oidNode = node.value[0];
    const valueSet = node.value[1];

    if (isOidNode(oidNode) && forge.asn1.derToOid(oidNode.value) === signingTimeOid) {
      return findFirstTimeNode(valueSet);
    }

    for (const child of node.value) {
      const found = findSigningTime(child);
      if (found) {
        return found;
      }
    }
  }

  return null;
}

function findFirstTimeNode(node?: Asn1Node): Date | null {
  if (!node) {
    return null;
  }

  if (typeof node.value === "string") {
    if (node.type === forge.asn1.Type.UTCTIME) {
      return forge.asn1.utcTimeToDate(node.value);
    }

    if (node.type === forge.asn1.Type.GENERALIZEDTIME) {
      return forge.asn1.generalizedTimeToDate(node.value);
    }
  }

  if (Array.isArray(node.value)) {
    for (const child of node.value) {
      const found = findFirstTimeNode(child);
      if (found) {
        return found;
      }
    }
  }

  return null;
}

function isOidNode(node?: Asn1Node): node is Asn1Node & { value: string } {
  return Boolean(
    node &&
      node.type === forge.asn1.Type.OID &&
      typeof node.value === "string",
  );
}

function getCertificateAttribute(
  attributes: forge.pki.CertificateField[],
  keys: string[],
): string | null {
  const normalizedKeys = new Set(keys.map((key) => key.toLowerCase()));
  const attribute = attributes.find((item) => {
    const candidates = [item.shortName, item.name, item.type]
      .filter(Boolean)
      .map((value) => String(value).toLowerCase());

    return candidates.some((value) => normalizedKeys.has(value));
  });

  return normalizeText(attribute?.value);
}

function getSignerTaxCode(certificate: forge.pki.Certificate): string | null {
  const serialLike = getCertificateAttribute(certificate.subject.attributes, [
    "serialNumber",
    "2.5.4.5",
    "UID",
    "0.9.2342.19200300.100.1.1",
  ]);

  const raw = serialLike ?? formatAttributes(certificate.subject.attributes);
  const match = raw?.match(/(?:MST|TAX|TIN|Mã số thuế|Ma so thue)?[:=\s-]*(\d{10,14}(?:-\d{3})?)/i);

  return match?.[1] ?? serialLike ?? null;
}

function formatAttributes(attributes: forge.pki.CertificateField[]): string {
  return attributes
    .map((attribute) => {
      const key = attribute.shortName ?? attribute.name ?? attribute.type ?? "field";
      return `${key}=${normalizeText(attribute.value) ?? ""}`;
    })
    .join(", ");
}

function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = repairUtf8Mojibake(value);
  return normalized ? normalized : null;
}

function extractPdfModifiedDate(rawPdf: string): string | null {
  const match = rawPdf.match(/\/M\s*(\((?:\\.|[^\\)])*\)|<[^>]+>)/);

  if (!match?.[1]) {
    return null;
  }

  const rawValue = match[1].startsWith("<")
    ? Buffer.from(match[1].replace(/[^0-9a-fA-F]/g, ""), "hex").toString(
        "latin1",
      )
    : decodePdfLiteralString(match[1]).toString("latin1");

  return parsePdfDate(rawValue)?.toISOString() ?? null;
}

function parsePdfDate(value: string): Date | null {
  const match = value
    .trim()
    .match(
      /^D:?(\d{4})(\d{2})?(\d{2})?(\d{2})?(\d{2})?(\d{2})?([Zz]|[+-]\d{2}'?\d{2}'?)?/,
    );

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2] ?? "01") - 1;
  const day = Number(match[3] ?? "01");
  const hour = Number(match[4] ?? "00");
  const minute = Number(match[5] ?? "00");
  const second = Number(match[6] ?? "00");
  const timezone = match[7] ?? "Z";
  let utcTime = Date.UTC(year, month, day, hour, minute, second);

  if (/^[+-]/.test(timezone)) {
    const sign = timezone[0] === "+" ? 1 : -1;
    const digits = timezone.slice(1).replace(/'/g, "");
    const offsetHour = Number(digits.slice(0, 2) || "0");
    const offsetMinute = Number(digits.slice(2, 4) || "0");
    utcTime -= sign * (offsetHour * 60 + offsetMinute) * 60 * 1000;
  }

  return new Date(utcTime);
}

function trimError(value: string): string {
  return value.length > maxErrorLength
    ? `${value.slice(0, maxErrorLength)}...`
    : value;
}
