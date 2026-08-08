import type { StoreSecuritySettings } from "@/types/store";
import { getSystemHealthReport } from "@/lib/store/health";

export type BackupStatusSnapshot = {
  backup_status: StoreSecuritySettings["backup_status"];
  backup_last_at: string;
  backup_note: string;
  backup_note_he: string;
  backup_note_en: string;
  database_detail: string;
};

/**
 * Derive backup/platform health from live DB connectivity.
 * Supabase manages physical backups; we surface whether the project is reachable
 * and remind the merchant where backups are managed.
 */
export async function getLiveBackupStatus(): Promise<BackupStatusSnapshot> {
  const report = await getSystemHealthReport();
  const db = report.checks.find((c) => c.id === "database");
  const status = db?.status ?? report.overall;
  const backup_status: StoreSecuritySettings["backup_status"] =
    status === "green" ? "ok" : status === "yellow" ? "warning" : "error";

  const detail = db?.detail || report.overall;
  return {
    backup_status,
    backup_last_at: new Date().toISOString(),
    backup_note:
      backup_status === "ok"
        ? `قاعدة البيانات متصلة — النسخ الاحتياطي يُدار عبر لوحة Supabase (PITR / Daily). ${detail}`
        : `تحقق من اتصال Supabase — النسخ الاحتياطي يُدار من لوحة المشروع. ${detail}`,
    backup_note_he:
      backup_status === "ok"
        ? `מסד הנתונים מחובר — הגיבויים מנוהלים בלוח Supabase (PITR / Daily). ${detail}`
        : `בדקי את חיבור Supabase — הגיבויים מנוהלים מלוח הפרויקט. ${detail}`,
    backup_note_en:
      backup_status === "ok"
        ? `Database connected — backups are managed in the Supabase dashboard (PITR / Daily). ${detail}`
        : `Check Supabase connectivity — backups are managed in the project dashboard. ${detail}`,
    database_detail: detail,
  };
}
