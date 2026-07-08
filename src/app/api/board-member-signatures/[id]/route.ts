import { NextResponse } from "next/server";

import { requireAnyRole } from "@/lib/auth";
import { executiveRoles } from "@/lib/module-access";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const SIGNATURE_BUCKET = "signatures";
const SIGNATURE_EXTENSIONS = [
  { ext: "png", contentType: "image/png" },
  { ext: "jpg", contentType: "image/jpeg" },
  { ext: "webp", contentType: "image/webp" },
] as const;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireAnyRole([...executiveRoles]);

  const { id } = await params;
  if (!id || id.length > 120) {
    return new NextResponse(null, { status: 404 });
  }

  const admin = createAdminClient();
  const { data: member } = await admin
    .from("board_members")
    .select("id,signature_url")
    .eq("id", id)
    .maybeSingle();

  if (!member?.signature_url) {
    return new NextResponse(null, { status: 404 });
  }

  for (const candidate of SIGNATURE_EXTENSIONS) {
    const { data, error } = await admin.storage
      .from(SIGNATURE_BUCKET)
      .download(`${id}/signature.${candidate.ext}`);

    if (!error && data) {
      const body = new Uint8Array(await data.arrayBuffer());
      return new NextResponse(new Blob([copyToArrayBuffer(body)], { type: candidate.contentType }), {
        headers: {
          "Content-Type": candidate.contentType,
          "Cache-Control": "private, no-store",
          "Content-Disposition": "inline",
          Vary: "Cookie",
        },
      });
    }
  }

  return new NextResponse(null, { status: 404 });
}

function copyToArrayBuffer(bytes: Uint8Array) {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}
