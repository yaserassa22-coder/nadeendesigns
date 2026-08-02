import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "لوحة الإدارة",
    template: "%s | إدارة Nadeen Designs",
  },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
