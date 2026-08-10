import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import {
  buildSignedVideoUploadParams,
  getCloudinaryVideoUploadPreset,
  isCloudinarySignedUploadConfigured,
  isCloudinaryVideoUploadConfigured,
  signCloudinaryUploadParams,
} from "@/lib/media/cloudinary-upload-server";

/** Returns credentials for direct browser → Cloudinary upload (large 4K videos). */
export async function POST() {
  const { error: authError } = await requireAdminApi("canUpload");
  if (authError) return authError;

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim();
  if (!cloudName) {
    return NextResponse.json(
      { error: "Cloudinary غير مُعد (NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME)." },
      { status: 503 }
    );
  }

  if (!isCloudinaryVideoUploadConfigured()) {
    return NextResponse.json(
      {
        error:
          "رفع الفيديو غير مُعد. أضيفي CLOUDINARY_API_KEY و CLOUDINARY_API_SECRET، أو NEXT_PUBLIC_CLOUDINARY_VIDEO_UPLOAD_PRESET.",
      },
      { status: 503 }
    );
  }

  const folder =
    process.env.NEXT_PUBLIC_CLOUDINARY_FOLDER?.trim() || "nadeendesigns";

  if (isCloudinarySignedUploadConfigured()) {
    const apiKey = process.env.CLOUDINARY_API_KEY!.trim();
    const apiSecret = process.env.CLOUDINARY_API_SECRET!.trim();
    const params = buildSignedVideoUploadParams(folder);
    const signature = signCloudinaryUploadParams(params, apiSecret);

    return NextResponse.json({
      mode: "signed" as const,
      cloudName,
      apiKey,
      timestamp: params.timestamp,
      signature,
      folder,
    });
  }

  const uploadPreset = getCloudinaryVideoUploadPreset();
  if (!uploadPreset) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_CLOUDINARY_VIDEO_UPLOAD_PRESET غير مُعد." },
      { status: 503 }
    );
  }

  return NextResponse.json({
    mode: "unsigned" as const,
    cloudName,
    uploadPreset,
    folder,
  });
}
