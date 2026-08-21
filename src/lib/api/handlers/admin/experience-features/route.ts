import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import {
  deleteExperienceFeature,
  FEATURE_GROUP_KEYS,
  listExperienceFeatures,
  saveExperienceFeature,
  type FeatureGroupKey,
} from "@/lib/products/experience-features";

export async function GET() {
  const { error } = await requireAdminApi();
  if (error) return error;
  const features = await listExperienceFeatures();
  return NextResponse.json({ features });
}

export async function POST(req: Request) {
  const { error } = await requireAdminApi("canMutateStore");
  if (error) return error;
  const body = (await req.json()) as Record<string, unknown>;
  const id = typeof body.id === "string" ? body.id.trim() : "";
  if (!id) {
    return NextResponse.json({ error: "المعرّف مطلوب" }, { status: 400 });
  }
  const group_key = (
    typeof body.group_key === "string" &&
    (FEATURE_GROUP_KEYS as readonly string[]).includes(body.group_key)
      ? body.group_key
      : "general"
  ) as FeatureGroupKey;

  const saved = await saveExperienceFeature({
    id,
    name: typeof body.name === "string" ? body.name : "",
    name_ar: typeof body.name_ar === "string" ? body.name_ar : "",
    description: typeof body.description === "string" ? body.description : "",
    description_ar:
      typeof body.description_ar === "string" ? body.description_ar : "",
    group_key,
    maps_to: typeof body.maps_to === "string" ? body.maps_to : null,
    enabled: body.enabled !== false,
    sort_order: typeof body.sort_order === "number" ? body.sort_order : 0,
    is_system: Boolean(body.is_system),
  });
  if (!saved) {
    return NextResponse.json(
      { error: "فشل الحفظ — تأكد من تطبيق ترحيل 040" },
      { status: 500 }
    );
  }
  return NextResponse.json({ feature: saved });
}

export async function DELETE(req: Request) {
  const { error } = await requireAdminApi("canMutateStore");
  if (error) return error;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id مطلوب" }, { status: 400 });
  }
  const ok = await deleteExperienceFeature(id);
  if (!ok) {
    return NextResponse.json(
      { error: "تعذّر الحذف (ميزات النظام محمية)" },
      { status: 400 }
    );
  }
  return NextResponse.json({ ok: true });
}
