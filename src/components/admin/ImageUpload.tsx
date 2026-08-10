"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { GripVertical, ImagePlus, Loader2, Star, X } from "lucide-react";
import { setFeaturedImage } from "@/lib/products/featured-image";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  value: string[];
  onChange: (urls: string[]) => void;
  multiple?: boolean;
  /** Cap on total images (upload + paste). Omit = unlimited. */
  maxImages?: number;
  className?: string;
}

export function ImageUpload({
  value,
  onChange,
  multiple = true,
  maxImages,
  className,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [pasteUrl, setPasteUrl] = useState("");
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const limit =
    typeof maxImages === "number" && maxImages > 0 ? maxImages : null;
  const remaining = limit == null ? Infinity : Math.max(0, limit - value.length);
  const atLimit = remaining <= 0;

  const uploadFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    if (atLimit) {
      setError(
        limit == null
          ? "تم الوصول للحد الأقصى من الصور."
          : `يمكنك رفع حتى ${limit} صور فقط.`
      );
      return;
    }
    setUploading(true);
    setError("");

    try {
      const urls: string[] = [];
      const take = multiple
        ? limit == null
          ? undefined
          : remaining
        : 1;
      const list = Array.from(files).slice(0, take);

      for (const file of list) {
        const form = new FormData();
        form.append("file", file);
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
          throw new Error("تم الرفع لكن لم يُرجع رابط الصورة.");
        }
        urls.push(data.url);
      }

      if (!urls.length) return;
      const next = multiple ? [...value, ...urls] : urls;
      onChange(limit == null ? next : next.slice(0, limit));
    } catch (e) {
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

  const reorder = (from: number, to: number) => {
    if (
      from === to ||
      from < 0 ||
      to < 0 ||
      from >= value.length ||
      to >= value.length
    )
      return;
    const next = [...value];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };

  const addPasteUrl = () => {
    const url = pasteUrl.trim();
    if (!url) {
      setError("الصقي رابط صورة صالح أولًا.");
      return;
    }
    if (!/^https?:\/\//i.test(url)) {
      setError("رابط الصورة يجب أن يبدأ بـ http أو https.");
      return;
    }
    if (atLimit) {
      setError(
        limit == null
          ? "تم الوصول للحد الأقصى من الصور."
          : `يمكنك إضافة حتى ${limit} صور فقط.`
      );
      return;
    }
    setError("");
    const next = multiple ? [...value, url] : [url];
    onChange(limit == null ? next : next.slice(0, limit));
    setPasteUrl("");
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap gap-3">
        {value.map((url, index) => (
          <div
            key={`${url}-${index}`}
            draggable
            onDragStart={() => setDragFrom(index)}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(index);
            }}
            onDragLeave={() => setDragOver((v) => (v === index ? null : v))}
            onDrop={(e) => {
              e.preventDefault();
              if (dragFrom != null) reorder(dragFrom, index);
              setDragFrom(null);
              setDragOver(null);
            }}
            onDragEnd={() => {
              setDragFrom(null);
              setDragOver(null);
            }}
            className={cn(
              "relative h-24 w-24 cursor-grab overflow-hidden rounded-xl border active:cursor-grabbing",
              index === 0
                ? "border-gold ring-1 ring-gold/40"
                : "border-beige-dark",
              dragOver === index && "ring-2 ring-gold"
            )}
          >
            <Image src={url} alt="" fill className="object-cover" sizes="96px" />
            <span className="absolute top-1 start-1 rounded bg-charcoal/50 p-0.5 text-white">
              <GripVertical className="h-3 w-3" />
            </span>
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
              className="absolute top-1 end-1 rounded-full bg-charcoal/70 p-1 text-white"
              aria-label="حذف الصورة"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}

        {!atLimit ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            aria-label="رفع صور"
            className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-gold/50 bg-beige/40 text-gold transition-colors hover:bg-gold/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <ImagePlus className="h-5 w-5" />
            )}
            <span className="text-xs">{uploading ? "جاري الرفع" : "رفع"}</span>
          </button>
        ) : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple && (limit == null || remaining > 1)}
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
          aria-label="لصق رابط صورة"
          disabled={atLimit}
          className="min-w-0 flex-1 rounded-xl border border-beige-dark bg-white px-3 py-2 text-sm focus:border-gold focus:ring-2 focus:ring-gold/20 disabled:opacity-50"
        />
        <button
          type="button"
          disabled={atLimit}
          className="rounded-xl border border-gold/40 px-3 py-2 text-sm text-gold hover:bg-gold/10 disabled:opacity-50"
          onClick={addPasteUrl}
        >
          إضافة رابط
        </button>
      </div>

      <p className="text-xs text-muted">
        اسحبي الصور لإعادة الترتيب. الصورة الأولى هي الرئيسية. اضغطي النجمة
        لتعيين صورة أخرى كرئيسية.{" "}
        {limit == null
          ? "عدد الصور غير محدود."
          : `يمكنك إضافة حتى ${limit} صور (${value.length}/${limit}).`}
      </p>
    </div>
  );
}
