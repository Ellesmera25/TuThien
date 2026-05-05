import { NextResponse } from "next/server";

import { getSupabaseServiceClient } from "@/lib/supabase/server";
import {
  getSepayConfig,
  isWebhookSignatureValid,
  parseSepayWebhookPayload,
} from "@/lib/sepay";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const config = getSepayConfig();

  if (!isWebhookSignatureValid(request, rawBody, config?.webhookSecret)) {
    return NextResponse.json({ error: "Webhook signature invalid." }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const normalized = parseSepayWebhookPayload(payload);
  if (!normalized.paymentReference) {
    return NextResponse.json({ received: true, ignored: true });
  }

  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return NextResponse.json({ received: true, ignored: true, reason: "Supabase not configured" });
  }

  const { data: donation, error: selectError } = await supabase
    .from("donations")
    .select("id, status, payment_reference")
    .eq("payment_reference", normalized.paymentReference)
    .maybeSingle();

  if (selectError || !donation) {
    return NextResponse.json({ received: true, ignored: true });
  }

  if (donation.status === "confirmed") {
    return NextResponse.json({
      received: true,
      updated: false,
      id: donation.id,
      status: donation.status,
    });
  }

  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("donations")
    .update({
      status: "confirmed",
      confirmed_at: now,
      provider_transaction_id: normalized.providerTransactionId,
      webhook_payload: normalized.raw,
      webhook_received_at: now,
    })
    .eq("payment_reference", normalized.paymentReference);

  if (updateError) {
    return NextResponse.json(
      { error: "Failed to confirm donation." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    received: true,
    updated: true,
    id: donation.id,
    status: "confirmed",
    paymentReference: normalized.paymentReference,
  });
}