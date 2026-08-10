import crypto from "node:crypto";

/** Server-only signed Cloudinary upload (avoids unsigned image preset crushing video). */
export function isCloudinarySignedUploadConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_API_KEY?.trim() &&
      process.env.CLOUDINARY_API_SECRET?.trim() &&
      process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim()
  );
}

/**
 * Dedicated unsigned video preset — must NOT fall back to the image preset
 * (image incoming transforms destroy video quality).
 */
export function getCloudinaryVideoUploadPreset(): string | undefined {
  return process.env.NEXT_PUBLIC_CLOUDINARY_VIDEO_UPLOAD_PRESET?.trim();
}

export function isCloudinaryVideoUploadConfigured(): boolean {
  return (
    isCloudinarySignedUploadConfigured() ||
    Boolean(getCloudinaryVideoUploadPreset())
  );
}

export function signCloudinaryUploadParams(
  params: Record<string, string>,
  apiSecret: string
): string {
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return crypto.createHash("sha1").update(toSign + apiSecret).digest("hex");
}

export function appendSignedCloudinaryAuth(
  form: FormData,
  params: Record<string, string>
): void {
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (!apiKey || !apiSecret) {
    throw new Error("Cloudinary signed upload credentials missing");
  }

  const signature = signCloudinaryUploadParams(params, apiSecret);
  form.append("api_key", apiKey);
  form.append("timestamp", params.timestamp);
  form.append("signature", signature);

  for (const [key, value] of Object.entries(params)) {
    if (key === "timestamp") continue;
    form.append(key, value);
  }
}

/** Signed upload — folder + timestamp only (no re-encode params that downscale). */
export function buildSignedVideoUploadParams(
  folder: string
): Record<string, string> {
  return {
    folder,
    timestamp: String(Math.floor(Date.now() / 1000)),
  };
}

type CloudinaryEager = { secure_url?: string; url?: string };

export function pickBestCloudinaryVideoUrl(payload: {
  secure_url?: string;
  url?: string;
  eager?: CloudinaryEager[];
}): string | undefined {
  const eager = payload.eager?.[0];
  const eagerUrl = eager?.secure_url || eager?.url;
  if (eagerUrl) return eagerUrl;
  return payload.secure_url || payload.url;
}
