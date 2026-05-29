"use client";

import { createSupabaseBrowserAuthClient } from "@/lib/supabase/auth-client";
import { useState } from "react";

type RequestedRole = "project_owner" | "partner_org";

const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

export function RoleRequestForm() {
    const [proofFile, setProofFile] = useState<File | null>(null);
    const [commitments, setCommitments] = useState({
        truthfulInfo: false,
        verificationConsent: false,
        transparency: false,
        properUse: false,
        representativeAuthority: false,
    });    const [showForm, setShowForm] = useState(false);

    const [requestedRole, setRequestedRole] =
        useState<RequestedRole>("project_owner");
    const [applicantType, setApplicantType] = useState("individual");
    const [displayName, setDisplayName] = useState("");
    const [representativeName, setRepresentativeName] = useState("");
    const [representativePosition, setRepresentativePosition] = useState("");
    const [phone, setPhone] = useState("");
    const [contactEmail, setContactEmail] = useState("");
    const [address, setAddress] = useState("");
    const [purpose, setPurpose] = useState("");
    const [experience, setExperience] = useState("");
    const [supportType, setSupportType] = useState("");
    const [websiteUrl, setWebsiteUrl] = useState("");
    const [taxCode, setTaxCode] = useState("");
    const [note, setNote] = useState("");

    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const isPartner = requestedRole === "partner_org";
    const allCommitmentsAccepted =
        commitments.truthfulInfo &&
        commitments.verificationConsent &&
        commitments.transparency &&
        commitments.properUse &&
        (!isPartner || commitments.representativeAuthority);

    function toggleCommitment(key: keyof typeof commitments) {
        setCommitments((current) => ({
            ...current,
            [key]: !current[key],
        }));
    }
    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setMessage("");
        setError("");

        if (!proofFile) {
            setError("Vui lòng tải lên tài liệu minh chứng.");
            return;
        }

        if (!allCommitmentsAccepted) {
            setError("Vui lòng xác nhận đầy đủ các cam kết trước khi gửi yêu cầu.");
            return;
        }

        const allowedTypes = [
            "image/png",
            "image/jpeg",
            "image/jpg",
            "application/pdf",
        ];

        if (!allowedTypes.includes(proofFile.type)) {
            setError("Tài liệu minh chứng chỉ chấp nhận PNG, JPG, JPEG hoặc PDF.");
            return;
        }

        const maxSize = 5 * 1024 * 1024;

        if (proofFile.size > maxSize) {
            setError("Tài liệu minh chứng không được vượt quá 5MB.");
            return;
        }

        setSubmitting(true);

        try {
            const supabase = createSupabaseBrowserAuthClient();

            if (!supabase) {
                setError("Chưa cấu hình Supabase.");
                return;
            }

            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                setError("Bạn cần đăng nhập để gửi yêu cầu.");
                return;
            }

            const fileExt = proofFile.name.split(".").pop()?.toLowerCase() ?? "file";
            const proofPath = `${user.id}/role-requests/${Date.now()}-${crypto.randomUUID()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from("role-proofs")
                .upload(proofPath, proofFile, {
                    cacheControl: "3600",
                    contentType: proofFile.type,
                    upsert: false,
                });

            if (uploadError) {
                console.error("Upload proof error:", uploadError);
                setError(`Không thể tải tài liệu minh chứng lên: ${uploadError.message}`);
                return;
            }

            const response = await fetch("/api/role-requests", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    requestedRole,
                    applicantType,
                    displayName,
                    representativeName,
                    representativePosition,
                    phone,
                    contactEmail,
                    address,
                    purpose,
                    experience,
                    supportType,
                    websiteUrl,
                    proofUrl: proofPath,
                    taxCode,
                    note,
                    acceptedCommitment: allCommitmentsAccepted,
                }),
            });

            const payload = (await response.json()) as {
                error?: string;
                message?: string;
            };

            if (!response.ok) {
                await supabase.storage.from("role-proofs").remove([proofPath]);
                setError(payload.error ?? "Không thể gửi yêu cầu.");
                return;
            }

            setMessage(payload.message ?? "Đã gửi yêu cầu.");
            setProofFile(null);
            setCommitments({
                truthfulInfo: false,
                verificationConsent: false,
                transparency: false,
                properUse: false,
                representativeAuthority: false,
            });
        } catch {
            setError("Mất kết nối máy chủ. Vui lòng thử lại.");
        } finally {
            setSubmitting(false);
        }
    }

    if (!showForm) {
        return (
            <section className="surface-card rounded-xl p-6">
                <h2 className="font-display text-2xl font-semibold text-ink">
                    Đăng ký vai trò nâng cao
                </h2>
                <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                    Tài khoản mới mặc định là người ủng hộ. Chọn nhu cầu phù hợp để
                    gửi thông tin xác thực cho admin xét duyệt.
                </p>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <button
                        type="button"
                        onClick={() => {
                            setRequestedRole("project_owner");
                            setApplicantType("individual");
                            setShowForm(true);
                            setError("");
                            setMessage("");
                        }}
                        className="rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-primary hover:shadow-md"
                    >
                        <p className="font-display text-xl font-semibold text-ink">
                            Tôi muốn tạo dự án
                        </p>
                        <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                            Dành cho cá nhân, nhóm thiện nguyện hoặc tổ chức muốn tạo
                            chiến dịch từ thiện.
                        </p>
                        <span className="mt-4 inline-flex text-sm font-bold text-primary">
                            Tiếp tục →
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setRequestedRole("partner_org");
                            setApplicantType("organization");
                            setShowForm(true);
                            setError("");
                            setMessage("");
                        }}
                        className="rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-primary hover:shadow-md"
                    >
                        <p className="font-display text-xl font-semibold text-ink">
                            Tôi muốn hỗ trợ dự án
                        </p>
                        <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                            Dành cho tổ chức, doanh nghiệp hoặc đơn vị đồng hành muốn
                            hỗ trợ dự án.
                        </p>
                        <span className="mt-4 inline-flex text-sm font-bold text-primary">
                            Tiếp tục →
                        </span>
                    </button>
                </div>
            </section>
        );
    }

    return (
        <section className="surface-card rounded-xl p-6">
            <h2 className="font-display text-2xl font-semibold text-ink">
                Đăng ký vai trò nâng cao
            </h2>
            <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                Tài khoản mới mặc định là người ủng hộ. Vui lòng gửi thông tin xác
                thực để admin duyệt.
            </p>

            <form onSubmit={handleSubmit} className="mt-5 grid gap-4">
                <div className="rounded-xl bg-surface-low p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.08em] text-on-surface-variant">
                        Vai trò đang đăng ký
                    </p>
                    <p className="mt-1 font-display text-xl font-semibold text-ink">
                        {isPartner ? "Đơn vị đồng hành" : "Người tạo dự án"}
                    </p>
                    <button
                        type="button"
                        onClick={() => {
                            setShowForm(false);
                            setError("");
                            setMessage("");
                        }}
                        className="mt-2 text-sm font-bold text-primary hover:text-primary-container"
                    >
                        ← Chọn lại
                    </button>
                </div>

                <Field label="Tư cách đăng ký" required>
                    <select
                        value={applicantType}
                        onChange={(event) => setApplicantType(event.target.value)}
                        className={inputClass}
                        required
                    >
                        <option value="individual">Cá nhân</option>
                        <option value="volunteer_group">Nhóm thiện nguyện</option>
                        <option value="organization">Tổ chức</option>
                        <option value="business">Doanh nghiệp</option>
                    </select>
                </Field>

                <Field
                    label={
                        isPartner
                            ? "Tên tổ chức / doanh nghiệp"
                            : "Tên cá nhân / nhóm / tổ chức"
                    }
                    required
                >
                    <input
                        value={displayName}
                        onChange={(event) => setDisplayName(event.target.value)}
                        className={inputClass}
                        required
                    />
                </Field>

                {isPartner ? (
                    <div className="grid gap-4 md:grid-cols-2">
                        <Field label="Người đại diện" required>
                            <input
                                value={representativeName}
                                onChange={(event) => setRepresentativeName(event.target.value)}
                                className={inputClass}
                                required
                            />
                        </Field>

                        <Field label="Chức vụ" required>
                            <input
                                value={representativePosition}
                                onChange={(event) =>
                                    setRepresentativePosition(event.target.value)
                                }
                                className={inputClass}
                                required
                            />
                        </Field>
                    </div>
                ) : null}

                <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Số điện thoại" required>
                        <input
                            value={phone}
                            onChange={(event) => setPhone(event.target.value)}
                            className={inputClass}
                            required
                        />
                    </Field>

                    <Field label="Email liên hệ" required>
                        <input
                            type="email"
                            value={contactEmail}
                            onChange={(event) => setContactEmail(event.target.value)}
                            className={inputClass}
                            required
                            placeholder="email@example.com"
                        />
                    </Field>
                </div>

                <Field label="Địa chỉ / khu vực hoạt động" required>
                    <input
                        value={address}
                        onChange={(event) => setAddress(event.target.value)}
                        className={inputClass}
                        required
                    />
                </Field>

                <Field
                    label={isPartner ? "Mục đích đồng hành" : "Mục đích tạo dự án"}
                    required
                >
                    <textarea
                        rows={4}
                        value={purpose}
                        onChange={(event) => setPurpose(event.target.value)}
                        className={inputClass}
                        required
                    />
                </Field>

                <Field
                    label={
                        isPartner
                            ? "Năng lực đồng hành thực hiện"
                            : "Kinh nghiệm hoạt động từ thiện"
                    }
                    required
                >
                    <textarea
                        rows={3}
                        value={isPartner ? supportType : experience}
                        onChange={(event) =>
                            isPartner
                                ? setSupportType(event.target.value)
                                : setExperience(event.target.value)
                        }
                        className={inputClass}
                        required
                        placeholder={
                            isPartner
                                ? "Ví dụ: điều phối hiện trường, mua sắm vật phẩm, tổ chức trao tặng, báo cáo chứng từ..."
                                : "Ví dụ: các hoạt động, chiến dịch từng tham gia..."
                        }
                    />
                </Field>

                {isPartner ? (
                    <Field label="Mã số thuế / mã số đăng ký" required>
                        <input
                            value={taxCode}
                            onChange={(event) => setTaxCode(event.target.value)}
                            className={inputClass}
                            required
                        />
                    </Field>
                ) : null}

                <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Website / Fanpage" required>
                        <input
                            type="url"
                            value={websiteUrl}
                            onChange={(event) => setWebsiteUrl(event.target.value)}
                            className={inputClass}
                            placeholder="https://..."
                            required
                        />
                    </Field>

                    <Field label="Tài liệu minh chứng" required>
                        <input
                            type="file"
                            accept="image/png,image/jpeg,image/jpg,application/pdf"
                            onChange={(event) => {
                                setProofFile(event.target.files?.[0] ?? null);
                            }}
                            className="w-full rounded-lg border border-dashed border-outline bg-white px-3 py-3 text-sm text-on-surface-variant file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-bold file:text-white"
                            required
                        />
                        <span className="text-xs font-normal text-slate-500">
                            Chấp nhận PNG, JPG, JPEG hoặc PDF. Dung lượng tối đa 5MB.
                        </span>
                    </Field>
                </div>

                <Field label="Ghi chú thêm">
                    <textarea
                        rows={3}
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                        className={inputClass}
                    />
                </Field>

                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-sm font-bold text-amber-900">
                        Cam kết minh bạch <span className="text-red-600">*</span>
                    </p>

                    <div className="mt-3 grid gap-3 text-sm leading-6 text-slate-700">
                        <label className="flex gap-3">
                            <input
                                type="checkbox"
                                checked={commitments.truthfulInfo}
                                onChange={() => toggleCommitment("truthfulInfo")}
                                className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                                required
                            />
                            <span>
                                Tôi cam kết các thông tin đã cung cấp là đúng sự thật.
                            </span>
                        </label>

                        <label className="flex gap-3">
                            <input
                                type="checkbox"
                                checked={commitments.verificationConsent}
                                onChange={() => toggleCommitment("verificationConsent")}
                                className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                                required
                            />
                            <span>
                                Tôi đồng ý để TuThien.vn sử dụng thông tin và tài liệu minh chứng
                                cho mục đích xác minh vai trò.
                            </span>
                        </label>

                        <label className="flex gap-3">
                            <input
                                type="checkbox"
                                checked={commitments.transparency}
                                onChange={() => toggleCommitment("transparency")}
                                className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                                required
                            />
                            <span>
                                Tôi cam kết minh bạch trong quá trình tham gia, cập nhật thông tin
                                trung thực và cung cấp minh chứng khi được yêu cầu.
                            </span>
                        </label>

                        <label className="flex gap-3">
                            <input
                                type="checkbox"
                                checked={commitments.properUse}
                                onChange={() => toggleCommitment("properUse")}
                                className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                                required
                            />
                            <span>
                                Tôi cam kết sử dụng nguồn lực đóng góp đúng mục đích và tuân thủ
                                nguyên tắc minh bạch của nền tảng.
                            </span>
                        </label>

                        {isPartner ? (
                            <label className="flex gap-3">
                                <input
                                    type="checkbox"
                                    checked={commitments.representativeAuthority}
                                    onChange={() => toggleCommitment("representativeAuthority")}
                                    className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                                    required
                                />
                                <span>
                                    Tôi cam kết có quyền đại diện cho tổ chức/doanh nghiệp đã đăng
                                    ký và chịu trách nhiệm về thông tin đại diện đã cung cấp.
                                </span>
                            </label>
                        ) : null}
                    </div>
                </div>

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
                    {submitting ? "Đang gửi..." : "Gửi yêu cầu xét duyệt"}
                </button>
            </form>
        </section>
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
