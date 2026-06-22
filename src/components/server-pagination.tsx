import Link from "next/link";

export type PageSearchParams = Record<string, string | string[] | undefined>;

type ServerPaginationProps = {
    anchor?: string;
    basePath: string;
    currentPage: number;
    hasNext: boolean;
    pageParam: string;
    searchParams: PageSearchParams;
};

export function ServerPagination({
    anchor,
    basePath,
    currentPage,
    hasNext,
    pageParam,
    searchParams,
}: ServerPaginationProps) {
    if (currentPage <= 1 && !hasNext) {
        return null;
    }

    return (
        <nav className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
            <p className="font-semibold text-slate-600">Trang {currentPage}</p>
            <div className="flex items-center gap-2">
                {currentPage > 1 ? (
                    <Link
                        href={buildPageHref({
                            anchor,
                            basePath,
                            page: currentPage - 1,
                            pageParam,
                            searchParams,
                        })}
                        className="rounded-lg border border-slate-200 px-3 py-2 font-bold text-slate-700 transition hover:border-primary hover:text-primary"
                    >
                        Trước
                    </Link>
                ) : (
                    <span className="rounded-lg border border-slate-100 px-3 py-2 font-bold text-slate-300">
                        Trước
                    </span>
                )}

                {hasNext ? (
                    <Link
                        href={buildPageHref({
                            anchor,
                            basePath,
                            page: currentPage + 1,
                            pageParam,
                            searchParams,
                        })}
                        className="rounded-lg border border-slate-200 px-3 py-2 font-bold text-slate-700 transition hover:border-primary hover:text-primary"
                    >
                        Sau
                    </Link>
                ) : (
                    <span className="rounded-lg border border-slate-100 px-3 py-2 font-bold text-slate-300">
                        Sau
                    </span>
                )}
            </div>
        </nav>
    );
}

function buildPageHref({
    anchor,
    basePath,
    page,
    pageParam,
    searchParams,
}: {
    anchor?: string;
    basePath: string;
    page: number;
    pageParam: string;
    searchParams: PageSearchParams;
}) {
    const params = new URLSearchParams();

    Object.entries(searchParams).forEach(([key, value]) => {
        if (!value) {
            return;
        }

        if (Array.isArray(value)) {
            value.forEach((entry) => params.append(key, entry));
            return;
        }

        params.set(key, value);
    });

    if (page <= 1) {
        params.delete(pageParam);
    } else {
        params.set(pageParam, String(page));
    }

    const query = params.toString();
    const hash = anchor ? `#${anchor}` : "";

    return `${basePath}${query ? `?${query}` : ""}${hash}`;
}
