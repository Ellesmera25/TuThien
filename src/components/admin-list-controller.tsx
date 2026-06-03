"use client";

import { useEffect, useMemo, useState } from "react";

type CampaignOption = {
    id: string;
    title: string;
};

type AdminListControllerProps = {
    approvalFilter?: boolean;
    campaignOptions?: CampaignOption[];
    listId: string;
    pageSize: number;
    totalItems: number;
};

export function AdminListController({
    approvalFilter = false,
    campaignOptions = [],
    listId,
    pageSize,
    totalItems,
}: AdminListControllerProps) {
    const [campaignId, setCampaignId] = useState("all");
    const [approval, setApproval] = useState("all");
    const [page, setPage] = useState(1);
    const [visibleCount, setVisibleCount] = useState(totalItems);

    const totalPages = Math.max(Math.ceil(visibleCount / pageSize), 1);
    const clampedPage = Math.min(page, totalPages);
    const start = visibleCount === 0 ? 0 : (clampedPage - 1) * pageSize + 1;
    const end = Math.min(clampedPage * pageSize, visibleCount);

    const itemsSelector = useMemo(
        () => `[data-admin-list="${listId}"]`,
        [listId],
    );

    useEffect(() => {
        const items = Array.from(
            document.querySelectorAll<HTMLElement>(itemsSelector),
        );
        const matchedItems = items.filter((item) => {
            const matchesCampaign =
                campaignId === "all" || item.dataset.supportCampaign === campaignId;
            const matchesApproval =
                approval === "all" || item.dataset.supportApproval === approval;

            return matchesCampaign && matchesApproval;
        });
        const nextPage = Math.min(page, totalPages);
        const firstIndex = (nextPage - 1) * pageSize;
        const lastIndex = firstIndex + pageSize;

        for (const item of items) {
            item.hidden = true;
        }

        matchedItems.forEach((item, index) => {
            item.hidden = index < firstIndex || index >= lastIndex;
        });
    }, [approval, campaignId, itemsSelector, page, pageSize, totalPages]);

    function resetToFirstPage(nextSetter: (value: string) => void, value: string) {
        nextSetter(value);
        setPage(1);
    }

    function countMatchingItems(nextCampaignId: string, nextApproval: string) {
        const items = Array.from(
            document.querySelectorAll<HTMLElement>(itemsSelector),
        );

        return items.filter((item) => {
            const matchesCampaign =
                nextCampaignId === "all" ||
                item.dataset.supportCampaign === nextCampaignId;
            const matchesApproval =
                nextApproval === "all" || item.dataset.supportApproval === nextApproval;

            return matchesCampaign && matchesApproval;
        }).length;
    }

    function updateCampaignFilter(value: string) {
        resetToFirstPage(setCampaignId, value);
        setVisibleCount(countMatchingItems(value, approval));
    }

    function updateApprovalFilter(value: string) {
        resetToFirstPage(setApproval, value);
        setVisibleCount(countMatchingItems(campaignId, value));
    }

    return (
        <div className="mt-5 grid gap-3 rounded-xl border border-slate-100 bg-white p-4">
            {approvalFilter ? (
                <div className="grid gap-3 md:grid-cols-[1fr_220px]">
                    <select
                        value={campaignId}
                        onChange={(event) => updateCampaignFilter(event.target.value)}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    >
                        <option value="all">Tất cả dự án</option>
                        {campaignOptions.map((campaign) => (
                            <option key={campaign.id} value={campaign.id}>
                                {campaign.title}
                            </option>
                        ))}
                    </select>
                    <select
                        value={approval}
                        onChange={(event) => updateApprovalFilter(event.target.value)}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    >
                        <option value="all">Tất cả trạng thái</option>
                        <option value="approved">Đã được duyệt</option>
                        <option value="unapproved">Chưa được duyệt</option>
                        <option value="rejected">Không được duyệt</option>
                    </select>
                </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <p className="font-semibold text-slate-600">
                    {visibleCount === 0
                        ? "Không có dữ liệu khớp bộ lọc"
                        : `Hiển thị ${start}-${end} / ${visibleCount}`}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        disabled={clampedPage <= 1}
                        onClick={() => setPage((current) => Math.max(current - 1, 1))}
                        className="rounded-lg border border-slate-200 px-3 py-2 font-bold text-slate-700 transition hover:border-primary hover:text-primary disabled:border-slate-100 disabled:text-slate-300"
                    >
                        Trước
                    </button>
                    <span className="rounded-lg bg-primary-fixed px-3 py-2 font-bold text-primary">
                        {clampedPage}/{totalPages}
                    </span>
                    <button
                        type="button"
                        disabled={clampedPage >= totalPages}
                        onClick={() =>
                            setPage((current) => Math.min(current + 1, totalPages))
                        }
                        className="rounded-lg border border-slate-200 px-3 py-2 font-bold text-slate-700 transition hover:border-primary hover:text-primary disabled:border-slate-100 disabled:text-slate-300"
                    >
                        Sau
                    </button>
                </div>
            </div>
        </div>
    );
}
