import { requireAdminApi } from "@/lib/auth";
import { csvResponse, rowsToCsv } from "@/lib/admin/csv-export";
import { filterRowsByVisibility } from "@/lib/admin/lifecycle";
import { selectShopOrdersList } from "@/lib/shop/order-query";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  getErrorMessage,
  isMissingColumnError,
  isMissingTableError,
} from "@/lib/supabase/errors";
import { createPrivilegedClient } from "@/lib/supabase/privileged";
import { NextResponse } from "next/server";

type ExportModule =
  | "orders"
  | "bookings"
  | "customers"
  | "messages"
  | "notifications";

function isExportModule(value: string | null): value is ExportModule {
  return (
    value === "orders" ||
    value === "bookings" ||
    value === "customers" ||
    value === "messages" ||
    value === "notifications"
  );
}

export async function GET(request: Request) {
  const { error: authError } = await requireAdminApi();
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const exportModule = searchParams.get("module");
  if (!isExportModule(exportModule)) {
    return NextResponse.json(
      {
        error:
          "وحدة التصدير غير صالحة. استخدم: orders | bookings | customers | messages | notifications",
      },
      { status: 400 }
    );
  }

  if (!isSupabaseConfigured()) {
    return csvResponse(`${exportModule}.csv`, rowsToCsv(["empty"], []));
  }

  const supabase = await createPrivilegedClient();

  try {
    if (exportModule === "orders") {
      const { data, error } = await selectShopOrdersList(supabase);
      if (error) {
        return NextResponse.json(
          { error: error.message || "فشل جلب الطلبات" },
          { status: 400 }
        );
      }
      const rows = filterRowsByVisibility(
        data as Array<{ is_deleted?: boolean | null; archived_at?: string | null }>,
        "active"
      ) as typeof data;
      const csv = rowsToCsv(
        [
          "id",
          "name",
          "phone",
          "email",
          "status",
          "total",
          "shipping_cost",
          "delivery_method",
          "created_at",
        ],
        rows.map((o) => [
          o.id,
          o.name,
          o.phone,
          o.email,
          o.status,
          o.total,
          o.shipping_cost,
          o.delivery_method,
          o.created_at,
        ])
      );
      return csvResponse("orders.csv", csv);
    }

    if (exportModule === "bookings") {
      let query = supabase
        .from("bookings")
        .select("*")
        .order("created_at", { ascending: false });
      query = query.eq("is_deleted", false) as typeof query;
      const { data, error } = await query;
      if (error && (isMissingColumnError(error) || /is_deleted/i.test(error.message))) {
        const retry = await supabase
          .from("bookings")
          .select("*")
          .order("created_at", { ascending: false });
        if (retry.error) {
          return NextResponse.json(
            { error: getErrorMessage(retry.error) },
            { status: 400 }
          );
        }
        const csv = rowsToCsv(
          ["id", "name", "phone", "email", "date", "time", "service_type", "status", "created_at"],
          (retry.data ?? []).map((b) => [
            b.id,
            b.name,
            b.phone,
            b.email,
            b.date,
            b.time,
            b.service_type,
            b.status,
            b.created_at,
          ])
        );
        return csvResponse("bookings.csv", csv);
      }
      if (error) {
        return NextResponse.json(
          { error: getErrorMessage(error) },
          { status: 400 }
        );
      }
      const csv = rowsToCsv(
        ["id", "name", "phone", "email", "date", "time", "service_type", "status", "created_at"],
        (data ?? []).map((b) => [
          b.id,
          b.name,
          b.phone,
          b.email,
          b.date,
          b.time,
          b.service_type,
          b.status,
          b.created_at,
        ])
      );
      return csvResponse("bookings.csv", csv);
    }

    if (exportModule === "messages") {
      let query = supabase
        .from("contact_messages")
        .select("*")
        .order("created_at", { ascending: false });
      query = query.eq("is_deleted", false) as typeof query;
      const { data, error } = await query;
      if (error && (isMissingColumnError(error) || /is_deleted/i.test(error.message))) {
        const retry = await supabase
          .from("contact_messages")
          .select("*")
          .order("created_at", { ascending: false });
        if (retry.error) {
          return NextResponse.json(
            { error: getErrorMessage(retry.error) },
            { status: 400 }
          );
        }
        const csv = rowsToCsv(
          ["id", "name", "email", "phone", "subject", "message", "created_at"],
          (retry.data ?? []).map((m) => [
            m.id,
            m.name,
            m.email,
            m.phone,
            m.subject,
            m.message,
            m.created_at,
          ])
        );
        return csvResponse("messages.csv", csv);
      }
      if (error) {
        return NextResponse.json(
          { error: getErrorMessage(error) },
          { status: 400 }
        );
      }
      const csv = rowsToCsv(
        ["id", "name", "email", "phone", "subject", "message", "created_at"],
        (data ?? []).map((m) => [
          m.id,
          m.name,
          m.email,
          m.phone,
          m.subject,
          m.message,
          m.created_at,
        ])
      );
      return csvResponse("messages.csv", csv);
    }

    if (exportModule === "notifications") {
      const { data, error } = await supabase
        .from("notification_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(2000);
      if (error) {
        if (isMissingTableError(error, "notification_logs")) {
          return csvResponse("notifications.csv", rowsToCsv(["empty"], []));
        }
        if (isMissingColumnError(error) || /is_deleted/i.test(error.message)) {
          // ignore
        } else {
          return NextResponse.json(
            { error: getErrorMessage(error) },
            { status: 400 }
          );
        }
      }
      let rows = (data ?? []) as Record<string, unknown>[];
      if (rows.some((r) => "is_deleted" in r)) {
        rows = rows.filter((r) => r.is_deleted !== true);
      }
      const csv = rowsToCsv(
        ["id", "channel", "status", "recipient", "subject", "created_at"],
        rows.map((n) => [
          n.id,
          n.channel ?? n.type,
          n.status,
          n.recipient ?? n.to_email ?? n.to_phone,
          n.subject ?? n.event_type,
          n.created_at,
        ])
      );
      return csvResponse("notifications.csv", csv);
    }

    // customers overlay
    const { data: overlay, error: overlayError } = await supabase
      .from("customer_admin_state")
      .select("*")
      .eq("is_deleted", false)
      .order("updated_at", { ascending: false });

    if (overlayError) {
      if (isMissingTableError(overlayError, "customer_admin_state")) {
        return csvResponse(
          "customers.csv",
          rowsToCsv(
            ["customer_key", "display_name", "phone", "email", "archived_at"],
            []
          )
        );
      }
      if (
        isMissingColumnError(overlayError) ||
        /is_deleted/i.test(overlayError.message)
      ) {
        const retry = await supabase.from("customer_admin_state").select("*");
        const csv = rowsToCsv(
          ["customer_key", "display_name", "phone", "email", "archived_at"],
          (retry.data ?? []).map((c) => [
            c.customer_key,
            c.display_name,
            c.phone,
            c.email,
            c.archived_at,
          ])
        );
        return csvResponse("customers.csv", csv);
      }
      return NextResponse.json(
        { error: getErrorMessage(overlayError) },
        { status: 400 }
      );
    }

    const csv = rowsToCsv(
      ["customer_key", "display_name", "phone", "email", "archived_at"],
      (overlay ?? []).map((c) => [
        c.customer_key,
        c.display_name,
        c.phone,
        c.email,
        c.archived_at,
      ])
    );
    return csvResponse("customers.csv", csv);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "فشل التصدير" },
      { status: 500 }
    );
  }
}
