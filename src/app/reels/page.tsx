import type { Metadata } from "next";

import { ReelFeed } from "@/components/reel-feed";
import { getCurrentUser } from "@/lib/supabase/auth-server";
import { getReels, getReelsWithUserState } from "@/lib/data";

export const metadata: Metadata = {
  title: "Reels từ thiện",
  description:
    "Video ngắn kể câu chuyện chiến dịch và kết nối người xem với hành động quyên góp.",
};

export default async function ReelsPage() {
  const user = await getCurrentUser();
  const reels = user
    ? await getReelsWithUserState(user.id)
    : await getReels();

  return (
    <div className="relative left-1/2 -my-8 w-screen -translate-x-1/2">
      <ReelFeed reels={reels} />
    </div>
  );
}
