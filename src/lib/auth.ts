import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/server";

export async function requireAdminApi() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return {
      user: null,
      error: NextResponse.json({ error: "غير مصرح" }, { status: 401 }),
    };
  }
  return { user, error: null };
}
