import Link from "next/link";

export default function NotFound() {
  return (
    <div className="neo-panel mx-auto max-w-xl space-y-4 p-8 text-center">
      <p className="neo-badge mx-auto">404</p>
      <h1 className="font-display text-3xl font-bold text-ink">Khong tim thay trang</h1>
      <p className="text-sm text-slate-600">
        Link ban truy cap khong ton tai hoac da duoc thay doi.
      </p>
      <Link href="/" className="neo-btn neo-btn-primary">
        Ve trang chu
      </Link>
    </div>
  );
}
