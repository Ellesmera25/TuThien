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

export type DonationPayload = {
  donorName: string;
  email: string;
  amount: number;
  campaignSlug?: string;
  paymentMethod: "bank_transfer" | "momo" | "zalo_pay";
  message?: string;
};

export type DashboardSummary = {
  totalRaised: number;
  totalTarget: number;
  campaignCount: number;
  activeCampaignCount: number;
  donorCount: number;
};
