import {
  getSupabaseServerClient,
  getSupabaseServiceClient,
} from "@/lib/supabase/server";
import { createSupabaseServerAuthClient } from "@/lib/supabase/auth-server";
import { unstable_cache } from "next/cache";

import { cacheDurations, publicCacheTags } from "@/lib/cache-tags";
import type {
  Campaign,
  DashboardSummary,
  DonationChainItem,
  DonationChainPage,
  DonationItem,
  ReelItem,
  TransparencyItem,
} from "@/lib/types";

function getPublicSupabaseClient() {
  return getSupabaseServiceClient() ?? getSupabaseServerClient();
}

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
    disbursementRoundId: toStringValue(row.disbursement_round_id, ""),
    title: toStringValue(row.title, "Khoản chi chưa đặt tên"),
    description: toStringValue(row.description, ""),
    amount: toNumber(row.amount),
    spentAt: toStringValue(row.spent_at, new Date().toISOString()),
    proofUrl: toStringValue(row.proof_url, ""),
  };
}

function getDisbursementRoundNumber(title: string): number | null {
  const match = title.match(/(?:đợt|dot)\s*(\d+)/iu) ?? title.match(/(\d+)/);
  const value = Number(match?.[1]);

  return Number.isFinite(value) && value > 0 ? value : null;
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

async function getCampaignsUncached(): Promise<Campaign[]> {
  const supabase = getPublicSupabaseClient();
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

const getCachedCampaigns = unstable_cache(
  getCampaignsUncached,
  ["public-campaigns-v1"],
  {
    revalidate: cacheDurations.publicMedium,
    tags: [publicCacheTags.campaigns],
  },
);

export async function getCampaigns(): Promise<Campaign[]> {
  return getCachedCampaigns();
}

async function getCampaignBySlugUncached(slug: string): Promise<Campaign | null> {
  const supabase = getPublicSupabaseClient();
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

const getCachedCampaignBySlug = unstable_cache(
  getCampaignBySlugUncached,
  ["public-campaign-by-slug-v1"],
  {
    revalidate: cacheDurations.publicFast,
    tags: [publicCacheTags.campaignDetails, publicCacheTags.campaigns],
  },
);

export async function getCampaignBySlug(slug: string): Promise<Campaign | null> {
  return getCachedCampaignBySlug(slug);
}

async function getTransparencyItemsUncached(
  campaignSlug?: string,
): Promise<TransparencyItem[]> {
  const supabase = getPublicSupabaseClient();
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

  let items = (data ?? []).map(mapTransparency);
  const missingProofRoundIds = Array.from(
    new Set(
      items
        .filter((item) => !item.proofUrl && item.disbursementRoundId)
        .map((item) => item.disbursementRoundId as string),
    ),
  );

  if (missingProofRoundIds.length === 0) {
    return enrichTransparencyItemsFromLegacyRounds(supabase, items);
  }

  const { data: rounds } = await supabase
    .from("disbursement_rounds")
    .select("id, proof_url")
    .in("id", missingProofRoundIds);
  const proofByRoundId = new Map(
    (rounds ?? []).map((round) => [
      String(round.id),
      toStringValue(round.proof_url, ""),
    ]),
  );

  items = items.map((item) => ({
    ...item,
    proofUrl:
      item.proofUrl ||
      proofByRoundId.get(item.disbursementRoundId ?? "") ||
      item.proofUrl,
  }));

  return enrichTransparencyItemsFromLegacyRounds(supabase, items);
}

async function enrichTransparencyItemsFromLegacyRounds(
  supabase: NonNullable<ReturnType<typeof getPublicSupabaseClient>>,
  items: TransparencyItem[],
) {
  const legacyItems = items
    .map((item) => ({
      ...item,
      inferredRoundNumber: getDisbursementRoundNumber(item.title),
    }))
    .filter(
      (item) =>
        !item.proofUrl &&
        !item.disbursementRoundId &&
        item.campaignSlug &&
        item.inferredRoundNumber,
    );

  if (legacyItems.length === 0) {
    return items;
  }

  const campaignSlugs = Array.from(
    new Set(legacyItems.map((item) => item.campaignSlug)),
  );
  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("id, slug")
    .in("slug", campaignSlugs);
  const campaignBySlug = new Map(
    (campaigns ?? []).map((campaign) => [String(campaign.slug), String(campaign.id)]),
  );
  const campaignIds = Array.from(new Set(Array.from(campaignBySlug.values())));
  const roundNumbers = Array.from(
    new Set(
      legacyItems
        .map((item) => item.inferredRoundNumber)
        .filter((value): value is number => Boolean(value)),
    ),
  );

  if (campaignIds.length === 0 || roundNumbers.length === 0) {
    return items;
  }

  const { data: rounds } = await supabase
    .from("disbursement_rounds")
    .select("id, campaign_id, round_number, proof_url")
    .in("campaign_id", campaignIds)
    .in("round_number", roundNumbers);
  const roundByCampaignAndNumber = new Map(
    (rounds ?? []).map((round) => [
      `${String(round.campaign_id)}:${Number(round.round_number)}`,
      {
        id: toStringValue(round.id, ""),
        proofUrl: toStringValue(round.proof_url, ""),
      },
    ]),
  );

  return items.map((item) => {
    if (item.proofUrl || item.disbursementRoundId) {
      return item;
    }

    const campaignId = campaignBySlug.get(item.campaignSlug);
    const roundNumber = getDisbursementRoundNumber(item.title);
    const round = campaignId
      ? roundByCampaignAndNumber.get(`${campaignId}:${roundNumber}`)
      : null;

    if (!round?.proofUrl) {
      return item;
    }

    return {
      ...item,
      disbursementRoundId: round.id,
      proofUrl: round.proofUrl,
    };
  });
}

const getCachedTransparencyItems = unstable_cache(
  async (campaignSlug: string | null) =>
    getTransparencyItemsUncached(campaignSlug ?? undefined),
  ["public-transparency-items-v2"],
  {
    revalidate: cacheDurations.publicFast,
    tags: [publicCacheTags.transparency],
  },
);

export async function getTransparencyItems(
  campaignSlug?: string,
): Promise<TransparencyItem[]> {
  return getCachedTransparencyItems(campaignSlug ?? null);
}

async function getRecentDonationsUncached(): Promise<DonationItem[]> {
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

const getCachedRecentDonations = unstable_cache(
  getRecentDonationsUncached,
  ["public-recent-donations-v1"],
  {
    revalidate: cacheDurations.publicFast,
    tags: [publicCacheTags.donations],
  },
);

export async function getRecentDonations(): Promise<DonationItem[]> {
  return getCachedRecentDonations();
}

async function getDonationChainUncached({
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
      return getDonationChainUncached({ page: totalPages, pageSize: safePageSize });
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

const getCachedDonationChain = unstable_cache(
  (page: number, pageSize: number) =>
    getDonationChainUncached({ page, pageSize }),
  ["public-donation-chain-v1"],
  {
    revalidate: cacheDurations.publicFast,
    tags: [publicCacheTags.donationChain, publicCacheTags.donations],
  },
);

export async function getDonationChain({
  page = 1,
  pageSize = 20,
}: {
  page?: number;
  pageSize?: number;
} = {}): Promise<DonationChainPage> {
  const safePage = Math.max(Number.isFinite(page) ? Math.floor(page) : 1, 1);
  const safePageSize = Math.min(
    Math.max(Number.isFinite(pageSize) ? Math.floor(pageSize) : 20, 1),
    50,
  );

  return getCachedDonationChain(safePage, safePageSize);
}

async function getReelsUncached(): Promise<ReelItem[]> {
  const supabase = getPublicSupabaseClient();
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

const getCachedReels = unstable_cache(getReelsUncached, ["public-reels-v1"], {
  revalidate: cacheDurations.reelFast,
  tags: [publicCacheTags.reels],
});

export async function getReels(): Promise<ReelItem[]> {
  return getCachedReels();
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

async function getReelsByUserUncached(userId: string): Promise<ReelItem[]> {
  if (!userId) {
    return [];
  }

  const supabase = getPublicSupabaseClient();
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

const getCachedReelsByUser = unstable_cache(
  getReelsByUserUncached,
  ["account-reels-by-user-v1"],
  {
    revalidate: cacheDurations.reelFast,
    tags: [publicCacheTags.reels],
  },
);

export async function getReelsByUser(userId: string): Promise<ReelItem[]> {
  return getCachedReelsByUser(userId);
}

async function getDashboardSummaryUncached(): Promise<DashboardSummary> {
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

const getCachedDashboardSummary = unstable_cache(
  getDashboardSummaryUncached,
  ["public-dashboard-summary-v1"],
  {
    revalidate: cacheDurations.publicFast,
    tags: [
      publicCacheTags.dashboard,
      publicCacheTags.campaigns,
      publicCacheTags.donations,
    ],
  },
);

export async function getDashboardSummary(): Promise<DashboardSummary> {
  return getCachedDashboardSummary();
}
