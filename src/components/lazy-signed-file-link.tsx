"use client";

import { useState, type ReactNode } from "react";

type LazySignedFileLinkProps = {
  bucket: "campaign-assets" | "role-proofs";
  children?: ReactNode;
  className?: string;
  label: string;
  path?: string | null;
  unavailableClassName?: string;
  unavailableLabel?: string;
};

function isExternalUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

export function LazySignedFileLink({
  bucket,
  children,
  className,
  label,
  path,
  unavailableClassName,
  unavailableLabel = "Chua co tai lieu.",
}: LazySignedFileLinkProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trimmedPath = path?.trim();
  const content = children ?? label;

  if (!trimmedPath) {
    return (
      <span className={unavailableClassName ?? "text-sm font-semibold text-slate-500"}>
        {unavailableLabel}
      </span>
    );
  }

  if (isExternalUrl(trimmedPath)) {
    return (
      <a
        href={trimmedPath}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {content}
      </a>
    );
  }

  async function openSignedFile() {
    if (!trimmedPath || isLoading) {
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/admin/signed-url", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ bucket, path: trimmedPath }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { signedUrl?: string; error?: string }
        | null;

      if (!response.ok || !payload?.signedUrl) {
        throw new Error(payload?.error ?? "Khong mo duoc file.");
      }

      window.open(payload.signedUrl, "_blank", "noopener,noreferrer");
    } catch (openError) {
      setError(
        openError instanceof Error ? openError.message : "Khong mo duoc file.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={openSignedFile}
        disabled={isLoading}
        className={className}
      >
        {isLoading ? "Dang mo..." : content}
      </button>
      {error ? (
        <span className="text-xs font-semibold text-red-600">{error}</span>
      ) : null}
    </span>
  );
}
