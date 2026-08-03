import type { Metadata } from "next";
import { CustomersOverlayManager } from "@/components/admin/CustomersOverlayManager";

export const metadata: Metadata = {
  title: "العملاء",
};

export const dynamic = "force-dynamic";

export default function AdminCustomersPage() {
  return <CustomersOverlayManager />;
}
