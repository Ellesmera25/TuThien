import type { Campaign } from "@/lib/types";

export type CampaignCategory = "education" | "emergency" | "environment" | "health";

export const campaignCategories: Array<{
  label: string;
  value: CampaignCategory;
}> = [
  { label: "Giáo dục", value: "education" },
  { label: "Y tế", value: "health" },
  { label: "Khẩn cấp", value: "emergency" },
  { label: "Môi trường", value: "environment" },
];

export function getCampaignCategory(campaign: Campaign): CampaignCategory {
  const source = [
    campaign.slug,
    campaign.title,
    campaign.summary,
    campaign.coverTag,
  ]
    .join(" ")
    .toLowerCase();

  if (
    source.includes("học") ||
    source.includes("trường") ||
    source.includes("giao-duc") ||
    source.includes("hoc-bong") ||
    source.includes("education")
  ) {
    return "education";
  }

  if (
    source.includes("y tế") ||
    source.includes("bệnh") ||
    source.includes("phẫu thuật") ||
    source.includes("medical") ||
    source.includes("health")
  ) {
    return "health";
  }

  if (
    source.includes("môi trường") ||
    source.includes("cây") ||
    source.includes("rừng") ||
    source.includes("nước") ||
    source.includes("environment") ||
    source.includes("eco")
  ) {
    return "environment";
  }

  return "emergency";
}

export function getCampaignCategoryLabel(category: CampaignCategory): string {
  return (
    campaignCategories.find((item) => item.value === category)?.label ??
    "Khẩn cấp"
  );
}
