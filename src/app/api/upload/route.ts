import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { isCloudinaryConfigured } from "@/lib/supabase/env";

function mapCloudinaryError(payload: unknown, status: number): string {
  const message =
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    payload.error &&
    typeof payload.error === "object" &&
    "message" in payload.error
      ? String((payload.error as { message?: string }).message ?? "")
      : "";

  console.error("[upload API] Cloudinary error", { status, payload });

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
  if (message) return `فشل رفع الصورة عبر Cloudinary: ${message}`;
  return `فشل رفع الصورة (رمز ${status}).`;
}

export async function POST(request: Request) {
  const { error: authError } = await requireAdminApi();
  if (authError) {
    console.error("[upload API] unauthorized — admin login required");
    return NextResponse.json(
      { error: "يجب تسجيل الدخول للوحة الإدارة قبل رفع الصور." },
      { status: 401 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "لم يتم اختيار ملف صورة صالح." },
        { status: 400 }
      );
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "يُسمح برفع ملفات الصور فقط." },
        { status: 400 }
      );
    }

    const maxBytes = 10 * 1024 * 1024;
    if (file.size > maxBytes) {
      return NextResponse.json(
        { error: "حجم الصورة كبير جدًا (الحد الأقصى 10MB)." },
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
    // Only send folder when configured; some presets reject unknown folders
    if (folder) uploadForm.append("folder", folder);

    console.info("[upload API] uploading to Cloudinary", {
      cloudName,
      uploadPreset,
      folder,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    });

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      { method: "POST", body: uploadForm }
    );

    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        { error: mapCloudinaryError(payload, res.status) },
        { status: 502 }
      );
    }

    const url = (payload.secure_url || payload.url) as string | undefined;
    if (!url) {
      console.error("[upload API] missing URL in Cloudinary response", payload);
      return NextResponse.json(
        { error: "تم الرفع لكن Cloudinary لم يُرجع رابط الصورة." },
        { status: 502 }
      );
    }

    console.info("[upload API] upload success", {
      url,
      publicId: payload.public_id,
    });

    return NextResponse.json({
      url,
      publicId: payload.public_id as string | undefined,
    });
  } catch (e) {
    console.error("[upload API] unexpected error", e);
    const message =
      e instanceof Error ? e.message : "حدث خطأ غير متوقع أثناء رفع الصورة";
    return NextResponse.json(
      { error: `فشل رفع الصورة: ${message}` },
      { status: 500 }
    );
  }
}
