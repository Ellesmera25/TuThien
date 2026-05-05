export type CampaignStatus = "active" | "completed" | "paused";

export type Campaign = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  targetAmount: number;
  raisedAmount: number;
  status: CampaignStatus;
  endDate: string;
  coverTag: string;
};

export type TransparencyItem = {
  id: string;
  campaignSlug: string;
  title: string;
  description: string;
  amount: number;
  spentAt: string;
  proofUrl?: string | null;
};

export type DonationItem = {
  id: string;
  donorName: string;
  amount: number;
  createdAt: string;
  campaignSlug?: string | null;
  note?: string | null;
};

export type ReelItem = {
  id: string;
  campaignSlug: string;
  title: string;
  caption: string;
  creatorName: string;
  location: string;
  videoUrl?: string | null;
  coverTone: "warm" | "cool" | "mint" | "violet";
  views: number;
  likes: number;
  comments: number;
  createdAt: string;
};

export type ReelPayload = {
  campaignSlug: string;
  title: string;
  caption: string;
  creatorName: string;
  location: string;
  videoUrl: string;
  coverTone: ReelItem["coverTone"];
};

export type DonationPayload = {
  donorName: string;
  email: string;
  amount: number;
  campaignSlug?: string;
  paymentMethod: "sepay_qr";
  message?: string;
};

export type DashboardSummary = {
  totalRaised: number;
  totalTarget: number;
  campaignCount: number;
  activeCampaignCount: number;
  donorCount: number;
};
