"use client";

import { useLocale } from "@/components/i18n/LocaleProvider";

import {
  Fragment,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Mail,
  RefreshCw,
  Sparkles,
  X,
} from "lucide-react";
import type {
  AppointmentLifecycleAction,
  Booking,
  BookingSource,
  BookingStatus,
  DeliveryStatus,
} from "@/types";
import {
  BOOKING_SOURCE_LABELS,
  BOOKING_STATUS_BADGE_CLASS,
  BOOKING_STATUS_LABELS,
  DELIVERY_STATUS_LABELS,
} from "@/types";
import { getServiceTypeLabelLocalized } from "@/lib/i18n/service-labels";
import type { ListVisibility } from "@/lib/admin/lifecycle-types";
import { filterLifecycleRows } from "@/lib/admin/query-lifecycle";
import { cn, formatDate, formatDateTimeWestern } from "@/lib/utils";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { PersonalizationSummary } from "@/components/dresses/PersonalizationSummary";
import { GiftOptionsSummary } from "@/components/dresses/GiftOptionsSummary";
import { RowLifecycleActions } from "@/components/admin/lifecycle/RowLifecycleActions";
import { UndoSnackbar } from "@/components/admin/lifecycle/UndoSnackbar";
import { VisibilityFilter } from "@/components/admin/lifecycle/VisibilityFilter";
import { postLifecycle } from "@/lib/admin/lifecycle-client";
import { ManualBookingModal } from "@/components/admin/appointments/ManualBookingModal";
import { WaitingListPanel } from "@/components/admin/appointments/WaitingListPanel";
import type { LifecycleCapabilities } from "@/lib/admin/permissions";
import { notifyAdminInboxChanged } from "@/lib/admin/inbox-events";
import {
  bookingActionForStatus,
  buildBookingQuickReply,
  type BookingAdminAction,
} from "@/lib/bookings/status-actions";

interface BookingsManagerProps {
  initialBookings: Booking[];
  initialError?: string | null;
  /** Prefill service filter (e.g. custom_design from Custom Design sidebar). */
  initialServiceFilter?: string | null;
}

const STATUS_OPTIONS = Object.entries(BOOKING_STATUS_LABELS).map(
  ([value, label]) => ({ value, label })
);

const DELIVERY_OPTIONS = Object.entries(DELIVERY_STATUS_LABELS).map(
  ([value, label]) => ({ value, label })
);

const PRIMARY_ACTIONS: BookingAdminAction[] = [
  "confirm",
  "reschedule",
  "cancel",
  "complete",
  "reply",
];

function normalizeBooking(b: Booking): Booking {
  return {
    ...b,
    delivery_required: Boolean(b.delivery_required),
    status: b.status || "pending",
  };
}

function StatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
        BOOKING_STATUS_BADGE_CLASS[status] ?? BOOKING_STATUS_BADGE_CLASS.pending
      )}
    >
      {BOOKING_STATUS_LABELS[status] ?? status}
    </span>
  );
}

type ReplyTarget = {
  booking: Booking;
  action: BookingAdminAction;
};

function bookingActionLabel(
  bu: ReturnType<typeof useLocale>["t"]["admin"]["bookingsUi"],
  action: BookingAdminAction | string
) {
  switch (action) {
    case "confirm":
      return bu.actionConfirm;
    case "reschedule":
      return bu.actionReschedule;
    case "cancel":
      return bu.actionCancel;
    case "complete":
      return bu.actionComplete;
    case "reply":
      return bu.actionReply;
    default:
      return action;
  }
}

