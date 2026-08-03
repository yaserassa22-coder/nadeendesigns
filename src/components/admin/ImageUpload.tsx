"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ImagePlus, Loader2, Star, X } from "lucide-react";
import { setFeaturedImage } from "@/lib/products/featured-image";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  value: string[];
  onChange: (urls: string[]) => void;
  multiple?: boolean;
  className?: string;
}

export function ImageUpload({
  value,
  onChange,
  multiple = true,
  className,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [pasteUrl, setPasteUrl] = useState("");

  const uploadFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    setError("");

    try {
      const urls: string[] = [];
      const list = Array.from(files).slice(0, multiple ? undefined : 1);

      for (const file of list) {
        const form = new FormData();
        form.append("file", file);
        console.info("[ImageUpload] uploading", {
          name: file.name,
          type: file.type,
          size: file.size,
        });
        const res = await fetch("/api/upload", { method: "POST", body: form });
        let data: { error?: string; url?: string } = {};
        try {
          data = await res.json();
        } catch {
          throw new Error("تعذّر قراءة رد خادم الرفع.");
        }
        if (!res.ok) {
          console.error("[ImageUpload] upload failed", {
            status: res.status,
            data,
          });
          throw new Error(data.error ?? `فشل الرفع (رمز ${res.status})`);
        }
        if (!data.url) {
          console.error("[ImageUpload] missing url", data);
          throw new Error("تم الرفع لكن لم يُرجع رابط الصورة.");
        }
        console.info("[ImageUpload] success", data.url);
        urls.push(data.url);
      }

      onChange(multiple ? [...value, ...urls] : urls);
    } catch (e) {
      console.error("[ImageUpload] error", e);
      setError(e instanceof Error ? e.message : "فشل رفع الصورة");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const remove = (url: string) => {
    onChange(value.filter((v) => v !== url));
  };

  const makeFeatured = (url: string) => {
    onChange(setFeaturedImage(value, url));
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap gap-3">
        {value.map((url, index) => (
          <div
            key={url}
            className={cn(
              "relative h-24 w-24 overflow-hidden rounded-xl border",
              index === 0 ? "border-gold ring-1 ring-gold/40" : "border-beige-dark"
            )}
          >
            <Image src={url} alt="" fill className="object-cover" sizes="96px" />
            {index === 0 && (
              <span className="absolute bottom-1 start-1 rounded bg-gold px-1.5 py-0.5 text-[10px] font-medium text-white">
                رئيسية
              </span>
            )}
            {index !== 0 && (
              <button
                type="button"
                onClick={() => makeFeatured(url)}
                className="absolute bottom-1 start-1 rounded-full bg-charcoal/70 p-1 text-white hover:bg-gold"
                aria-label="تعيين كصورة رئيسية"
                title="تعيين كصورة رئيسية"
              >
                <Star className="h-3 w-3" />
              </button>
            )}
            <button
              type="button"
              onClick={() => remove(url)}
              className="absolute top-1 left-1 rounded-full bg-charcoal/70 p-1 text-white"
              aria-label="حذف الصورة"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-gold/50 bg-beige/40 text-gold transition-colors hover:bg-gold/10 disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <ImagePlus className="h-5 w-5" />
          )}
          <span className="text-xs">{uploading ? "جاري الرفع" : "رفع"}</span>
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        className="hidden"
        onChange={(e) => uploadFiles(e.target.files)}
      />

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <input
          type="url"
          dir="ltr"
          value={pasteUrl}
          onChange={(e) => setPasteUrl(e.target.value)}
          placeholder="https://res.cloudinary.com/..."
          className="min-w-0 flex-1 rounded-xl border border-beige-dark bg-white px-3 py-2 text-sm"
        />
        <button
          type="button"
          className="rounded-xl border border-gold/40 px-3 py-2 text-sm text-gold hover:bg-gold/10"
          onClick={() => {
            const url = pasteUrl.trim();
            if (!url) {
              setError("الصقي رابط صورة صالح أولًا.");
              return;
            }
            if (!/^https?:\/\//i.test(url)) {
              setError("رابط الصورة يجب أن يبدأ بـ http أو https.");
              return;
            }
            setError("");
            onChange(multiple ? [...value, url] : [url]);
            setPasteUrl("");
            console.info("[ImageUpload] pasted url", url);
          }}
        >
          إضافة رابط
        </button>
      </div>

      <p className="text-xs text-muted">
        الصورة الأولى هي الصورة الرئيسية (البطاقات والسلة والطلبات). اضغطي النجمة لتعيين صورة أخرى كرئيسية.
        الرفع عبر Cloudinary (Unsigned Preset).
      </p>
    </div>
  );
}
