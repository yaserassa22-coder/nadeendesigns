import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { deleteProvider } from "@/lib/shipping/providers/store";

type Ctx = { params: Promise<{ code: string }> };

export async function DELETE(_request: NextRequest, ctx: Ctx) {
  const gate = await requireAdminApi("canMutateSettings");
  if (gate.error) return gate.error;

  const { code: raw } = await ctx.params;
  const code = decodeURIComponent(raw ?? "").trim();
  if (!code) {
    return NextResponse.json({ error: "code required" }, { status: 400 });
  }

  try {
    await deleteProvider(code);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Delete failed" },
      { status: 400 }
    );
  }
}