function BookingsManagerInner({
  initialBookings,
  initialError = null,
  initialServiceFilter = null,
}: BookingsManagerProps) {
  const { t, locale } = useLocale();
  const bu = t.admin.bookingsUi;
  const searchParams = useSearchParams();
  const serviceFromUrl = searchParams.get("service") ?? initialServiceFilter;

  const [bookings, setBookings] = useState(() =>
    initialBookings.map(normalizeBooking)
  );
  const [error, setError] = useState<string | null>(initialError);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<BookingStatus | "all">("all");
  const [serviceFilter, setServiceFilter] = useState<string | "all">(
    () => serviceFromUrl || "all"
  );
  const [visibility, setVisibility] = useState<ListVisibility>("active");
  const [updating, setUpdating] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [snack, setSnack] = useState<string | null>(null);
  const [lastDeletedId, setLastDeletedId] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [caps, setCaps] = useState<LifecycleCapabilities | null>(null);

  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);
  const [replySubject, setReplySubject] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [replySending, setReplySending] = useState(false);
  const [replyError, setReplyError] = useState("");
  const [replyWarning, setReplyWarning] = useState("");
  const [replySuccess, setReplySuccess] = useState("");

  const serviceUrlKey = serviceFromUrl ?? "";
  const [prevServiceUrlKey, setPrevServiceUrlKey] = useState(serviceUrlKey);
  if (prevServiceUrlKey !== serviceUrlKey) {
    setPrevServiceUrlKey(serviceUrlKey);
    setServiceFilter(serviceFromUrl || "all");
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetch("/api/admin/me", { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => {
          if (d?.capabilities) setCaps(d.capabilities);
        })
        .catch(() => undefined);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const loadBookings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/bookings", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.error || data.message || bu.loadFailedStatus.replace('{status}', String(res.status))
        );
      }
      if (!Array.isArray(data)) {
        throw new Error(bu.invalidResponse);
      }
      setBookings(data.map((b: Booking) => normalizeBooking(b)));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : bu.loadFailed);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadBookings();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadBookings]);

  const serviceOptions = useMemo(() => {
    const seen = new Set<string>();
    for (const b of bookings) {
      if (b.service_type) seen.add(b.service_type);
    }
    if (serviceFilter !== "all") seen.add(serviceFilter);
    return Array.from(seen)
      .sort()
      .map((value) => ({
        value,
        label: getServiceTypeLabelLocalized(value, locale) || value,
      }));
  }, [bookings, serviceFilter, locale]);

  const filtered = useMemo(() => {
    const byVis = filterLifecycleRows(
      bookings as Array<
        Booking & { is_deleted?: boolean | null; archived_at?: string | null }
      >,
      visibility
    );
    const byService =
      serviceFilter === "all"
        ? byVis
        : byVis.filter((b) => b.service_type === serviceFilter);
    if (filter === "all") return byService;
    return byService.filter((b) => b.status === filter);
  }, [bookings, filter, serviceFilter, visibility]);

  const patchBooking = async (
    id: string,
    payload: {
      status?: BookingStatus;
      delivery_status?: DeliveryStatus;
      lifecycle_action?: AppointmentLifecycleAction;
    }
  ) => {
    setUpdating(id);
    try {
      const res = await fetch("/api/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? bu.updateFailed);
      await loadBookings();
      notifyAdminInboxChanged();
      if (data.warning) {
        setSnack(String(data.warning));
      } else if (data.notify?.customerNotified) {
        setSnack(`${bu.bookingUpdated}${bu.notifiedHint}`);
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : bu.genericError);
    } finally {
      setUpdating(null);
    }
  };

  /** Status change that should email/WhatsApp the customer — use action API. */
  const changeStatusWithNotify = async (
    booking: Booking,
    status: BookingStatus
  ) => {
    const action = bookingActionForStatus(status);
    if (!action) {
      await patchBooking(booking.id, { status });
      return;
    }

    const preset = buildBookingQuickReply(action, booking);
    setUpdating(booking.id);
    try {
      const res = await fetch("/api/admin/bookings/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: booking.id,
          action,
          subject: preset.subject,
          body: preset.body,
          sendEmail: true,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        warning?: string | null;
        message?: string;
        customerNotified?: boolean;
        email?: { sent?: boolean; local?: boolean };
        whatsapp?: { sent?: boolean; skippedReason?: string };
      };
      if (!res.ok) throw new Error(data.error || bu.actionFailed);

      await loadBookings();
      notifyAdminInboxChanged();

      const parts: string[] = [data.message || bu.bookingUpdated];
      if (data.customerNotified) parts.push(bu.notifiedHint.trim());
      if (data.warning) parts.push(data.warning);
      if (
        !data.customerNotified &&
        !data.email?.sent &&
        !data.whatsapp?.sent
      ) {
        parts.push(bu.notifyFailedHint);
      }
      setSnack(parts.filter(Boolean).join(" — "));
    } catch (e) {
      alert(e instanceof Error ? e.message : bu.genericError);
    } finally {
      setUpdating(null);
    }
  };

  const openAction = (booking: Booking, action: BookingAdminAction) => {
    const preset = buildBookingQuickReply(action, booking);
    setReplyTarget({ booking, action });
    setReplySubject(preset.subject);
    setReplyBody(preset.body);
    setReplyError("");
    setReplyWarning(
      !booking.email
        ? bu.noEmailHint
        : ""
    );
    setReplySuccess("");
  };

  const closeReply = () => {
    if (replySending) return;
    setReplyTarget(null);
    setReplyError("");
    setReplyWarning("");
    setReplySuccess("");
  };

  const sendAction = async () => {
    if (!replyTarget || replySending) return;
    setReplySending(true);
    setReplyError("");
    setReplySuccess("");
    try {
      const res = await fetch("/api/admin/bookings/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: replyTarget.booking.id,
          action: replyTarget.action,
          subject: replySubject,
          body: replyBody,
          sendEmail: true,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        warning?: string | null;
        message?: string;
        status?: BookingStatus;
        customerNotified?: boolean;
        inApp?: boolean;
        account?: boolean;
        last_reply_at?: string;
        last_reply_status?: string;
        last_reply_subject?: string;
        last_reply_by?: string;
        status_history?: Booking["status_history"];
      };
      if (!res.ok) {
        setReplyError(data.error || bu.actionFailed);
        return;
      }

      setBookings((prev) =>
        prev.map((b) =>
          b.id === replyTarget.booking.id
            ? {
                ...b,
                status: data.status ?? b.status,
                last_reply_at: data.last_reply_at ?? b.last_reply_at,
                last_reply_status:
                  data.last_reply_status ?? b.last_reply_status,
                last_reply_subject:
                  data.last_reply_subject ?? b.last_reply_subject,
                last_reply_by: data.last_reply_by ?? b.last_reply_by,
                status_history: data.status_history ?? b.status_history,
              }
            : b
        )
      );
      notifyAdminInboxChanged();
      const notifiedHint = data.customerNotified
        ? bu.notifiedHint
        : "";
      setReplySuccess(
        data.warning
          ? `✓ ${data.message || bu.updated}${notifiedHint}. ${data.warning}`
          : `✓ ${data.message || bu.success}${notifiedHint}`
      );
      setSnack(data.message || bu.bookingUpdated);
      window.setTimeout(() => {
        setReplyTarget(null);
        setReplySuccess("");
      }, 1400);
    } catch {
      setReplyError(bu.networkError);
    } finally {
      setReplySending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap items-end gap-4">
          <Select
            label={bu.filterStatus}
            value={filter}
            onChange={(e) => setFilter(e.target.value as BookingStatus | "all")}
            options={[{ value: "all", label: bu.all }, ...STATUS_OPTIONS]}
          />
          <Select
            label={bu.serviceType}
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
            options={[{ value: "all", label: bu.all }, ...serviceOptions]}
          />
          <div>
            <p className="mb-1.5 text-sm text-muted">{bu.visibility}</p>
            <VisibilityFilter value={visibility} onChange={setVisibility} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setManualOpen(true)}>{bu.addManual}</Button>
          <Link
            href="/admin/calendar"
            className="inline-flex items-center rounded-xl border border-beige-dark px-4 py-2 text-sm hover:bg-beige"
          >
            {bu.calendar}
          </Link>
          <Button
            variant="outline"
            size="sm"
            loading={loading}
            onClick={() => void loadBookings()}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {bu.refresh}
          </Button>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/api/admin/export?module=bookings"
            className="inline-flex items-center rounded-xl border border-beige-dark px-4 py-2 text-sm hover:bg-beige"
          >
            {bu.exportCsv}
          </a>
        </div>
      </div>

      {error ? (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-beige-dark bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-beige/50 text-muted">
              <tr>
                <th className="px-4 py-3 text-right font-medium">{bu.colCustomer}</th>
                <th className="px-4 py-3 text-right font-medium">{bu.colAppointment}</th>
                <th className="px-4 py-3 text-right font-medium">{bu.colService}</th>
                <th className="px-4 py-3 text-right font-medium">{bu.colSource}</th>
                <th className="px-4 py-3 text-right font-medium">{bu.colStatus}</th>
                <th className="px-4 py-3 text-right font-medium">{bu.colActions}</th>
              </tr>
            </thead>
            <tbody>
              {!error && filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted">
                    {loading ? bu.loading : bu.empty}
                  </td>
                </tr>
              ) : (
                filtered.map((booking) => {
                  const isOpen = expanded === booking.id;
                  return (
                    <Fragment key={booking.id}>
                      <tr className="border-t border-beige-dark">
                        <td className="px-4 py-3">
                          <p className="font-medium text-charcoal">
                            {booking.name}
                          </p>
                          <p className="text-xs text-muted" dir="ltr">
                            {booking.phone}
                          </p>
                          {booking.email ? (
                            <p className="text-xs text-muted">{booking.email}</p>
                          ) : null}
                          {booking.personalization ? (
                            <p className="mt-1 inline-flex items-center gap-1 text-xs text-gold">
                              <Sparkles className="h-3 w-3" />
                              {bu.personalizationWriting}
                            </p>
                          ) : null}
                          {booking.gift_options?.enabled ? (
                            <p className="mt-1 text-xs text-gold">{bu.giftWrap}</p>
                          ) : null}
                          {booking.is_vip ? (
                            <p className="mt-1 text-xs text-amber-700">VIP ★</p>
                          ) : null}
                          {booking.notes ? (
                            <p className="mt-1 line-clamp-2 text-xs text-muted">
                              {booking.notes}
                            </p>
                          ) : null}
                          {booking.last_reply_at ? (
                            <p className="mt-1 text-[11px] text-muted">
                              {bu.lastReply}{" "}
                              <span dir="ltr">
                                {formatDateTimeWestern(booking.last_reply_at)}
                              </span>
                            </p>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          <p>{formatDate(booking.date)}</p>
                          <p className="text-xs text-muted" dir="ltr">
                            {booking.time}
                          </p>
                          {booking.created_at ? (
                            <p className="text-xs text-muted">
                              {bu.createdAt} {formatDate(booking.created_at)}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          {getServiceTypeLabelLocalized(
                            booking.service_type,
                            locale
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {
                            BOOKING_SOURCE_LABELS[
                              (booking.booking_source ||
                                "online") as BookingSource
                            ]
                          }
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-2">
                            <StatusBadge status={booking.status} />
                            <select
                              value={booking.status}
                              disabled={updating === booking.id}
                              onChange={(e) =>
                                void changeStatusWithNotify(
                                  booking,
                                  e.target.value as BookingStatus
                                )
                              }
                              className="w-full rounded-lg border border-beige-dark bg-white px-2 py-1.5 text-xs"
                              aria-label={bu.changeStatusAria}
                            >
                              {STATUS_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex max-w-[18rem] flex-wrap gap-1.5">
                            {PRIMARY_ACTIONS.map((action) => (
                              <Button
                                key={action}
                                size="sm"
                                variant="outline"
                                disabled={updating === booking.id}
                                onClick={() => openAction(booking, action)}
                                className="text-xs"
                              >
                                {action === "reply" ? (
                                  <Mail className="h-3 w-3" />
                                ) : null}
                                {bookingActionLabel(bu, action)}
                              </Button>
                            ))}
                            <button
                              type="button"
                              onClick={() =>
                                setExpanded(isOpen ? null : booking.id)
                              }
                              className="inline-flex items-center gap-1 text-xs text-gold"
                            >
                              {bu.details}
                              {isOpen ? (
                                <ChevronUp className="h-3.5 w-3.5" />
                              ) : (
                                <ChevronDown className="h-3.5 w-3.5" />
                              )}
                            </button>
                            <RowLifecycleActions
                              module="bookings"
                              id={booking.id}
                              archived={Boolean(
                                (
                                  booking as Booking & {
                                    archived_at?: string | null;
                                  }
                                ).archived_at
                              )}
                              allowArchive={caps?.canArchive ?? false}
                              allowRestore={caps?.canRestore ?? false}
                              allowSoftDelete={caps?.canSoftDelete ?? false}
                              onChanged={(kind) => {
                                if (kind === "soft_delete") {
                                  setLastDeletedId(booking.id);
                                  setBookings((prev) =>
                                    prev.filter((b) => b.id !== booking.id)
                                  );
                                  setSnack(
                                    `${bu.movedToTrash} — تم إلغاء الموعد وإشعار العميلة`
                                  );
                                  notifyAdminInboxChanged();
                                  return;
                                }
                                setBookings((prev) =>
                                  prev.map((b) =>
                                    b.id === booking.id
                                      ? {
                                          ...b,
                                          archived_at:
                                            kind === "archive"
                                              ? new Date().toISOString()
                                              : null,
                                        }
                                      : b
                                  )
                                );
                                setSnack(
                                  kind === "archive"
                                    ? bu.archived
                                    : bu.unarchived
                                );
                              }}
                              onError={(msg) => alert(msg)}
                            />
                          </div>
                        </td>
                      </tr>
                      {isOpen ? (
                        <tr className="border-t border-beige-dark/60 bg-beige/30">
                          <td colSpan={6} className="px-4 py-4">
                            <div className="space-y-6">
                              {booking.personalization ? (
                                <PersonalizationSummary
                                  personalization={booking.personalization}
                                  title={bu.personalizationTitle}
                                  compact
                                />
                              ) : null}
                              {booking.gift_options?.enabled ? (
                                <GiftOptionsSummary
                                  giftOptions={booking.gift_options}
                                  title={bu.giftTitle}
                                />
                              ) : null}
                              {(booking.city ||
                                booking.region ||
                                booking.delivery_required) && (
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                  {booking.city ? (
                                    <div>
                                      <p className="text-xs text-muted">
                                        {bu.city}
                                      </p>
                                      <p className="font-medium">
                                        {booking.city}
                                      </p>
                                    </div>
                                  ) : null}
                                  {booking.delivery_required ? (
                                    <>
                                      <div>
                                        <p className="text-xs text-muted">
                                          {bu.region}
                                        </p>
                                        <p className="font-medium">
                                          {booking.region ||
                                            booking.delivery_region ||
                                            "—"}
                                        </p>
                                      </div>
                                      <div className="md:col-span-2">
                                        <p className="text-xs text-muted">
                                          {bu.deliveryAddress}
                                        </p>
                                        <p className="font-medium">
                                          {booking.delivery_address || "—"}
                                        </p>
                                      </div>
                                      {booking.delivery_status !==
                                      undefined ? (
                                        <div>
                                          <p className="mb-1 text-xs text-muted">
                                            {bu.deliveryStatus}
                                          </p>
                                          <select
                                            value={
                                              booking.delivery_status ??
                                              "pending"
                                            }
                                            disabled={updating === booking.id}
                                            onChange={(e) =>
                                              void patchBooking(booking.id, {
                                                delivery_status: e.target
                                                  .value as DeliveryStatus,
                                              })
                                            }
                                            className="w-full rounded-lg border border-beige-dark bg-white px-3 py-2 text-sm"
                                          >
                                            {DELIVERY_OPTIONS.map((opt) => (
                                              <option
                                                key={opt.value}
                                                value={opt.value}
                                              >
                                                {opt.label}
                                              </option>
                                            ))}
                                          </select>
                                        </div>
                                      ) : null}
                                    </>
                                  ) : null}
                                </div>
                              )}
                              {booking.notes ? (
                                <div>
                                  <p className="text-xs text-muted">{bu.notes}</p>
                                  <p className="mt-1 whitespace-pre-wrap">
                                    {booking.notes}
                                  </p>
                                </div>
                              ) : null}
                              {booking.status_history &&
                              booking.status_history.length > 0 ? (
                                <div>
                                  <p className="mb-2 text-xs text-muted">
                                    {bu.statusLog}
                                  </p>
                                  <ul className="space-y-1.5 text-xs text-charcoal">
                                    {[...booking.status_history]
                                      .slice()
                                      .reverse()
                                      .map((h, i) => (
                                        <li
                                          key={`${h.at}-${i}`}
                                          className="flex flex-wrap gap-2 rounded-lg bg-white/70 px-3 py-2"
                                        >
                                          <StatusBadge status={h.status} />
                                          <span
                                            dir="ltr"
                                            className="text-muted"
                                          >
                                            {formatDateTimeWestern(h.at)}
                                          </span>
                                          {h.by ? (
                                            <span className="text-muted">
                                              · {h.by}
                                            </span>
                                          ) : null}
                                          {h.action ? (
                                            <span className="text-muted">
                                              ·{" "}
                                              {bookingActionLabel(
                                                bu,
                                                h.action as BookingAdminAction
                                              ) ?? h.action}
                                            </span>
                                          ) : null}
                                        </li>
                                      ))}
                                  </ul>
                                </div>
                              ) : null}
                              <div className="flex flex-wrap gap-2">
                                {(
                                  [
                                    ["arrived", bu.lifecycleArrived],
                                    ["started", bu.lifecycleStarted],
                                    ["completed", bu.lifecycleCompleted],
                                    ["no_show", bu.lifecycleNoShow],
                                  ] as const
                                ).map(([action, label]) => (
                                  <Button
                                    key={action}
                                    size="sm"
                                    variant="outline"
                                    disabled={updating === booking.id}
                                    onClick={() =>
                                      void patchBooking(booking.id, {
                                        lifecycle_action: action,
                                      })
                                    }
                                  >
                                    {label}
                                  </Button>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <WaitingListPanel />

      {replyTarget ? (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-charcoal/45 p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="booking-reply-title"
        >
          <button
            type="button"
            aria-label={bu.close}
            className="absolute inset-0"
            onClick={closeReply}
            disabled={replySending}
          />
          <div className="relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-beige-dark bg-white shadow-2xl sm:rounded-3xl">
            <div className="flex items-center justify-between border-b border-beige-dark/70 px-5 py-4">
              <h2
                id="booking-reply-title"
                className="text-lg font-semibold text-charcoal"
              >
                {bookingActionLabel(bu, replyTarget.action)}
              </h2>
              <button
                type="button"
                onClick={closeReply}
                disabled={replySending}
                className="rounded-full p-2 text-muted hover:bg-beige disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4 overflow-y-auto px-5 py-5">
              <div>
                <p className="mb-1.5 text-sm text-muted">{bu.to}</p>
                <p
                  className="rounded-xl border border-beige-dark/60 bg-beige/30 px-3 py-2.5 text-sm text-charcoal"
                  dir="ltr"
                >
                  {replyTarget.booking.name}
                  {replyTarget.booking.email
                    ? ` <${replyTarget.booking.email}>`
                    : bu.noEmail}
                </p>
              </div>
              <Input
                label={bu.subject}
                value={replySubject}
                onChange={(e) => setReplySubject(e.target.value)}
                disabled={replySending}
              />
              <Textarea
                label={bu.message}
                rows={10}
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                disabled={replySending}
              />
              {replyWarning ? (
                <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
                  {replyWarning}
                </p>
              ) : null}
              {replyError ? (
                <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">
                  {replyError}
                </p>
              ) : null}
              {replySuccess ? (
                <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">
                  <Check className="me-1 inline h-3.5 w-3.5" />
                  {replySuccess}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap justify-end gap-2 border-t border-beige-dark/70 px-5 py-4">
              <Button
                variant="outline"
                onClick={closeReply}
                disabled={replySending}
              >
                {bu.cancel}
              </Button>
              <Button
                loading={replySending}
                disabled={
                  replySending ||
                  !replySubject.trim() ||
                  replyBody.trim().length < 2
                }
                onClick={() => void sendAction()}
              >
                {bu.sendAndUpdate}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <ManualBookingModal
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        onCreated={() => {
          setManualOpen(false);
          void loadBookings();
          notifyAdminInboxChanged();
        }}
      />

      <UndoSnackbar
        message={snack}
        onDismiss={() => {
          setSnack(null);
          setLastDeletedId(null);
        }}
        onUndo={
          lastDeletedId
            ? async () => {
                const id = lastDeletedId;
                setLastDeletedId(null);
                await postLifecycle({
                  action: "restore",
                  module: "bookings",
                  id,
                });
                setSnack(null);
                await loadBookings();
                notifyAdminInboxChanged();
              }
            : undefined
        }
      />
    </div>
  );
}

export function BookingsManager(props: BookingsManagerProps) {
  const { t } = useLocale();
  return (
    <Suspense fallback={<p className="text-sm text-muted">{t.admin.bookingsUi.loading}</p>}>
      <BookingsManagerInner {...props} />
    </Suspense>
  );
}
