import { NextResponse } from "next/server";

import { extractPdfSignatureInfoFromBuffer } from "@/lib/pdf-signature";
import { isSameOriginMutation } from "@/lib/http-security";
import { createSupabaseServerAuthClient } from "@/lib/supabase/auth-server";

export const runtime = "nodejs";

const maxInvoicePdfSize = 20 * 1024 * 1024;

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) {
    return NextResponse.json(
      { error: "Nguon request khong hop le." },
      { status: 403 },
    );
  }

  const { client } = await createSupabaseServerAuthClient();

  if (!client) {
    return NextResponse.json(
      { error: "Chua cau hinh Supabase Auth." },
      { status: 503 },
    );
  }

  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Ban can dang nhap de trich xuat chu ky hoa don." },
      { status: 401 },
    );
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Vui long chon file PDF hoa don." },
      { status: 400 },
    );
  }

  if (file.size <= 0 || file.size > maxInvoicePdfSize) {
    return NextResponse.json(
      { error: "File PDF hoa don phai nho hon hoac bang 20MB." },
      { status: 400 },
    );
  }

  const isPdf =
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

  if (!isPdf) {
    return NextResponse.json(
      { error: "Hoa don do phai la file PDF." },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const signature = extractPdfSignatureInfoFromBuffer(buffer);

  return NextResponse.json({ signature });
}
