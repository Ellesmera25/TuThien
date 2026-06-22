import {
  getSupabaseServerClient,
  getSupabaseServiceClient,
} from "@/lib/supabase/server";
import { createSupabaseServerAuthClient } from "@/lib/supabase/auth-server";
import type {
  Campaign,
  DashboardSummary,
  DonationChainItem,
  DonationChainPage,
  DonationItem,
  ReelItem,
  TransparencyItem,
} from "@/lib/types";

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

function mapDonationChain(
  row: Record<string, unknown>,
  blockNumber: number,
  donation?: {
    campaign_slug?: string | null;
    status?: string | null;
    provider_transaction_id?: string | null;
  },
): DonationChainItem {
  return {
    id: toStringValue(row.id, crypto.randomUUID()),
    donationId: toStringValue(row.donation_id, ""),
    blockNumber,
    donorName: toStringValue(row.donor_name, "Ẩn danh"),
    amount: toNumber(row.amount),
    createdAt: toStringValue(row.created_at, new Date().toISOString()),
    campaignSlug: donation?.campaign_slug ?? null,
    paymentReference: toStringValue(row.payment_reference, ""),
    providerTransactionId: donation?.provider_transaction_id ?? null,
    status: donation?.status ?? "confirmed",
    hash: toStringValue(row.hash, ""),
    previousHash: toStringValue(row.previous_hash, ""),
  };
}

function mapReel(row: Record<string, unknown>): ReelItem {
  const tone = toStringValue(row.cover_tone, "warm");
  const safeTone: ReelItem["coverTone"] =
    tone === "cool" || tone === "mint" || tone === "violet" ? tone : "warm";

  return {
    id: toStringValue(row.id, crypto.randomUUID()),
    campaignSlug: toStringValue(row.campaign_slug, ""),
    title: toStringValue(row.title, "Reel chưa đặt tên"),
    caption: toStringValue(row.caption, ""),
    creatorName: toStringValue(row.creator_name, "TuThien.vn"),
    location: toStringValue(row.location, "Đang cập nhật"),
    videoUrl: toStringValue(row.video_url, "") || null,
    coverTone: safeTone,
    views: toNumber(row.views),
    likes: toNumber(row.likes),
    comments: toNumber(row.comments),
    isLikedByCurrentUser: row.is_liked_by_current_user === true,
    isFollowedByCurrentUser: row.is_followed_by_current_user === true,
    createdAt: toStringValue(row.created_at, new Date().toISOString()),
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
    .eq("review_status", "published")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return [];
  }

  return (data ?? []).map(mapCampaign);
}

export async function getCampaignBySlug(slug: string): Promise<Campaign | null> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("slug", slug)
    .eq("review_status", "published")
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    console.error(error);
    return null;
  }

  return data ? mapCampaign(data) : null;
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
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("donations")
    .select("id, donor_name, amount, created_at, campaign_slug, message")
    .eq("status", "confirmed")
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error(error);
    return [];
  }

  return (data ?? []).map(mapDonation);
}

export async function getDonationChain({
  page = 1,
  pageSize = 20,
}: {
  page?: number;
  pageSize?: number;
} = {}): Promise<DonationChainPage> {
  const supabase = getSupabaseServiceClient();
  const safePage = Math.max(Number.isFinite(page) ? Math.floor(page) : 1, 1);
  const safePageSize = Math.min(
    Math.max(Number.isFinite(pageSize) ? Math.floor(pageSize) : 20, 1),
    50,
  );
  const from = (safePage - 1) * safePageSize;
  const to = from + safePageSize - 1;

  if (!supabase) {
    return {
      items: [],
      page: safePage,
      pageSize: safePageSize,
      totalItems: 0,
      totalPages: 1,
    };
  }

  const { count, data: chainRows, error: chainError } = await supabase
    .from("donation_blockchain")
    .select(
      "id, donation_id, donor_name, amount, created_at, payment_reference, hash, previous_hash",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  const totalItems = count ?? 0;
  const totalPages = Math.max(Math.ceil(totalItems / safePageSize), 1);

  if (chainError || !chainRows || chainRows.length === 0) {
    if (chainError) {
      console.error(chainError);
    }
    if (!chainError && totalItems > 0 && safePage > totalPages) {
      return getDonationChain({ page: totalPages, pageSize: safePageSize });
    }
    return {
      items: [],
      page: Math.min(safePage, totalPages),
      pageSize: safePageSize,
      totalItems,
      totalPages,
    };
  }

  const donationIds = chainRows.map((row) => row.donation_id).filter(Boolean);
  const { data: donationRows, error: donationError } =
    donationIds.length > 0
      ? await supabase
          .from("donations")
          .select("id, campaign_slug, status, provider_transaction_id")
          .in("id", donationIds)
      : { data: [], error: null };

  if (donationError) {
    console.error(donationError);
  }

  const donationById = new Map(
    (donationRows ?? []).map((row) => [
      row.id,
      {
        campaign_slug: row.campaign_slug,
        status: row.status,
        provider_transaction_id: row.provider_transaction_id,
      },
    ]),
  );

  return {
    items: chainRows.map((row, index) =>
      mapDonationChain(
        row,
        Math.max(totalItems - from - index, 1),
        donationById.get(row.donation_id),
      ),
    ),
    page: Math.min(safePage, totalPages),
    pageSize: safePageSize,
    totalItems,
    totalPages,
  };
}

export async function getReels(): Promise<ReelItem[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("reels")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error(error);
    return [];
  }

  return (data ?? []).map(mapReel);
}

