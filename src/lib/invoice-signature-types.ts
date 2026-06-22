export type PdfSignatureExtractStatus =
  | "extracted"
  | "missing_signature"
  | "parse_failed";

export type PdfSignatureInfo = {
  status: PdfSignatureExtractStatus;
  signatureCount: number;
  signerName: string | null;
  signerOrganization: string | null;
  signerTaxCode: string | null;
  signedAt: string | null;
  certificateSerial: string | null;
  certificateValidFrom: string | null;
  certificateValidTo: string | null;
  extractedAt: string;
  error: string | null;
};

export type StoredInvoiceSignatureFields = {
  invoice_signature_status?: string | null;
  invoice_signature_signature_count?: number | null;
  invoice_signature_signer_name?: string | null;
  invoice_signature_signer_organization?: string | null;
  invoice_signature_signer_tax_code?: string | null;
  invoice_signature_signed_at?: string | null;
  invoice_signature_certificate_serial?: string | null;
  invoice_signature_certificate_valid_from?: string | null;
  invoice_signature_certificate_valid_to?: string | null;
  invoice_signature_extracted_at?: string | null;
  invoice_signature_error?: string | null;
};
