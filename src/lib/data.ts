import {
  mockCampaigns,
  mockRecentDonations,
  mockTransparencyItems,
} from "@/lib/mock-data";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type {
  Campaign,
  DashboardSummary,
  DonationItem,
  TransparencyItem,
} from "@/lib/types";

const fallbackDonorCount = 186;

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function toStringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function mapCampaign(row: Record<string, unknown>): Campaign {
  const status = toStringValue(row.status, "active");
  const safeStatus: Campaign["status"] =
    status === "completed" || status === "paused" ? status : "active";

  return {
    id: toStringValue(row.id, crypto.randomUUID()),
    slug: toStringValue(row.slug, "campaign"),
    title: toStringValue(row.title, "Chiến dịch chưa đặt tên"),
    summary: toStringValue(row.summary, ""),
    targetAmount: toNumber(row.target_amount),
    raisedAmount: toNumber(row.raised_amount),
    status: safeStatus,
    endDate: toStringValue(row.end_date, new Date().toISOString()),
    coverTag: toStringValue(row.cover_tag, "Đang cập nhật"),
  };
}

function mapTransparency(row: Record<string, unknown>): TransparencyItem {
  return {
    id: toStringValue(row.id, crypto.randomUUID()),
    campaignSlug: toStringValue(row.campaign_slug, ""),
    title: toStringValue(row.title, "Khoản chi chưa đặt tên"),
    description: toStringValue(row.description, ""),
    amount: toNumber(row.amount),
    spentAt: toStringValue(row.spent_at, new Date().toISOString()),
    proofUrl: toStringValue(row.proof_url, ""),
  };
}

function mapDonation(row: Record<string, unknown>): DonationItem {
  return {
    id: toStringValue(row.id, crypto.randomUUID()),
    donorName: toStringValue(row.donor_name, "Ẩn danh"),
    amount: toNumber(row.amount),
    createdAt: toStringValue(row.created_at, new Date().toISOString()),
    campaignSlug: toStringValue(row.campaign_slug, ""),
    note: toStringValue(row.message, ""),
  };
}

export async function getCampaigns(): Promise<Campaign[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return [];
  }

  return (data ?? []).map(mapCampaign);
}

export async function getCampaignBySlug(slug: string): Promise<Campaign | null> {
  const campaigns = await getCampaigns();
  return campaigns.find((campaign) => campaign.slug === slug) ?? null;
}

export async function getTransparencyItems(
  campaignSlug?: string,
): Promise<TransparencyItem[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return [];
  }

  let query = supabase
    .from("disbursements")
    .select("*")
    .order("spent_at", { ascending: false })
    .limit(20);

  if (campaignSlug) {
    query = query.eq("campaign_slug", campaignSlug);
  }

  const { data, error } = await query;

  if (error) {
    console.error(error);
    return [];
  }

  return (data ?? []).map(mapTransparency);
}


export async function getRecentDonations(): Promise<DonationItem[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("donations")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error(error);
    return [];
  }

  return (data ?? []).map(mapDonation);
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const campaigns = await getCampaigns();

  const totalRaised = campaigns.reduce(
    (total, campaign) => total + campaign.raisedAmount,
    0,
  );
  const totalTarget = campaigns.reduce(
    (total, campaign) => total + campaign.targetAmount,
    0,
  );

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return {
      totalRaised,
      totalTarget,
      campaignCount: campaigns.length,
      activeCampaignCount: campaigns.filter((item) => item.status === "active")
        .length,
      donorCount: fallbackDonorCount,
    };
  }

  const { count } = await supabase
    .from("donations")
    .select("id", { count: "exact", head: true });

  return {
    totalRaised,
    totalTarget,
    campaignCount: campaigns.length,
    activeCampaignCount: campaigns.filter((item) => item.status === "active")
      .length,
    donorCount: count ?? fallbackDonorCount,
  };
}