export async function getReelsWithUserState(userId?: string): Promise<ReelItem[]> {
  const baseReels = await getReels();

  if (!userId || baseReels.length === 0) {
    return baseReels;
  }

  const authContext = await createSupabaseServerAuthClient();
  const privilegedSupabase = getSupabaseServiceClient() ?? authContext.client;

  if (!privilegedSupabase) {
    return baseReels;
  }

  const reelIds = baseReels.map((reel) => reel.id);
  const campaignSlugs = Array.from(
    new Set(baseReels.map((reel) => reel.campaignSlug).filter(Boolean)),
  );

  const likesQuery = privilegedSupabase
    .from("reel_likes")
    .select("reel_id")
    .in("reel_id", reelIds)
    .eq("user_id", userId);

  const followQuery =
    campaignSlugs.length === 0
      ? Promise.resolve({ data: [], error: null })
      : privilegedSupabase
          .from("campaign_follows")
          .select("campaign_slug")
          .in("campaign_slug", campaignSlugs)
          .eq("user_id", userId);

  const [likesResult, followsResult] = await Promise.allSettled([
    likesQuery,
    followQuery,
  ]);

  const likesData =
    likesResult.status === "fulfilled" && !likesResult.value.error
      ? likesResult.value.data
      : [];
  const followsData =
    followsResult.status === "fulfilled" && !followsResult.value.error
      ? followsResult.value.data
      : [];

  if (likesResult.status === "rejected") {
    console.error(likesResult.reason);
  } else if (likesResult.value.error) {
    console.error(likesResult.value.error);
  }

  if (followsResult.status === "rejected") {
    console.error(followsResult.reason);
  } else if (followsResult.value.error) {
    console.error(followsResult.value.error);
  }

  const likedSet = new Set(
    (likesData ?? [])
      .map((item) => item.reel_id)
      .filter((value): value is string => typeof value === "string"),
  );

  const followedSet = new Set(
    (followsData ?? [])
      .map((item) => item.campaign_slug)
      .filter((value): value is string => typeof value === "string"),
  );

  return baseReels.map((reel) => ({
    ...reel,
    isLikedByCurrentUser: likedSet.has(reel.id),
    isFollowedByCurrentUser: followedSet.has(reel.campaignSlug),
  }));
}

export async function getReelsByUser(userId: string): Promise<ReelItem[]> {
  if (!userId) {
    return [];
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("reels")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error(error);
    return [];
  }

  return (data ?? []).map(mapReel);
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

  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return {
      totalRaised,
      totalTarget,
      campaignCount: campaigns.length,
      activeCampaignCount: campaigns.filter((item) => item.status === "active")
        .length,
      donorCount: 0,
    };
  }

  const { count, error } = await supabase
    .from("donations")
    .select("id", { count: "exact", head: true });

  return {
    totalRaised,
    totalTarget,
    campaignCount: campaigns.length,
    activeCampaignCount: campaigns.filter((item) => item.status === "active")
      .length,
    donorCount: error ? 0 : (count ?? 0),
  };
}
