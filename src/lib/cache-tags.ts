export const cacheDurations = {
  adminShort: 30,
  publicFast: 30,
  publicMedium: 120,
  reelFast: 15,
} as const;

export const publicCacheTags = {
  campaigns: "public:campaigns",
  campaignDetails: "public:campaign-details",
  dashboard: "public:dashboard",
  donations: "public:donations",
  donationChain: "public:donation-chain",
  reels: "public:reels",
  transparency: "public:transparency",
} as const;

export const adminCacheTags = {
  campaigns: "admin:campaigns",
  dashboard: "admin:dashboard",
  disbursements: "admin:disbursements",
  pendingCampaigns: "admin:pending-campaigns",
  roleRequests: "admin:role-requests",
  supportOffers: "admin:support-offers",
} as const;

export const allAdminCacheTags = Object.values(adminCacheTags);
export const allPublicCacheTags = Object.values(publicCacheTags);
