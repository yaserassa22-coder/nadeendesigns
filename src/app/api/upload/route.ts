import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { isCloudinaryConfigured } from "@/lib/supabase/env";

export async function POST(request: Request) {
  const { error: authError } = await requireAdminApi();
  if (authError) return authError;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "لم يتم اختيار ملف" }, { status: 400 });
    }

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!isCloudinaryConfigured() || !cloudName || !uploadPreset) {
      return NextResponse.json(
        {
          error:
            "Cloudinary غير مُعد. أضيفي NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME و NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET",
        },
        { status: 503 }
      );
    }

    const uploadForm = new FormData();
    uploadForm.append("file", file);
    uploadForm.append("upload_preset", uploadPreset);
    uploadForm.append("folder", "nadeendesigns");

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      { method: "POST", body: uploadForm }
    );

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message ?? "فشل الرفع");
    }

    const data = await res.json();
    return NextResponse.json({
      url: data.secure_url as string,
      publicId: data.public_id as string,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "خطأ في الرفع";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
