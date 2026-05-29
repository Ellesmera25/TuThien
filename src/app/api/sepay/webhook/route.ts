import { NextResponse } from "next/server";

import { getSupabaseServiceClient } from "@/lib/supabase/server";
import {
  createBlockchainRecord,
  getGenesisBlockHash,
} from "@/lib/blockchain";
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
    .select("id, status, payment_reference, amount, donor_name, email, campaign_id")
    .eq("payment_reference", normalized.paymentReference)
    .maybeSingle();

  if (selectError || !donation) {
    return NextResponse.json({ received: true, ignored: true });
  }

  const { data: lastBlockchainEntry } = await supabase
    .from("donation_blockchain")
    .select("hash")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (donation.status === "confirmed") {
    const { data: blockchainEntry } = await supabase
      .from("donation_blockchain")
      .select("id")
      .eq("donation_id", donation.id)
      .maybeSingle();

    if (blockchainEntry) {
      return NextResponse.json({
        received: true,
        updated: false,
        id: donation.id,
        status: donation.status,
        blockchainStored: true,
      });
    }

    const restoredBlock = createBlockchainRecord(
      donation.payment_reference ?? normalized.paymentReference,
      Number(donation.amount),
      donation.donor_name,
      donation.email,
      lastBlockchainEntry?.hash ?? getGenesisBlockHash(),
    );

    const { error: restoreError } = await supabase
      .from("donation_blockchain")
      .upsert(
        {
          donation_id: donation.id,
          payment_reference: restoredBlock.paymentReference,
          amount: restoredBlock.amount,
          donor_name: restoredBlock.donorName,
          email: restoredBlock.email,
          hash: restoredBlock.hash,
          previous_hash: restoredBlock.previousHash,
          timestamp: restoredBlock.timestamp,
        },
        { onConflict: "donation_id" },
      );

    if (restoreError) {
      return NextResponse.json(
        { error: "Failed to restore blockchain record." },
        { status: 500 },
      );
    }

    await supabase
      .from("donations")
      .update({ blockchain_hash: restoredBlock.hash })
      .eq("id", donation.id);

    return NextResponse.json({
      received: true,
      updated: false,
      id: donation.id,
      status: donation.status,
      blockchainStored: true,
      blockchainHash: restoredBlock.hash,
    });
  }

  const previousHash = lastBlockchainEntry?.hash ?? getGenesisBlockHash();
  const blockchainRecord = createBlockchainRecord(
    normalized.paymentReference,
    Number(donation.amount),
    donation.donor_name,
    donation.email,
    previousHash,
  );

  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("donations")
    .update({
      status: "confirmed",
      confirmed_at: now,
      provider_transaction_id: normalized.providerTransactionId,
      webhook_payload: normalized.raw,
      webhook_received_at: now,
      blockchain_hash: blockchainRecord.hash,
    })
    .eq("payment_reference", normalized.paymentReference);

  if (updateError) {
    return NextResponse.json(
      { error: "Failed to confirm donation." },
      { status: 500 },
    );
  }

  if (donation.campaign_id) {
    const { data: campaign } = await supabase
      .from("campaigns")
      .select("raised_amount")
      .eq("id", donation.campaign_id)
      .maybeSingle();

    await supabase
      .from("campaigns")
      .update({
        raised_amount: Number(campaign?.raised_amount ?? 0) + Number(donation.amount),
      })
      .eq("id", donation.campaign_id);
  }

  const { error: blockchainInsertError } = await supabase
    .from("donation_blockchain")
    .upsert(
      {
        donation_id: donation.id,
        payment_reference: blockchainRecord.paymentReference,
        amount: blockchainRecord.amount,
        donor_name: blockchainRecord.donorName,
        email: blockchainRecord.email,
        hash: blockchainRecord.hash,
        previous_hash: blockchainRecord.previousHash,
        timestamp: blockchainRecord.timestamp,
      },
      { onConflict: "donation_id" },
    );

  if (blockchainInsertError) {
    return NextResponse.json(
      { error: "Failed to store blockchain record." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    received: true,
    updated: true,
    id: donation.id,
    status: "confirmed",
    paymentReference: normalized.paymentReference,
    blockchainHash: blockchainRecord.hash,
  });
}
