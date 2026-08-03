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
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

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

      onChange(multiple ? [...value, ...urls] : urls);
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
    if (from === to || from < 0 || to < 0 || from >= value.length || to >= value.length)
      return;
    const next = [...value];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
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
          }}
        >
          إضافة رابط
        </button>
      </div>

      <p className="text-xs text-muted">
        اسحبي الصور لإعادة الترتيب. الصورة الأولى هي الرئيسية. اضغطي النجمة
        لتعيين صورة أخرى كرئيسية. عدد الصور غير محدود.
      </p>
    </div>
  );
}
