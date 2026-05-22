"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { createSupabaseBrowserAuthClient } from "@/lib/supabase/auth-client";

const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

const fileInputClass =
    "w-full rounded-lg border border-dashed border-outline bg-white px-3 py-3 text-sm text-on-surface-variant file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-bold file:text-white";

function isAllowedImage(file: File) {
    return ["image/png", "image/jpeg", "image/jpg", "image/webp"].includes(
        file.type,
    );
}

function isAllowedProof(file: File) {
    return [
        "image/png",
        "image/jpeg",
        "image/jpg",
        "image/webp",
        "application/pdf",
    ].includes(file.type);
}

export function CampaignCreateForm() {
    const router = useRouter();
    const supabase = useMemo(() => createSupabaseBrowserAuthClient(), []);

    const [title, setTitle] = useState("");
    const [summary, setSummary] = useState("");
    const [targetAmount, setTargetAmount] = useState("");
    const [endDate, setEndDate] = useState("");
    const [coverTag, setCoverTag] = useState("");

    const [images, setImages] = useState<File[]>([]);

    const [phaseTitle, setPhaseTitle] = useState("");
    const [phaseDescription, setPhaseDescription] = useState("");
    const [phaseTargetAmount, setPhaseTargetAmount] = useState("");
    const [phaseStartDate, setPhaseStartDate] = useState("");
    const [phaseEndDate, setPhaseEndDate] = useState("");
    const [phaseProofFile, setPhaseProofFile] = useState<File | null>(null);

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError("");
        setMessage("");

        if (!supabase) {
            setError("Chưa cấu hình Supabase.");
            return;
        }

        if (!title.trim()) {
            setError("Vui lòng nhập tên dự án.");
            return;
        }

        if (!summary.trim()) {
            setError("Vui lòng nhập mô tả ngắn của dự án.");
            return;
        }

        const parsedTargetAmount = Number(targetAmount);

        if (!Number.isFinite(parsedTargetAmount) || parsedTargetAmount < 1000) {
            setError("Mục tiêu quyên góp phải từ 1.000 VNĐ trở lên.");
            return;
        }

        if (!endDate) {
            setError("Vui lòng chọn ngày kết thúc dự án.");
            return;
        }

        if (images.length === 0) {
            setError("Vui lòng tải lên ít nhất 1 ảnh dự án.");
            return;
        }

        if (images.length > 8) {
            setError("Mỗi dự án chỉ nên tải tối đa 8 ảnh.");
            return;
        }

        const invalidImage = images.find((file) => !isAllowedImage(file));

        if (invalidImage) {
            setError("Ảnh dự án chỉ chấp nhận PNG, JPG, JPEG hoặc WEBP.");
            return;
        }

        const maxImageSize = 5 * 1024 * 1024;
        const oversizedImage = images.find((file) => file.size > maxImageSize);

        if (oversizedImage) {
            setError("Mỗi ảnh dự án không được vượt quá 5MB.");
            return;
        }

        if (!phaseTitle.trim()) {
            setError("Vui lòng nhập tên giai đoạn đầu tiên.");
            return;
        }

        if (!phaseDescription.trim()) {
            setError("Vui lòng nhập mô tả giai đoạn đầu tiên.");
            return;
        }

        const parsedPhaseTargetAmount = Number(phaseTargetAmount || 0);

        if (!Number.isFinite(parsedPhaseTargetAmount) || parsedPhaseTargetAmount < 0) {
            setError("Mục tiêu giai đoạn không hợp lệ.");
            return;
        }

        if (phaseProofFile && !isAllowedProof(phaseProofFile)) {
            setError("Minh chứng giai đoạn chỉ chấp nhận ảnh hoặc PDF.");
            return;
        }

        if (phaseProofFile && phaseProofFile.size > 5 * 1024 * 1024) {
            setError("File minh chứng giai đoạn không được vượt quá 5MB.");
            return;
        }

        setSubmitting(true);

        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                setError("Bạn cần đăng nhập để tạo dự án.");
                return;
            }

            const tempId = crypto.randomUUID();

            const uploadedImages: {
                imageUrl: string;
                caption: string | null;
                sortOrder: number;
                isCover: boolean;
            }[] = [];

            for (let index = 0; index < images.length; index += 1) {
                const image = images[index];
                const fileExt = image.name.split(".").pop()?.toLowerCase() ?? "jpg";
                const filePath = `${user.id}/campaigns/${tempId}/images/${Date.now()}-${index}.${fileExt}`;

                const { error: uploadError } = await supabase.storage
                    .from("campaign-assets")
                    .upload(filePath, image, {
                        cacheControl: "3600",
                        contentType: image.type,
                        upsert: false,
                    });

                if (uploadError) {
                    setError(`Không thể tải ảnh dự án: ${uploadError.message}`);
                    return;
                }

                uploadedImages.push({
                    imageUrl: filePath,
                    caption: null,
                    sortOrder: index + 1,
                    isCover: index === 0,
                });
            }

            let phaseProofPath: string | null = null;

            if (phaseProofFile) {
                const fileExt =
                    phaseProofFile.name.split(".").pop()?.toLowerCase() ?? "file";
                phaseProofPath = `${user.id}/campaigns/${tempId}/proofs/${Date.now()}.${fileExt}`;

                const { error: proofUploadError } = await supabase.storage
                    .from("campaign-assets")
                    .upload(phaseProofPath, phaseProofFile, {
                        cacheControl: "3600",
                        contentType: phaseProofFile.type,
                        upsert: false,
                    });

                if (proofUploadError) {
                    setError(
                        `Không thể tải minh chứng giai đoạn: ${proofUploadError.message}`,
                    );
                    return;
                }
            }

            const response = await fetch("/api/campaigns", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    title,
                    summary,
                    targetAmount: Math.round(parsedTargetAmount),
                    endDate,
                    coverTag,
                    images: uploadedImages,
                    phase: {
                        title: phaseTitle,
                        description: phaseDescription,
                        targetAmount: Math.round(parsedPhaseTargetAmount),
                        startDate: phaseStartDate || null,
                        endDate: phaseEndDate || null,
                        proofUrl: phaseProofPath,
                    },
                }),
            });

            const payload = (await response.json()) as {
                error?: string;
                message?: string;
            };

            if (!response.ok) {
                setError(payload.error ?? "Không thể gửi dự án. Vui lòng thử lại.");
                return;
            }

            setMessage(payload.message ?? "Đã gửi dự án. Vui lòng chờ admin duyệt.");
            router.push("/tai-khoan");
            router.refresh();
        } catch {
            setError("Mất kết nối máy chủ. Vui lòng thử lại.");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="mt-6 grid gap-6">
            <section className="grid gap-4">
                <h2 className="font-display text-2xl font-semibold text-ink">
                    Thông tin dự án
                </h2>

                <Field label="Tên dự án" required>
                    <input
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                        className={inputClass}
                        placeholder="Ví dụ: Bữa cơm yêu thương cho trẻ em vùng cao"
                        required
                    />
                </Field>

                <Field label="Mô tả ngắn" required>
                    <textarea
                        rows={4}
                        value={summary}
                        onChange={(event) => setSummary(event.target.value)}
                        className={inputClass}
                        placeholder="Tóm tắt mục tiêu, đối tượng hỗ trợ và ý nghĩa của dự án..."
                        required
                    />
                </Field>

                <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Mục tiêu quyên góp VNĐ" required>
                        <input
                            type="number"
                            min={1000}
                            step={1000}
                            value={targetAmount}
                            onChange={(event) => setTargetAmount(event.target.value)}
                            className={inputClass}
                            placeholder="50000000"
                            required
                        />
                    </Field>

                    <Field label="Ngày kết thúc" required>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(event) => setEndDate(event.target.value)}
                            className={inputClass}
                            required
                        />
                    </Field>
                </div>

                <Field label="Nhãn hiển thị">
                    <input
                        value={coverTag}
                        onChange={(event) => setCoverTag(event.target.value)}
                        className={inputClass}
                        placeholder="Ví dụ: Giáo dục, Y tế, Khẩn cấp..."
                    />
                </Field>

                <Field label="Ảnh dự án" required>
                    <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        multiple
                        onChange={(event) => {
                            setImages(Array.from(event.target.files ?? []));
                        }}
                        className={fileInputClass}
                        required
                    />
                    <span className="text-xs font-normal text-slate-500">
                        Tải 1 đến 8 ảnh. Ảnh đầu tiên sẽ được dùng làm ảnh bìa. Mỗi ảnh tối
                        đa 5MB.
                    </span>
                </Field>
            </section>

            <section className="grid gap-4 rounded-xl border border-outline-variant/40 bg-surface-low p-4">
                <h2 className="font-display text-2xl font-semibold text-ink">
                    Giai đoạn hỗ trợ đầu tiên
                </h2>

                <Field label="Tên giai đoạn" required>
                    <input
                        value={phaseTitle}
                        onChange={(event) => setPhaseTitle(event.target.value)}
                        className={inputClass}
                        placeholder="Ví dụ: Khảo sát và xác minh hoàn cảnh"
                        required
                    />
                </Field>

                <Field label="Mô tả giai đoạn" required>
                    <textarea
                        rows={4}
                        value={phaseDescription}
                        onChange={(event) => setPhaseDescription(event.target.value)}
                        className={inputClass}
                        placeholder="Mô tả việc cần làm, đối tượng hỗ trợ, cách thực hiện..."
                        required
                    />
                </Field>

                <div className="grid gap-4 md:grid-cols-3">
                    <Field label="Mục tiêu giai đoạn">
                        <input
                            type="number"
                            min={0}
                            step={1000}
                            value={phaseTargetAmount}
                            onChange={(event) => setPhaseTargetAmount(event.target.value)}
                            className={inputClass}
                            placeholder="10000000"
                        />
                    </Field>

                    <Field label="Ngày bắt đầu">
                        <input
                            type="date"
                            value={phaseStartDate}
                            onChange={(event) => setPhaseStartDate(event.target.value)}
                            className={inputClass}
                        />
                    </Field>

                    <Field label="Ngày kết thúc">
                        <input
                            type="date"
                            value={phaseEndDate}
                            onChange={(event) => setPhaseEndDate(event.target.value)}
                            className={inputClass}
                        />
                    </Field>
                </div>

                <Field label="Minh chứng giai đoạn">
                    <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
                        onChange={(event) => {
                            setPhaseProofFile(event.target.files?.[0] ?? null);
                        }}
                        className={fileInputClass}
                    />
                    <span className="text-xs font-normal text-slate-500">
                        Có thể tải ảnh hoặc PDF minh chứng cho giai đoạn đầu tiên. Tối đa
                        5MB.
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
                {submitting ? "Đang gửi..." : "Gửi dự án chờ duyệt"}
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