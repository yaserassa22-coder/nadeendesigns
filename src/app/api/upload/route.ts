import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      return NextResponse.json(
        { error: "Cloudinary not configured" },
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
      throw new Error(err.error?.message ?? "Upload failed");
    }

    const data = await res.json();
    return NextResponse.json({ url: data.secure_url, publicId: data.public_id });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upload error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
