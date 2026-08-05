import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import {
  deleteExperienceTemplate,
  listExperienceTemplates,
  saveExperienceTemplate,
} from "@/lib/products/experience-templates";
import { normalizeProductExperienceConfig } from "@/lib/products/experience-designer";

export async function GET() {
  const { error } = await requireAdminApi();
  if (error) return error;
  const templates = await listExperienceTemplates();
  return NextResponse.json({ templates });
}

export async function POST(req: Request) {
  const { error } = await requireAdminApi();
  if (error) return error;
  const body = (await req.json()) as Record<string, unknown>;
  const name = typeof body.name === "string" ? body.name : "";
  const name_ar = typeof body.name_ar === "string" ? body.name_ar : name;
  if (!name.trim() && !name_ar.trim()) {
    return NextResponse.json({ error: "الاسم مطلوب" }, { status: 400 });
  }
  const saved = await saveExperienceTemplate({
    id: typeof body.id === "string" ? body.id : undefined,
    slug: typeof body.slug === "string" ? body.slug : null,
    name: name || name_ar,
    name_ar: name_ar || name,
    description: typeof body.description === "string" ? body.description : "",
    description_ar:
      typeof body.description_ar === "string" ? body.description_ar : "",
    config: normalizeProductExperienceConfig(body.config),
    is_system: false,
    sort_order:
      typeof body.sort_order === "number" ? body.sort_order : undefined,
  });
  if (!saved) {
    return NextResponse.json(
      { error: "فشل حفظ القالب — تأكد من تطبيق ترحيل 038" },
      { status: 500 }
    );
  }
  return NextResponse.json({ template: saved });
}

export async function DELETE(req: Request) {
  const { error } = await requireAdminApi();
  if (error) return error;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id مطلوب" }, { status: 400 });
  }
  const ok = await deleteExperienceTemplate(id);
  if (!ok) {
    return NextResponse.json(
      { error: "تعذّر الحذف (قوالب النظام محمية)" },
      { status: 400 }
    );
  }
  return NextResponse.json({ ok: true });
}
