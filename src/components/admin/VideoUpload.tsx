"use client";

import { useRef, useState } from "react";
import { Film, Loader2, X } from "lucide-react";
import { cloudinaryVideoOriginalUrl } from "@/lib/media/cloudinary-video";
import { cn } from "@/lib/utils";

type VideoUploadProps = {
  value: string;
  onChange: (url: string) => void;
  uploadLabel: string;
  uploadingLabel: string;
  pastePlaceholder: string;
  pasteAddLabel: string;
  removeLabel: string;
  className?: string;
};

const VIDEO_MAX_BYTES = 500 * 1024 * 1024;

type VideoSignatureSigned = {
  mode: "signed";
  cloudName: string;
  apiKey: string;
  timestamp: string;
  signature: string;
  folder: string;
};

type VideoSignatureUnsigned = {
  mode: "unsigned";
  cloudName: string;
  uploadPreset: string;
  folder: string;
};

type VideoSignature = VideoSignatureSigned | VideoSignatureUnsigned;

function probeLocalVideoDimensions(
  file: File
): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const width = video.videoWidth;
      const height = video.videoHeight;
      URL.revokeObjectURL(objectUrl);
      resolve(width > 0 && height > 0 ? { width, height } : null);
    };
    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(null);
    };
    video.src = objectUrl;
  });
}

function buildQualityWarning(
  width?: number,
  height?: number,
  sourceWidth?: number,
  sourceHeight?: number
): string | undefined {
  if (sourceHeight && height && height < sourceHeight * 0.9) {
    return `Cloudinary خفّض الدقة من ${sourceWidth}×${sourceHeight} إلى ${width}×${height}.`;
  }
  if (height && height < 1080) {
    return `الدقة ${width}×${height} منخفضة للهيرو. للحصول على وضوح أفضل ارفعي 1080p أو 4K.`;
  }
  return undefined;
}

/**
 * Large videos upload directly to Cloudinary from the browser (bypasses Next.js body limit).
 */
export function VideoUpload({
  value,
  onChange,
  uploadLabel,
  uploadingLabel,
  pastePlaceholder,
  pasteAddLabel,
  removeLabel,
  className,
}: VideoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [pasteUrl, setPasteUrl] = useState("");
  const [uploadInfo, setUploadInfo] = useState("");
  const [qualityWarning, setQualityWarning] = useState("");

  const uploadFile = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;

    if (file.size > VIDEO_MAX_BYTES) {
      setError("حجم الفيديو كبير جدًا (الحد الأقصى 500MB).");
      return;
    }

    setUploading(true);
    setError("");
    setUploadInfo("");
    setQualityWarning("");

    try {
      const localDims = await probeLocalVideoDimensions(file);

      const sigRes = await fetch("/api/upload/video-signature", {
        method: "POST",
      });
      const sigData = (await sigRes.json()) as VideoSignature & {
        error?: string;
      };
      if (!sigRes.ok) {
        throw new Error(sigData.error ?? `فشل تجهيز الرفع (رمز ${sigRes.status})`);
      }

      const form = new FormData();
      form.append("file", file);

      if (sigData.mode === "signed") {
        form.append("api_key", sigData.apiKey);
        form.append("timestamp", sigData.timestamp);
        form.append("signature", sigData.signature);
        form.append("folder", sigData.folder);
      } else {
        form.append("upload_preset", sigData.uploadPreset);
        form.append("folder", sigData.folder);
      }

      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${sigData.cloudName}/video/upload`,
        { method: "POST", body: form }
      );

      const data = (await uploadRes.json()) as {
        error?: { message?: string };
        secure_url?: string;
        url?: string;
        width?: number;
        height?: number;
      };

      if (!uploadRes.ok) {
        throw new Error(
          data.error?.message ??
            `فشل رفع Cloudinary (رمز ${uploadRes.status})`
        );
      }

      const rawUrl = data.secure_url || data.url;
      if (!rawUrl) {
        throw new Error("تم الرفع لكن Cloudinary لم يُرجع رابط الفيديو.");
      }

      const url = cloudinaryVideoOriginalUrl(rawUrl);
      onChange(url);

      const localLabel = localDims
        ? `${localDims.width}×${localDims.height}`
        : null;
      const storedLabel =
        data.width && data.height ? `${data.width}×${data.height}` : null;
      const mode =
        sigData.mode === "signed" ? "رفع مباشر إلى Cloudinary" : "رفع عبر preset";

      const infoParts = [
        localLabel && storedLabel
          ? `ملفك ${localLabel} → مخزّن ${storedLabel}`
          : storedLabel,
        mode,
      ].filter(Boolean);
      if (infoParts.length > 0) setUploadInfo(infoParts.join(" · "));

      const warning = buildQualityWarning(
        data.width,
        data.height,
        localDims?.width,
        localDims?.height
      );
      if (warning) setQualityWarning(warning);
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشل رفع الفيديو");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-start gap-3">
        {value.trim() ? (
          <div className="relative w-full max-w-sm overflow-hidden rounded-xl border border-beige-dark bg-charcoal/5">
            <video
              src={value}
              controls
              preload="auto"
              className="max-h-48 w-full object-contain"
            />
            <button
              type="button"
              onClick={() => onChange("")}
              className="absolute top-2 end-2 rounded-full bg-charcoal/70 p-1 text-white"
              aria-label={removeLabel}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          aria-label={uploadLabel}
          className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-gold/50 bg-beige/40 text-gold transition-colors hover:bg-gold/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Film className="h-5 w-5" />
          )}
          <span className="text-xs">
            {uploading ? uploadingLabel : uploadLabel}
          </span>
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime,video/*"
        className="hidden"
        onChange={(e) => uploadFile(e.target.files)}
      />

      <p className="text-xs text-muted">
        MP4 بدقة 1080p أو 4K (حتى 500MB). يُرفع مباشرة إلى Cloudinary — مناسب
        للفيديوهات الكبيرة. لا تضغطي الملف على جهازك قبل الرفع.
      </p>

      {uploadInfo ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          {uploadInfo}
        </p>
      ) : null}

      {qualityWarning ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {qualityWarning}
        </p>
      ) : null}

      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <input
          type="url"
          dir="ltr"
          value={pasteUrl}
          onChange={(e) => setPasteUrl(e.target.value)}
          placeholder={pastePlaceholder}
          aria-label={pastePlaceholder}
          className="min-w-0 flex-1 rounded-xl border border-beige-dark bg-white px-3 py-2 text-sm focus:border-gold focus:ring-2 focus:ring-gold/20"
        />
        <button
          type="button"
          className="rounded-xl border border-gold/40 px-3 py-2 text-sm text-gold hover:bg-gold/10"
          onClick={() => {
            const url = pasteUrl.trim();
            if (!url) {
              setError("الصقي رابط فيديو صالح أولًا.");
              return;
            }
            if (!/^https?:\/\//i.test(url)) {
              setError("رابط الفيديو يجب أن يبدأ بـ http أو https.");
              return;
            }
            setError("");
            onChange(url);
            setPasteUrl("");
          }}
        >
          {pasteAddLabel}
        </button>
      </div>
    </div>
  );
}
