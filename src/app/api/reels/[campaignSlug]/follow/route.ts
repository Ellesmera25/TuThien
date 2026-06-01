import { NextResponse } from "next/server";

import { createSupabaseServerAuthClient } from "@/lib/supabase/auth-server";
import { isSameOriginMutation } from "@/lib/http-security";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

const maxCampaignSlugLength = 120;

function isValidCampaignSlug(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= maxCampaignSlugLength;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ campaignSlug: string }> },
) {
  if (!isSameOriginMutation(request)) {
    return NextResponse.json(
      {
        error: "Nguon request khong hop le.",
        followed: false,
        canInteract: false,
      },
      { status: 403 },
    );
  }

  const { campaignSlug } = await context.params;
  const normalizedSlug = campaignSlug?.trim();

  if (!normalizedSlug || !isValidCampaignSlug(normalizedSlug)) {
    return NextResponse.json(
      {
        error: "Ma chien dich khong hop le.",
        followed: false,
        canInteract: false,
      },
      { status: 400 },
    );
  }

  const { client: authClient } = await createSupabaseServerAuthClient();

  if (!authClient) {
    return NextResponse.json(
      {
        error: "Chua cau hinh Supabase Auth, khong the theo doi chien dich.",
        followed: false,
        canInteract: false,
      },
      { status: 503 },
    );
  }

  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return NextResponse.json(
      {
        error: "Ban can dang nhap de theo doi chien dich.",
        followed: false,
        canInteract: false,
      },
      { status: 401 },
    );
  }

  const dbClient = getSupabaseServiceClient() ?? authClient;

  const { data: campaign, error: campaignError } = await dbClient
    .from("campaigns")
    .select("slug")
    .eq("slug", normalizedSlug)
    .maybeSingle();

  if (campaignError) {
    console.error(campaignError);
    return NextResponse.json(
      {
        error: "Khong the xac nhan chien dich.",
        followed: false,
        canInteract: true,
      },
      { status: 500 },
    );
  }

  if (!campaign) {
    return NextResponse.json(
      {
        error: "Chien dich khong ton tai.",
        followed: false,
        canInteract: true,
      },
      { status: 404 },
    );
  }

  const { data: follow, error: followLookupError } = await dbClient
    .from("campaign_follows")
    .select("id")
    .eq("campaign_slug", normalizedSlug)
    .eq("user_id", user.id)
    .maybeSingle();

  if (followLookupError) {
    console.error(followLookupError);
    return NextResponse.json(
      {
        error: "Khong the tai trang thai theo doi.",
        followed: false,
        canInteract: true,
      },
      { status: 500 },
    );
  }

  if (follow?.id) {
    const { error: deleteError } = await dbClient
      .from("campaign_follows")
      .delete()
      .eq("campaign_slug", normalizedSlug)
      .eq("user_id", user.id);

    if (deleteError) {
      console.error(deleteError);
      return NextResponse.json(
        {
          error: "Khong the huy theo doi.",
          followed: true,
          canInteract: true,
        },
        { status: 500 },
      );
    }
  } else {
    const { error: insertError } = await dbClient
      .from("campaign_follows")
      .insert({
        campaign_slug: normalizedSlug,
        user_id: user.id,
      });

    if (insertError) {
      console.error(insertError);
      return NextResponse.json(
        {
          error: "Khong the theo doi chien dich.",
          followed: false,
          canInteract: true,
        },
        { status: 500 },
      );
    }
  }

  const { data: latestFollow, error: latestFollowError } = await dbClient
    .from("campaign_follows")
    .select("id")
    .eq("campaign_slug", normalizedSlug)
    .eq("user_id", user.id)
    .maybeSingle();

  if (latestFollowError) {
    console.error(latestFollowError);
  }

  return NextResponse.json({
    followed: Boolean(latestFollow?.id),
    canInteract: true,
  });
}
