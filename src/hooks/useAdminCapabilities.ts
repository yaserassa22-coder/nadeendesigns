"use client";

import { useEffect, useState } from "react";
import type { LifecycleCapabilities } from "@/lib/admin/permissions";

const DENIED: LifecycleCapabilities = {
  canArchive: false,
  canRestore: false,
  canSoftDelete: false,
  canPermanentDelete: false,
  canEmptyTrash: false,
  canForceOverride: false,
  canMutateStore: false,
  canMutateSettings: false,
  canManageAdministrators: false,
  canAssignOwner: false,
  canUpload: false,
  role: "staff",
};

/**
 * Loads /api/admin/me capabilities. Defaults to deny-all until loaded
 * (never flash privileged buttons for staff).
 */
export function useAdminCapabilities() {
  const [caps, setCaps] = useState<LifecycleCapabilities>(DENIED);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/admin/me", {
          credentials: "same-origin",
          cache: "no-store",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "فشل تحميل الصلاحيات");
        if (!cancelled && data.capabilities) {
          setCaps({ ...DENIED, ...data.capabilities });
        }
        if (!cancelled) setError(null);
      } catch (e) {
        if (!cancelled) {
          setCaps(DENIED);
          setError(e instanceof Error ? e.message : "خطأ");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { caps, loading, error };
}
