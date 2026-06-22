"use client";

import { useEffect, useMemo, useState } from "react";

type CampaignOption = {
    id: string;
    title: string;
};

type FilterOption = {
    label: string;
    value: string;
};

type AdminListControllerProps = {
    approvalFilter?: boolean;
    campaignOptions?: CampaignOption[];
    listId: string;
    pageSize: number;
    searchPlaceholder?: string;
    statusOptions?: FilterOption[];
    totalItems: number;
};

type FilterState = {
    approval: string;
    campaignId: string;
    searchTerm: string;
    status: string;
};

export function AdminListController({
    approvalFilter = false,
    campaignOptions = [],
    listId,
    pageSize,
    searchPlaceholder = "Tìm theo tên, mô tả, mã hoặc chiến dịch...",
    statusOptions = [],
    totalItems,
}: AdminListControllerProps) {
    const [approval, setApproval] = useState("all");
    const [campaignId, setCampaignId] = useState("all");
    const [page, setPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState("");
    const [status, setStatus] = useState("all");
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
        const matchedItems = getMatchedItems(itemsSelector, {
            approval,
            campaignId,
            searchTerm,
            status,
        });
        const firstIndex = (clampedPage - 1) * pageSize;
        const lastIndex = firstIndex + pageSize;
        const allItems = Array.from(
            document.querySelectorAll<HTMLElement>(itemsSelector),
        );

        for (const item of allItems) {
            item.hidden = true;
        }

        matchedItems.forEach((item, index) => {
            item.hidden = index < firstIndex || index >= lastIndex;
        });
    }, [
        approval,
        campaignId,
        clampedPage,
        itemsSelector,
        pageSize,
        searchTerm,
        status,
    ]);

    function updateFilter(nextState: Partial<FilterState>) {
        const filters = {
            approval,
            campaignId,
            searchTerm,
            status,
            ...nextState,
        };

        setVisibleCount(getMatchedItems(itemsSelector, filters).length);
        setPage(1);

        if (nextState.approval !== undefined) {
            setApproval(nextState.approval);
        }
        if (nextState.campaignId !== undefined) {
            setCampaignId(nextState.campaignId);
        }
        if (nextState.searchTerm !== undefined) {
            setSearchTerm(nextState.searchTerm);
        }
        if (nextState.status !== undefined) {
            setStatus(nextState.status);
        }
    }

    return (
        <div className="mt-5 grid gap-3 rounded-xl border border-slate-100 bg-white p-4">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_220px]">
                <input
                    type="search"
                    value={searchTerm}
                    onChange={(event) =>
                        updateFilter({ searchTerm: event.target.value })
                    }
                    placeholder={searchPlaceholder}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-ink outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/20"
                />

                {statusOptions.length > 0 ? (
                    <select
                        value={status}
                        onChange={(event) =>
                            updateFilter({ status: event.target.value })
                        }
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    >
                        <option value="all">Tất cả trạng thái</option>
                        {statusOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                ) : null}

                {approvalFilter ? (
                    <select
                        value={approval}
                        onChange={(event) =>
                            updateFilter({ approval: event.target.value })
                        }
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    >
                        <option value="all">Tất cả duyệt đồng hành</option>
                        <option value="approved">Đã được duyệt</option>
                        <option value="unapproved">Chưa được duyệt</option>
                        <option value="rejected">Không được duyệt</option>
                    </select>
                ) : null}

                {approvalFilter ? (
                    <select
                        value={campaignId}
                        onChange={(event) =>
                            updateFilter({ campaignId: event.target.value })
                        }
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 md:col-span-3"
                    >
                        <option value="all">Tất cả dự án</option>
                        {campaignOptions.map((campaign) => (
                            <option key={campaign.id} value={campaign.id}>
                                {campaign.title}
                            </option>
                        ))}
                    </select>
                ) : null}
            </div>

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

function getMatchedItems(selector: string, filters: FilterState) {
    const normalizedSearch = normalizeSearch(filters.searchTerm);
    const items = Array.from(document.querySelectorAll<HTMLElement>(selector));

    return items.filter((item) => {
        const searchable = normalizeSearch(item.dataset.listSearch ?? "");
        const matchesSearch =
            !normalizedSearch || searchable.includes(normalizedSearch);
        const matchesStatus =
            filters.status === "all" || item.dataset.listStatus === filters.status;
        const matchesCampaign =
            filters.campaignId === "all" ||
            item.dataset.supportCampaign === filters.campaignId;
        const matchesApproval =
            filters.approval === "all" ||
            item.dataset.supportApproval === filters.approval;

        return matchesSearch && matchesStatus && matchesCampaign && matchesApproval;
    });
}

function normalizeSearch(value: string) {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}
