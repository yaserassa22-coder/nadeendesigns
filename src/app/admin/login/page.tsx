import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginForm } from "@/components/admin/LoginForm";

export const metadata: Metadata = {
  title: "تسجيل الدخول",
};

export default function AdminLoginPage() {
  return (
    <div className="luxury-gradient flex min-h-screen items-center justify-center px-4 py-12">
      <Suspense
        fallback={
          <div className="w-full max-w-md rounded-3xl border border-beige-dark bg-white p-8 text-center text-muted">
            جاري التحميل...
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
