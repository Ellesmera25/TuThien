import type { Campaign, DonationItem, TransparencyItem } from "@/lib/types";

export const mockCampaigns: Campaign[] = [
  {
    id: "cp_water_2026",
    slug: "nuoc-sach-lin-ho",
    title: "Nước Sạch Cho Bản Lìn Hồ",
    summary:
      "Lắp bể lọc, đường ống và tập huấn bảo trì để 120 hộ dân có nước sạch quanh năm.",
    targetAmount: 150_000_000,
    raisedAmount: 92_000_000,
    status: "active",
    endDate: "2026-04-15",
    coverTag: "Y Tý, Lào Cai",
  },
  {
    id: "cp_scholarship_2026",
    slug: "hoc-bong-em-den-truong-2026",
    title: "Học Bổng Em Đến Trường 2026",
    summary:
      "Trao học bổng và bộ dụng cụ học tập cho 500 học sinh có hoàn cảnh khó khăn.",
    targetAmount: 300_000_000,
    raisedAmount: 145_000_000,
    status: "active",
    endDate: "2026-06-30",
    coverTag: "Miền Trung",
  },
  {
    id: "cp_zero_kitchen",
    slug: "bep-an-0-dong-nhi-dong-2",
    title: "Bếp Ăn 0 Đồng - Bệnh Viện Nhi Đồng 2",
    summary:
      "Cung cấp 5.000 suất ăn dinh dưỡng cho bệnh nhi và gia đình điều trị dài ngày.",
    targetAmount: 200_000_000,
    raisedAmount: 210_000_000,
    status: "completed",
    endDate: "2026-01-20",
    coverTag: "TP.HCM",
  },
];

export const mockTransparencyItems: TransparencyItem[] = [
  {
    id: "tr_001",
    campaignSlug: "bep-an-0-dong-nhi-dong-2",
    title: "Mua thực phẩm đợt 1",
    description: "Nhập thịt, rau củ, gạo cho 1.600 suất ăn.",
    amount: 52_300_000,
    spentAt: "2026-01-06",
    proofUrl: "#",
  },
  {
    id: "tr_002",
    campaignSlug: "nuoc-sach-lin-ho",
    title: "Mua ống dẫn nước PE",
    description: "Ống PE 32 mm dài 750m cho cụm dân cư số 2.",
    amount: 37_000_000,
    spentAt: "2026-02-10",
    proofUrl: "#",
  },
  {
    id: "tr_003",
    campaignSlug: "hoc-bong-em-den-truong-2026",
    title: "Đặt may đồng phục học sinh",
    description: "200 bộ đồng phục cho học sinh tiểu học vùng cao.",
    amount: 28_500_000,
    spentAt: "2026-02-21",
    proofUrl: "#",
  },
  {
    id: "tr_004",
    campaignSlug: "bep-an-0-dong-nhi-dong-2",
    title: "Chi phí bếp công nghiệp",
    description: "Bảo trì và thay thế 2 bếp gas công nghiệp.",
    amount: 14_200_000,
    spentAt: "2026-01-14",
    proofUrl: "#",
  },
];

export const mockRecentDonations: DonationItem[] = [
  {
    id: "dn_001",
    donorName: "Nguyen Minh A",
    amount: 500_000,
    createdAt: "2026-02-28T14:15:00+07:00",
    campaignSlug: "nuoc-sach-lin-ho",
    note: "Chúc các em luôn khỏe.",
  },
  {
    id: "dn_002",
    donorName: "Tran Thu B",
    amount: 1_200_000,
    createdAt: "2026-02-28T09:20:00+07:00",
    campaignSlug: "hoc-bong-em-den-truong-2026",
  },
  {
    id: "dn_003",
    donorName: "Le Duc C",
    amount: 300_000,
    createdAt: "2026-02-27T19:10:00+07:00",
    campaignSlug: "nuoc-sach-lin-ho",
  },
  {
    id: "dn_004",
    donorName: "Pham Nhi D",
    amount: 2_000_000,
    createdAt: "2026-02-26T11:08:00+07:00",
    campaignSlug: "bep-an-0-dong-nhi-dong-2",
  },
];
