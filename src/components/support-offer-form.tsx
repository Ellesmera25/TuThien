"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { createSupabaseBrowserAuthClient } from "@/lib/supabase/auth-client";
import { formatVnd } from "@/lib/format";
import type { SupportCampaignOption } from "@/app/chien-dich/ho-tro/page";

const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

const fileInputClass =
    "w-full rounded-lg border border-dashed border-outline bg-white px-3 py-3 text-sm text-on-surface-variant file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-bold file:text-white";

const supportTypeOptions = [
    { value: "financial", label: "Tài chính" },
    { value: "goods", label: "Hàng hóa" },
    { value: "volunteer", label: "Nhân lực / tình nguyện viên" },
    { value: "media", label: "Truyền thông" },
    { value: "location", label: "Địa điểm / cơ sở vật chất" },
    { value: "expertise", label: "Chuyên môn" },
    { value: "other", label: "Khác" },
];

function isAllowedProof(file: File) {
    return [
        "image/png",
        "image/jpeg",
        "image/jpg",
        "image/webp",
        "application/pdf",
    ].includes(file.type);
}

export function SupportOfferForm({
    campaigns,
}: {
    campaigns: SupportCampaignOption[];
}) {
    const router = useRouter();
    const supabase = useMemo(() => createSupabaseBrowserAuthClient(), []);

    const [campaignId, setCampaignId] = useState(campaigns[0]?.id ?? "");
    const [title, setTitle] = useState("");
    const [supportType, setSupportType] = useState("goods");
    const [description, setDescription] = useState("");
    const [estimatedValue, setEstimatedValue] = useState("");
    const [contactName, setContactName] = useState("");
    const [contactPhone, setContactPhone] = useState("");
    const [contactEmail, setContactEmail] = useState("");
    const [proofFile, setProofFile] = useState<File | null>(null);

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    const selectedCampaign = campaigns.find(
        (campaign) => campaign.id === campaignId,
    );

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError("");
        setMessage("");

        if (!supabase) {
            setError("Chưa cấu hình Supabase.");
            return;
        }

        if (!campaignId) {
            setError("Vui lòng chọn dự án muốn hỗ trợ.");
            return;
        }

        if (!title.trim()) {
            setError("Vui lòng nhập tiêu đề đề xuất.");
            return;
        }

        if (!description.trim()) {
            setError("Vui lòng mô tả nội dung hỗ trợ.");
            return;
        }

        const parsedEstimatedValue = estimatedValue
            ? Number(estimatedValue)
            : null;

        if (
            parsedEstimatedValue !== null &&
            (!Number.isFinite(parsedEstimatedValue) || parsedEstimatedValue < 0)
        ) {
            setError("Giá trị ước tính không hợp lệ.");
            return;
        }

        if (proofFile && !isAllowedProof(proofFile)) {
            setError("Minh chứng chỉ chấp nhận ảnh hoặc PDF.");
            return;
        }

        if (proofFile && proofFile.size > 20 * 1024 * 1024) {
            setError("File minh chứng không được vượt quá 20MB.");
            return;
        }

        setSubmitting(true);

        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                setError("Bạn cần đăng nhập để gửi đề xuất hỗ trợ.");
                return;
            }

            const tempId = crypto.randomUUID();
            let proofPath: string | null = null;

            if (proofFile) {
                const fileExt =
                    proofFile.name.split(".").pop()?.toLowerCase() ?? "file";
                proofPath = `${user.id}/support-offers/${tempId}/${Date.now()}.${fileExt}`;

                const { error: uploadError } = await supabase.storage
                    .from("campaign-assets")
                    .upload(proofPath, proofFile, {
                        cacheControl: "3600",
                        contentType: proofFile.type,
                        upsert: false,
                    });

                if (uploadError) {
                    setError(`Không thể tải minh chứng: ${uploadError.message}`);
                    return;
                }
            }

            const response = await fetch("/api/support-offers", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    campaignId,
                    title,
                    supportType,
                    description,
                    estimatedValue: parsedEstimatedValue,
                    contactName,
                    contactPhone,
                    contactEmail,
                    proofUrl: proofPath,
                }),
            });

            const payload = (await response.json()) as {
                error?: string;
                message?: string;
            };

            if (!response.ok) {
                setError(
                    payload.error ?? "Không thể gửi đề xuất hỗ trợ. Vui lòng thử lại.",
                );
                return;
            }

            setMessage(
                payload.message ??
                "Đã gửi đề xuất hỗ trợ. Vui lòng chờ admin xem xét.",
            );

            router.push("/tai-khoan");
            router.refresh();
        } catch {
            setError("Mất kết nối máy chủ. Vui lòng thử lại.");
        } finally {
            setSubmitting(false);
        }
    }

    if (campaigns.length === 0) {
        return (
            <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-700">
                <p className="font-bold">Chưa có dự án đang nhận hỗ trợ</p>
                <p className="mt-1">
                    Hiện chưa có dự án nào đã duyệt và đang hoạt động để gửi đề
                    xuất hỗ trợ.
                </p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="grid gap-6">
            <section className="grid gap-4">
                <h2 className="font-display text-2xl font-semibold text-ink">
                    Thông tin đề xuất hỗ trợ
                </h2>

                <Field label="Dự án muốn hỗ trợ" required>
                    <select
                        value={campaignId}
                        onChange={(event) => setCampaignId(event.target.value)}
                        className={inputClass}
                        required
                    >
                        {campaigns.map((campaign) => (
                            <option key={campaign.id} value={campaign.id}>
                                {campaign.title}
                            </option>
                        ))}
                    </select>
                </Field>

                {selectedCampaign ? (
                    <div className="rounded-xl border border-outline-variant/40 bg-surface-low p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.08em] text-on-surface-variant">
                            {selectedCampaign.cover_tag}
                        </p>
                        <h3 className="mt-1 font-display text-xl font-bold text-ink">
                            {selectedCampaign.title}
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                            {selectedCampaign.summary}
                        </p>
                        <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
                            <Info
                                label="Mục tiêu"
                                value={formatVnd(selectedCampaign.target_amount)}
                            />
                            <Info
                                label="Đã huy động"
                                value={formatVnd(selectedCampaign.raised_amount)}
                            />
                        </div>
                    </div>
                ) : null}

                <Field label="Tiêu đề đề xuất" required>
                    <input
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                        className={inputClass}
                        placeholder="Ví dụ: Hỗ trợ 500 phần quà cho trẻ em vùng cao"
                        required
                    />
                </Field>

                <Field label="Hình thức hỗ trợ" required>
                    <select
                        value={supportType}
                        onChange={(event) => setSupportType(event.target.value)}
                        className={inputClass}
                        required
                    >
                        {supportTypeOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </Field>

                <Field label="Nội dung hỗ trợ" required>
                    <textarea
                        rows={5}
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        className={inputClass}
                        placeholder="Mô tả cụ thể đơn vị có thể hỗ trợ gì, số lượng, thời gian, điều kiện phối hợp..."
                        required
                    />
                </Field>

                <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Giá trị ước tính VNĐ">
                        <input
                            type="number"
                            min={0}
                            step={1000}
                            value={estimatedValue}
                            onChange={(event) => setEstimatedValue(event.target.value)}
                            className={inputClass}
                            placeholder="Ví dụ: 20000000"
                        />
                    </Field>

                    <Field label="Email liên hệ">
                        <input
                            type="email"
                            value={contactEmail}
                            onChange={(event) => setContactEmail(event.target.value)}
                            className={inputClass}
                            placeholder="Có thể bỏ trống nếu dùng email tài khoản"
                        />
                    </Field>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Người phụ trách">
                        <input
                            value={contactName}
                            onChange={(event) => setContactName(event.target.value)}
                            className={inputClass}
                            placeholder="Tên người phụ trách phối hợp"
                        />
                    </Field>

                    <Field label="Số điện thoại">
                        <input
                            value={contactPhone}
                            onChange={(event) => setContactPhone(event.target.value)}
                            className={inputClass}
                            placeholder="Số điện thoại liên hệ"
                        />
                    </Field>
                </div>

                <Field label="Minh chứng / tài liệu đính kèm">
                    <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
                        onChange={(event) => {
                            setProofFile(event.target.files?.[0] ?? null);
                        }}
                        className={fileInputClass}
                    />
                    <span className="text-xs font-normal text-slate-500">
                        Có thể tải ảnh hoặc PDF. Tối đa 20MB.
                    </span>
                </Field>
            </section>

            {error ? (
                <p className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                    {error}
                </p>
            ) : null}

            {message ? (
                <p className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
                    {message}
                </p>
            ) : null}

            <button
                type="submit"
                disabled={submitting}
                className="neo-btn neo-btn-primary w-full disabled:cursor-not-allowed disabled:opacity-70"
            >
                {submitting ? "Đang gửi..." : "Gửi đề xuất hỗ trợ"}
            </button>
        </form>
    );
}

function Field({
    children,
    label,
    required = false,
}: {
    children: React.ReactNode;
    label: string;
    required?: boolean;
}) {
    return (
        <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
            <span>
                {label}
                {required ? <span className="ml-1 text-red-600">*</span> : null}
            </span>
            {children}
        </label>
    );
}

function Info({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-on-surface-variant">
                {label}
            </p>
            <p className="mt-1 font-semibold text-ink">{value}</p>
        </div>
    );
}