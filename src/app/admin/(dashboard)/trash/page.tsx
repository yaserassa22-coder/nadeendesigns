import type { Metadata } from "next";
import { TrashManager } from "@/components/admin/TrashManager";

export const metadata: Metadata = {
  title: "سلة المحذوفات",
};

export const dynamic = "force-dynamic";

export default function AdminTrashPage() {
  return <TrashManager />;
}
