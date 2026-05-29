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

type PhaseFormState = {
    id: string;
    title: string;
    description: string;
    startDate: string;
    endDate: string;
    proofFile: File | null;
};

function createEmptyPhase(): PhaseFormState {
    return {
        id: crypto.randomUUID(),
        title: "",
        description: "",
        startDate: "",
        endDate: "",
        proofFile: null,
    };
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

    const [phases, setPhases] = useState<PhaseFormState[]>(() => [
        createEmptyPhase(),
    ]);

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    function updatePhase(id: string, patch: Partial<PhaseFormState>) {
        setPhases((current) =>
            current.map((phase) =>
                phase.id === id ? { ...phase, ...patch } : phase,
            ),
        );
    }

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

        if (phases.length === 0) {
            setError("Mỗi chiến dịch cần ít nhất 1 giai đoạn nội dung.");
            return;
        }

        const invalidPhaseIndex = phases.findIndex(
            (phase) => !phase.title.trim() || !phase.description.trim(),
        );

        if (invalidPhaseIndex >= 0) {
            setError(`Vui lòng nhập đủ tên và mô tả cho giai đoạn ${invalidPhaseIndex + 1}.`);
            return;
        }

        const invalidProofPhaseIndex = phases.findIndex(
            (phase) => phase.proofFile && !isAllowedProof(phase.proofFile),
        );

        if (invalidProofPhaseIndex >= 0) {
            setError("Minh chứng giai đoạn chỉ chấp nhận ảnh hoặc PDF.");
            return;
        }

        const oversizedProofPhaseIndex = phases.findIndex(
            (phase) => phase.proofFile && phase.proofFile.size > 5 * 1024 * 1024,
        );

        if (oversizedProofPhaseIndex >= 0) {
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

            const uploadedPhases = [];

            for (let index = 0; index < phases.length; index += 1) {
                const phase = phases[index];
                let phaseProofPath: string | null = null;

                if (phase.proofFile) {
                    const fileExt =
                        phase.proofFile.name.split(".").pop()?.toLowerCase() ?? "file";
                    phaseProofPath = `${user.id}/campaigns/${tempId}/proofs/${Date.now()}-${index}.${fileExt}`;

                    const { error: proofUploadError } = await supabase.storage
                        .from("campaign-assets")
                        .upload(phaseProofPath, phase.proofFile, {
                            cacheControl: "3600",
                            contentType: phase.proofFile.type,
                            upsert: false,
                        });

                    if (proofUploadError) {
                        setError(
                            `Không thể tải minh chứng giai đoạn ${index + 1}: ${proofUploadError.message}`,
                        );
                        return;
                    }
                }

                uploadedPhases.push({
                    title: phase.title,
                    description: phase.description,
                    targetAmount: 0,
                    startDate: phase.startDate || null,
                    endDate: phase.endDate || null,
                    proofUrl: phaseProofPath,
                });
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
                    phases: uploadedPhases,
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
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="font-display text-2xl font-semibold text-ink">
                            Giai đoạn hỗ trợ
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                            Giai đoạn là phần mô tả kế hoạch triển khai. Lịch giải ngân sẽ được hệ thống tạo riêng theo 3 đợt 40% - 40% - 20%.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => setPhases((current) => [...current, createEmptyPhase()])}
                        className="rounded-lg border border-primary px-4 py-2 text-sm font-bold text-primary transition hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Thêm giai đoạn
                    </button>
                </div>

                {phases.map((phase, index) => (
                    <div
                        key={phase.id}
                        className="grid gap-4 rounded-xl border border-outline-variant/40 bg-white p-4"
                    >
                        <div className="flex items-center justify-between gap-3">
                            <h3 className="font-display text-lg font-bold text-ink">
                                Giai đoạn {index + 1}
                            </h3>
                            {phases.length > 1 ? (
                                <button
                                    type="button"
                                    onClick={() =>
                                        setPhases((current) =>
                                            current.filter((item) => item.id !== phase.id),
                                        )
                                    }
                                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 transition hover:bg-red-100"
                                >
                                    Xóa
                                </button>
                            ) : null}
                        </div>

                        <Field label="Tên giai đoạn" required>
                            <input
                                value={phase.title}
                                onChange={(event) =>
                                    updatePhase(phase.id, { title: event.target.value })
                                }
                                className={inputClass}
                                placeholder="Ví dụ: Khảo sát và xác minh hoàn cảnh"
                                required
                            />
                        </Field>

                        <Field label="Mô tả giai đoạn" required>
                            <textarea
                                rows={4}
                                value={phase.description}
                                onChange={(event) =>
                                    updatePhase(phase.id, { description: event.target.value })
                                }
                                className={inputClass}
                                placeholder="Mô tả việc cần làm, đối tượng hỗ trợ, cách thực hiện..."
                                required
                            />
                        </Field>

                        <div className="grid gap-4 md:grid-cols-2">
                            <Field label="Ngày bắt đầu">
                                <input
                                    type="date"
                                    value={phase.startDate}
                                    onChange={(event) =>
                                        updatePhase(phase.id, { startDate: event.target.value })
                                    }
                                    className={inputClass}
                                />
                            </Field>

                            <Field label="Ngày kết thúc">
                                <input
                                    type="date"
                                    value={phase.endDate}
                                    onChange={(event) =>
                                        updatePhase(phase.id, { endDate: event.target.value })
                                    }
                                    className={inputClass}
                                />
                            </Field>
                        </div>

                        <Field label="Minh chứng giai đoạn">
                            <input
                                type="file"
                                accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
                                onChange={(event) => {
                                    updatePhase(phase.id, {
                                        proofFile: event.target.files?.[0] ?? null,
                                    });
                                }}
                                className={fileInputClass}
                            />
                            <span className="text-xs font-normal text-slate-500">
                                Có thể tải ảnh hoặc PDF minh chứng cho giai đoạn. Tối đa 5MB.
                            </span>
                        </Field>
                    </div>
                ))}
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
