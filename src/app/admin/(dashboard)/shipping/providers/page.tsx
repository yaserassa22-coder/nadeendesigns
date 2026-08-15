import type { Metadata } from "next";
import { ShippingProvidersManager } from "@/components/admin/ShippingProvidersManager";

export const metadata: Metadata = {
  title: "شركات الشحن",
};

export default function AdminShippingProvidersPage() {
  return <ShippingProvidersManager />;
}
