import type { Metadata } from "next";
import {
  ReportsCenter,
  type ReportsApiResponse,
} from "@/components/admin/reports/ReportsCenter";
import {
  getAdminActorRole,
  getReportsAnalytics,
  serializeReportsPayload,
} from "@/lib/admin/reports-data";
import { getAuthenticatedUser } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "التقارير",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminReportsPage() {
  const user = await getAuthenticatedUser();
  const role = user ? await getAdminActorRole(user.id) : "admin";
  const result = await getReportsAnalytics(
    { preset: "last_30_days", section: "overview" },
    {
      id: user?.id ?? "anonymous",
      email: user?.email,
      role,
    }
  );

  const initialData = serializeReportsPayload(
    result
  ) as unknown as ReportsApiResponse;

  return <ReportsCenter initialData={initialData} />;
}
