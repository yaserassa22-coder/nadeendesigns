"use client";

import { useRef, useState } from "react";
import { Film, Loader2, X } from "lucide-react";
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

/**
 * Admin video file upload via Cloudinary (unsigned preset) + optional paste URL.
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

  const uploadFile = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("resourceType", "video");
      const res = await fetch("/api/upload", { method: "POST", body: form });
      let data: { error?: string; url?: string } = {};
      try {
        data = await res.json();
      } catch {
        throw new Error("تعذّر قراءة رد خادم الرفع.");
      }
      if (!res.ok) {
        throw new Error(data.error ?? `فشل الرفع (رمز ${res.status})`);
      }
      if (!data.url) {
        throw new Error("تم الرفع لكن لم يُرجع رابط الفيديو.");
      }
      onChange(data.url);
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
              preload="metadata"
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
