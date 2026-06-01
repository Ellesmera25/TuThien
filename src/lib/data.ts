import {
  getSupabaseServerClient,
  getSupabaseServiceClient,
} from "@/lib/supabase/server";
import { createSupabaseServerAuthClient } from "@/lib/supabase/auth-server";
import type {
  Campaign,
  DashboardSummary,
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
  const supabase = getSupabaseServerClient();
  if (!supabase || !userId) {
    return getReels();
  }

  const authContext = await createSupabaseServerAuthClient();
  const privilegedSupabase = getSupabaseServiceClient() ?? authContext.client ?? supabase;

  const { data: reelsData, error: reelsError } = await supabase
    .from("reels")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);

  if (reelsError || !reelsData) {
    if (reelsError) {
      console.error(reelsError);
    }

    return [];
  }

  if (reelsData.length === 0) {
    return [];
  }

  const reelIds = reelsData.map((row) => row.id) as string[];
  const campaignSlugs = Array.from(
    new Set(
      reelsData
        .map((row) => row.campaign_slug)
        .filter((item): item is string => typeof item === "string" && item.length > 0),
    ),
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

  const [
    { data: likesData, error: likesError },
    { data: followsData, error: followsError },
  ] = await Promise.all([likesQuery, followQuery]);

  if (likesError) {
    console.error(likesError);
  }

  if (followsError) {
    console.error(followsError);
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

  return reelsData.map((row) => {
    const baseReel = mapReel(row);

    return {
      ...baseReel,
      isLikedByCurrentUser: likedSet.has(baseReel.id),
      isFollowedByCurrentUser: followedSet.has(baseReel.campaignSlug),
    };
  });
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
