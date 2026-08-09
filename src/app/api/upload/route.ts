import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { isCloudinaryConfigured } from "@/lib/supabase/env";

type ResourceKind = "image" | "video";

function mapCloudinaryError(
  payload: unknown,
  status: number,
  kind: ResourceKind
): string {
  const message =
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    payload.error &&
    typeof payload.error === "object" &&
    "message" in payload.error
      ? String((payload.error as { message?: string }).message ?? "")
      : "";

  console.error("[upload API] Cloudinary error", { status, payload, kind });

  if (/Upload preset must be whitelisted for unsigned uploads/i.test(message)) {
    return "إعداد الرفع غير موقّع (unsigned). افتحي Cloudinary → Settings → Upload → تأكدي أن الـ preset من نوع Unsigned.";
  }
  if (/Invalid upload preset/i.test(message)) {
    return "اسم Upload Preset غير صحيح. تحققي من NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET.";
  }
  if (/Unknown API key|Invalid cloud_name|cloud_name is disabled/i.test(message)) {
    return "اسم حساب Cloudinary غير صحيح. تحققي من NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME.";
  }
  if (/Folder is restricted|not allowed/i.test(message)) {
    return "مجلد الرفع غير مسموح في الـ preset. أزيلي قيد المجلد أو اسمحي بمجلد nadeendesigns.";
  }
  if (/resource type|video is not allowed|Unsupported video/i.test(message)) {
    return "الـ Upload Preset لا يسمح برفع الفيديو. في Cloudinary فعّلي Video ضمن إعدادات الـ preset.";
  }
  if (message) {
    return kind === "video"
      ? `فشل رفع الفيديو عبر Cloudinary: ${message}`
      : `فشل رفع الصورة عبر Cloudinary: ${message}`;
  }
  return kind === "video"
    ? `فشل رفع الفيديو (رمز ${status}).`
    : `فشل رفع الصورة (رمز ${status}).`;
}

function resolveResourceKind(
  file: File,
  requested: FormDataEntryValue | null
): ResourceKind | null {
  if (requested === "video" || file.type.startsWith("video/")) return "video";
  if (requested === "image" || file.type.startsWith("image/")) return "image";
  return null;
}

export async function POST(request: Request) {
  const { error: authError } = await requireAdminApi("canUpload");
  if (authError) {
    console.error("[upload API] unauthorized — admin login required");
    return NextResponse.json(
      { error: "يجب تسجيل الدخول للوحة الإدارة قبل رفع الملفات." },
      { status: 401 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "لم يتم اختيار ملف صالح." },
        { status: 400 }
      );
    }

    const kind = resolveResourceKind(file, formData.get("resourceType"));
    if (!kind) {
      return NextResponse.json(
        { error: "يُسمح برفع ملفات الصور أو الفيديو فقط." },
        { status: 400 }
      );
    }

    const maxBytes =
      kind === "video" ? 80 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxBytes) {
      return NextResponse.json(
        {
          error:
            kind === "video"
              ? "حجم الفيديو كبير جدًا (الحد الأقصى 80MB)."
              : "حجم الصورة كبير جدًا (الحد الأقصى 10MB).",
        },
        { status: 400 }
      );
    }

    if (kind === "image" && !file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "يُسمح برفع ملفات الصور فقط لهذا المسار." },
        { status: 400 }
      );
    }
    if (kind === "video" && !file.type.startsWith("video/")) {
      return NextResponse.json(
        { error: "يُسمح برفع ملفات الفيديو فقط لهذا المسار." },
        { status: 400 }
      );
    }

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim();
    const uploadPreset =
      process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET?.trim();
    const folder =
      process.env.NEXT_PUBLIC_CLOUDINARY_FOLDER?.trim() || "nadeendesigns";

    if (!isCloudinaryConfigured() || !cloudName || !uploadPreset) {
      console.error("[upload API] Cloudinary env missing", {
        hasCloudName: Boolean(cloudName),
        hasPreset: Boolean(uploadPreset),
      });
      return NextResponse.json(
        {
          error:
            "Cloudinary غير مُعد. أضيفي NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME و NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET في .env.local ثم أعيدي تشغيل الخادم.",
        },
        { status: 503 }
      );
    }

    const uploadForm = new FormData();
    uploadForm.append("file", file);
    uploadForm.append("upload_preset", uploadPreset);
    if (folder) uploadForm.append("folder", folder);

    const endpoint =
      kind === "video"
        ? `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`
        : `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

    console.info("[upload API] uploading to Cloudinary", {
      cloudName,
      uploadPreset,
      folder,
      kind,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    });

    const res = await fetch(endpoint, { method: "POST", body: uploadForm });

    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        { error: mapCloudinaryError(payload, res.status, kind) },
        { status: 502 }
      );
    }

    const url = (payload.secure_url || payload.url) as string | undefined;
    if (!url) {
      console.error("[upload API] missing URL in Cloudinary response", payload);
      return NextResponse.json(
        {
          error:
            kind === "video"
              ? "تم الرفع لكن Cloudinary لم يُرجع رابط الفيديو."
              : "تم الرفع لكن Cloudinary لم يُرجع رابط الصورة.",
        },
        { status: 502 }
      );
    }

    console.info("[upload API] upload success", {
      kind,
      url,
      publicId: payload.public_id,
    });

    return NextResponse.json({
      url,
      publicId: payload.public_id as string | undefined,
      resourceType: kind,
    });
  } catch (e) {
    console.error("[upload API] unexpected error", e);
    const message =
      e instanceof Error ? e.message : "حدث خطأ غير متوقع أثناء الرفع";
    return NextResponse.json(
      { error: `فشل الرفع: ${message}` },
      { status: 500 }
    );
  }
}
