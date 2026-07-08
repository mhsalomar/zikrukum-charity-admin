import { readFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { requireAnyRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const officialAssetRoles = [
  "admin",
  "demo_admin",
  "executive_director",
  "executive_manager",
  "hr",
] as const;

const OFFICIAL_ASSETS_BUCKET = "official-assets";

const officialAssets = {
  stamp: {
    fileName: "stamp-zikrukum.png",
    storagePath: "official/stamp-zikrukum.png",
    contentType: "image/png",
  },
  signature: {
    fileName: "signature-chairman.png",
    storagePath: "official/signature-chairman.png",
    contentType: "image/png",
  },
} as const;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ asset: string }> },
) {
  await requireAnyRole([...officialAssetRoles]);

  const asset = officialAssets[(await params).asset as keyof typeof officialAssets];
  if (!asset) {
    return new NextResponse(null, { status: 404 });
  }

  const body = (await readOfficialAssetFromStorage(asset)) ?? (await readOfficialAssetLocally(asset));
  if (!body) {
    return new NextResponse(null, { status: 404 });
  }

  return new NextResponse(new Blob([copyToArrayBuffer(body)], { type: asset.contentType }), {
    headers: {
      "Content-Type": asset.contentType,
      "Cache-Control": "private, no-store",
      "Content-Disposition": "inline",
      Vary: "Cookie",
    },
  });
}

// Primary source in Production: a private Supabase Storage bucket. Read
// server-side with the service-role client and return raw bytes only —
// never expose a public or signed URL to the client.
async function readOfficialAssetFromStorage(
  asset: (typeof officialAssets)[keyof typeof officialAssets],
): Promise<Uint8Array | null> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.storage.from(OFFICIAL_ASSETS_BUCKET).download(asset.storagePath);
    if (error || !data) {
      return null;
    }
    return new Uint8Array(await data.arrayBuffer());
  } catch {
    return null;
  }
}

// Fallback for local development only, when private-assets/official is
// populated manually and Storage is unavailable or not yet configured.
async function readOfficialAssetLocally(
  asset: (typeof officialAssets)[keyof typeof officialAssets],
): Promise<Uint8Array | null> {
  try {
    return await readFile(path.join(process.cwd(), "private-assets", "official", asset.fileName));
  } catch {
    return null;
  }
}

function copyToArrayBuffer(bytes: Uint8Array) {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}
