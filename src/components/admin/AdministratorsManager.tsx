"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Copy, Eye, EyeOff, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { ConfirmDialog } from "@/components/admin/lifecycle/ConfirmDialog";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { AdministratorRow } from "@/lib/admin/administrators";
import {
  canAssignOwnerRole,
  canManageTargetAdmin,
  getRoleAccessPreview,
  isBroaderAdminRole,
  normalizeAdminRole,
  type AdminRole,
  type RoleAccessPreviewKey,
} from "@/lib/admin/permissions";
import { useLocale } from "@/components/i18n/LocaleProvider";

type Candidate = {
  auth_user_id: string;
  name: string;
  email: string;
  phone: string | null;
  already_admin: boolean;
};

type AddMode = "create" | "existing";
type AddStep = "form" | "review" | "success";

const MIN_PASSWORD = 6;

function initials(name: string, email: string) {
  const source = name.trim() || email.trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase() || "—";
}

function permLabel(
  au: ReturnType<typeof useLocale>["t"]["admin"]["administratorsUi"],
  key: RoleAccessPreviewKey
) {
  switch (key) {
    case "store":
      return au.permStore;
    case "settings":
      return au.permSettings;
    case "team":
      return au.permTeam;
    case "financial":
      return au.permFinancial;
    case "reports":
      return au.permReports;
    case "archive":
      return au.permArchive;
    case "trash":
      return au.permTrash;
    case "assignOwner":
      return au.permAssignOwner;
  }
}

function roleDescription(
  au: ReturnType<typeof useLocale>["t"]["admin"]["administratorsUi"],
  role: string
) {
  switch (role) {
    case "owner":
      return au.roleDescOwner;
    case "admin":
      return au.roleDescAdmin;
    case "manager":
      return au.roleDescManager;
    default:
      return au.roleDescStaff;
  }
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  error,
  show,
  onToggle,
  showLabel,
  hideLabel,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  show: boolean;
  onToggle: () => void;
  showLabel: string;
  hideLabel: string;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium text-charcoal">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? "text" : "password"}
          dir="ltr"
          autoComplete="new-password"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "w-full rounded-xl border border-[#e8e2d8] bg-white px-4 py-3 pe-12 text-charcoal outline-none focus:border-[#b89a6a] focus:ring-2 focus:ring-[#b89a6a]/20",
            error && "border-red-400"
          )}
        />
        <button
          type="button"
          className="absolute end-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-muted hover:bg-[#f4efe6] hover:text-charcoal"
          aria-label={show ? hideLabel : showLabel}
          onClick={onToggle}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}

function PermissionPreview({
  role,
  au,
}: {
  role: string;
  au: ReturnType<typeof useLocale>["t"]["admin"]["administratorsUi"];
}) {
  const preview = getRoleAccessPreview(normalizeAdminRole(role));
  return (
    <div className="space-y-3">
      <p className="text-[0.8125rem] font-semibold text-charcoal">
        {au.permissionsTitle}
      </p>
      {preview.isHighPrivilege ? (
        <p className="rounded-xl border border-amber-200/80 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          ⚠️ {au.highPrivilegeWarning}
        </p>
      ) : null}
      <ul className="grid gap-1.5 sm:grid-cols-2">
        {preview.items.map((item) => (
          <li
            key={item.key}
            className={cn(
              "flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm",
              item.granted ? "text-charcoal" : "text-muted"
            )}
          >
            {item.granted ? (
              <Check className="h-4 w-4 shrink-0 text-[#2f6f4e]" aria-hidden />
            ) : (
              <span className="inline-block w-4 text-center" aria-hidden>
                —
              </span>
            )}
            <span>{permLabel(au, item.key)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AdministratorsManager() {
  const { t, dir } = useLocale();
  const au = t.admin.administratorsUi;

  const ROLE_LABELS = useMemo(
    (): Record<string, string> => ({
      owner: au.roleOwner,
      admin: au.roleAdmin,
      manager: au.roleManager,
      staff: au.roleStaff,
    }),
    [au]
  );

  const ROLE_FILTER_OPTIONS = useMemo(
    () => [
      { value: "", label: au.roleFilterAll },
      { value: "owner", label: au.roleOwnerShort },
      { value: "admin", label: au.roleAdmin },
      { value: "manager", label: au.roleManager },
      { value: "staff", label: au.roleStaff },
    ],
    [au]
  );

  const PROMOTE_ROLES = useMemo(
    () =>
      [
        { value: "staff" as const, label: au.roleStaff },
        { value: "manager" as const, label: au.roleManager },
        { value: "admin" as const, label: au.roleAdmin },
        { value: "owner" as const, label: au.roleOwnerShort },
      ] as const,
    [au]
  );

  const [rows, setRows] = useState<AdministratorRow[]>([]);
  const [counts, setCounts] = useState({ total: 0, active: 0 });
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [actorRole, setActorRole] = useState<string>("admin");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [moreOpenId, setMoreOpenId] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [addMode, setAddMode] = useState<AddMode>("create");
  const [addStep, setAddStep] = useState<AddStep>("form");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [promoteRole, setPromoteRole] = useState<AdminRole>("staff");
  const [candidateQ, setCandidateQ] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(
    null
  );
  const [promoteLoading, setPromoteLoading] = useState(false);
  const [createdMember, setCreatedMember] = useState<AdministratorRow | null>(
    null
  );
  const [privilegeOpen, setPrivilegeOpen] = useState(false);

  const [demoteTarget, setDemoteTarget] = useState<AdministratorRow | null>(null);
  const [disableTarget, setDisableTarget] = useState<AdministratorRow | null>(
    null
  );
  const [enableTarget, setEnableTarget] = useState<AdministratorRow | null>(null);
  const [resetTarget, setResetTarget] = useState<AdministratorRow | null>(null);
  const [roleTarget, setRoleTarget] = useState<{
    row: AdministratorRow;
    nextRole: string;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [roleSavingId, setRoleSavingId] = useState<string | null>(null);
  const [ownerBootstrapAvailable, setOwnerBootstrapAvailable] = useState(false);
  const [bootstrapOpen, setBootstrapOpen] = useState(false);

  const canAssignOwner = canAssignOwnerRole({ id: "actor", role: actorRole });
  const roleCards = canAssignOwner
    ? PROMOTE_ROLES
    : PROMOTE_ROLES.filter((o) => o.value !== "owner");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (status) params.set("status", status);
      if (role) params.set("role", role);
      const res = await fetch(`/api/admin/administrators?${params}`, {
        cache: "no-store",
        credentials: "same-origin",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || au.loadFailed);
      setRows(Array.isArray(data.administrators) ? data.administrators : []);
      if (data.counts) {
        setCounts({
          total: Number(data.counts.total) || 0,
          active: Number(data.counts.active) || 0,
        });
      }
      if (data.actor?.role) setActorRole(String(data.actor.role));
      setOwnerBootstrapAvailable(Boolean(data.ownerBootstrap?.available));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : au.genericError);
    } finally {
      setLoading(false);
    }
  }, [q, status, role, au.loadFailed, au.genericError]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 200);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    const onPointer = (event: PointerEvent) => {
      const el = event.target as HTMLElement | null;
      if (!el?.closest("[data-admin-more]")) setMoreOpenId(null);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, []);

  useEffect(() => {
    if (!addOpen || addMode !== "existing") return;
    if (candidateQ.trim().length < 2) {
      setCandidates([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch(
            `/api/admin/administrators/candidates?q=${encodeURIComponent(candidateQ.trim())}`,
            { credentials: "same-origin", cache: "no-store" }
          );
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || au.searchFailed);
          setCandidates(Array.isArray(data.candidates) ? data.candidates : []);
        } catch (e) {
          setError(e instanceof Error ? e.message : au.searchFailed);
        }
      })();
    }, 250);
    return () => window.clearTimeout(timer);
  }, [candidateQ, addOpen, addMode, au.searchFailed]);

  const passwordError =
    confirmPassword.length > 0 && password !== confirmPassword
      ? au.passwordMismatch
      : password.length > 0 && password.length < MIN_PASSWORD
        ? au.passwordMin
        : undefined;

  const createValid =
    fullName.trim().length >= 2 &&
    email.includes("@") &&
    password.length >= MIN_PASSWORD &&
    confirmPassword.length > 0 &&
    password === confirmPassword;

  const existingValid = Boolean(selectedCandidate);
  const formValid = addMode === "create" ? createValid : existingValid;

  function resetAddForm() {
    setAddMode("create");
    setAddStep("form");
    setFullName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirm(false);
    setPromoteRole("staff");
    setCandidateQ("");
    setCandidates([]);
    setSelectedCandidate(null);
    setCreatedMember(null);
  }

  function openAdd() {
    resetAddForm();
    setAddOpen(true);
    setInfo(null);
    setError(null);
  }

  function requestReview() {
    if (!formValid) return;
    if (getRoleAccessPreview(promoteRole).isHighPrivilege) {
      setPrivilegeOpen(true);
      return;
    }
    setAddStep("review");
  }

  async function submitAdd() {
    setPromoteLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/administrators", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body:
          addMode === "create"
            ? JSON.stringify({
                mode: "create",
                full_name: fullName.trim(),
                email: email.trim(),
                password,
                role: promoteRole,
              })
            : JSON.stringify({
                auth_user_id: selectedCandidate?.auth_user_id,
                role: promoteRole,
              }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || au.genericError);
      setCreatedMember(data.administrator ?? null);
      setPassword("");
      setConfirmPassword("");
      setAddStep("success");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : au.genericError);
      setAddStep("form");
    } finally {
      setPromoteLoading(false);
    }
  }

  async function confirmDemote() {
    if (!demoteTarget) return;
    setActionLoading(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch(`/api/admin/administrators/${demoteTarget.id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || au.genericError);
      setInfo(data.message || au.removeAccess);
      setDemoteTarget(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : au.genericError);
    } finally {
      setActionLoading(false);
    }
  }

  async function confirmDisabled(disabled: boolean) {
    const row = disabled ? disableTarget : enableTarget;
    if (!row) return;
    setActionLoading(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch(`/api/admin/administrators/${row.id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: disabled ? "disable" : "enable" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || au.genericError);
      setInfo(data.message || au.refresh);
      setDisableTarget(null);
      setEnableTarget(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : au.genericError);
    } finally {
      setActionLoading(false);
    }
  }

  async function confirmReset() {
    if (!resetTarget) return;
    setActionLoading(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch(`/api/admin/administrators/${resetTarget.id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset_password" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || au.genericError);
      setInfo(data.message || au.resetSent);
      setResetTarget(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : au.genericError);
    } finally {
      setActionLoading(false);
    }
  }

  async function applyRoleChange(row: AdministratorRow, nextRole: string) {
    if (nextRole === row.role) return;
    setRoleSavingId(row.id);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch(`/api/admin/administrators/${row.id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_role", role: nextRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || au.genericError);
      setInfo(data.message || au.roleChangeTitle);
      setRoleTarget(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : au.genericError);
    } finally {
      setRoleSavingId(null);
    }
  }

  async function confirmOwnerBootstrap() {
    setActionLoading(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch("/api/admin/administrators/bootstrap-owner", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || au.genericError);
      setBootstrapOpen(false);
      setInfo(data.message || au.bootstrapSuccess);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : au.genericError);
    } finally {
      setActionLoading(false);
    }
  }

  function requestRoleChange(row: AdministratorRow, nextRole: string) {
    if (nextRole === row.role) return;
    if (isBroaderAdminRole(row.role, nextRole)) {
      setRoleTarget({ row, nextRole });
      return;
    }
    void applyRoleChange(row, nextRole);
  }

  async function copyEmail(row: AdministratorRow) {
    if (!row.email) return;
    try {
      await navigator.clipboard.writeText(row.email);
      setCopiedId(row.id);
      window.setTimeout(() => setCopiedId(null), 1600);
    } catch {
      setError(au.genericError);
    }
  }

  function canManageRow(row: AdministratorRow) {
    return canManageTargetAdmin({ id: "actor", role: actorRole }, row.role);
  }

  const reviewName =
    addMode === "create"
      ? fullName.trim()
      : selectedCandidate?.name || selectedCandidate?.email || "";
  const reviewEmail =
    addMode === "create" ? email.trim() : selectedCandidate?.email || "";

  function renderMemberActions(row: AdministratorRow) {
    const managed = canManageRow(row);
    const ownerLocked = row.role === "owner" && !canAssignOwner;
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {row.status === "active" ? (
          <Button
            variant="outline"
            className="!rounded-lg !px-3 !py-1.5 text-[0.8125rem]"
            disabled={row.is_self || ownerLocked || !managed}
            onClick={() => setDisableTarget(row)}
          >
            {au.disable}
          </Button>
        ) : (
          <Button
            variant="outline"
            className="!rounded-lg !px-3 !py-1.5 text-[0.8125rem]"
            disabled={ownerLocked || !managed}
            onClick={() => setEnableTarget(row)}
          >
            {au.enable}
          </Button>
        )}
        <div className="relative" data-admin-more>
          <button
            type="button"
            aria-label={au.moreActions}
            aria-expanded={moreOpenId === row.id}
            onClick={() =>
              setMoreOpenId((id) => (id === row.id ? null : row.id))
            }
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-[#f4efe6] hover:text-charcoal"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {moreOpenId === row.id ? (
            <div className="absolute end-0 z-20 mt-1 w-56 rounded-xl border border-[#e8e2d8] bg-white p-1 shadow-md">
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-sm hover:bg-[#faf8f5]"
                onClick={() => {
                  setMoreOpenId(null);
                  void copyEmail(row);
                }}
              >
                <Copy className="h-3.5 w-3.5 text-muted" />
                {copiedId === row.id ? au.copied : au.copyEmail}
              </button>
              <button
                type="button"
                disabled={!managed}
                className="flex w-full items-center rounded-lg px-3 py-2 text-start text-sm hover:bg-[#faf8f5] disabled:opacity-50"
                onClick={() => {
                  setMoreOpenId(null);
                  setResetTarget(row);
                }}
              >
                {au.resetPassword}
              </button>
              <button
                type="button"
                disabled={row.is_self || ownerLocked || !managed}
                className="flex w-full items-center rounded-lg px-3 py-2 text-start text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
                onClick={() => {
                  setMoreOpenId(null);
                  setDemoteTarget(row);
                }}
              >
                {au.removeAccess}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={dir}>
      <div className="max-w-3xl">
        <p className="text-sm text-muted">
          {au.crumbSettings} ← {au.pageTitle}
        </p>
        <h1 className="mt-1.5 text-[1.65rem] font-semibold tracking-tight text-charcoal md:text-[1.85rem]">
          {au.pageTitle}
        </h1>
        <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-muted">
          {au.pageSubtitle}
        </p>
      </div>

      {ownerBootstrapAvailable ? (
        <div className="admin-surface max-w-3xl border border-[#b89a6a]/35 px-4 py-4">
          <p className="text-sm font-semibold tracking-tight text-charcoal">
            {au.bootstrapTitle}
          </p>
          <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-muted">
            {au.bootstrapBody}
          </p>
          <div className="mt-3">
            <Button
              className="!rounded-xl"
              onClick={() => setBootstrapOpen(true)}
            >
              {au.bootstrapCta}
            </Button>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:max-w-xl">
        <div className="admin-surface px-4 py-3.5">
          <p className="text-[0.8125rem] text-muted">{au.summaryTotal}</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-charcoal">
            {counts.total}
          </p>
        </div>
        <div className="admin-surface px-4 py-3.5">
          <p className="text-[0.8125rem] text-muted">{au.summaryActive}</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-charcoal">
            {counts.active}
          </p>
        </div>
      </div>

      <div className="admin-surface flex flex-col gap-4 px-4 py-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid flex-1 gap-4 sm:grid-cols-3">
          <Input
            label={au.searchLabel}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={au.searchPlaceholder}
          />
          <Select
            label={au.statusLabel}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={[
              { value: "all", label: au.statusAll },
              { value: "active", label: au.statusActive },
              { value: "disabled", label: au.statusDisabled },
            ]}
          />
          <Select
            label={au.roleFilterLabel}
            value={role}
            onChange={(e) => setRole(e.target.value)}
            options={ROLE_FILTER_OPTIONS}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            loading={loading}
            onClick={() => void load()}
            className="!rounded-xl"
          >
            {au.refresh}
          </Button>
          <Button onClick={openAdd} className="!rounded-xl">
            {au.addMember}
          </Button>
        </div>
      </div>

      {error ? (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>
      ) : null}
      {info ? (
        <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
          {info}
        </p>
      ) : null}

      <div className="space-y-3 md:hidden">
        {rows.length === 0 && !loading ? (
          <p className="admin-surface px-4 py-8 text-center text-muted">
            {au.empty}
          </p>
        ) : (
          rows.map((row) => (
            <article key={row.id} className="admin-surface p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f4efe6] text-sm font-semibold text-[#8a7048]">
                  {initials(row.name, row.email)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-charcoal">
                    {row.name}
                    {row.is_self ? (
                      <span className="ms-2 text-xs text-muted">({au.you})</span>
                    ) : null}
                    {row.role === "owner" ? (
                      <span className="ms-2 rounded-full bg-[#f4efe6] px-2 py-0.5 text-[11px] text-[#8a7048]">
                        {au.ownerBadge}
                      </span>
                    ) : null}
                  </p>
                  <p className="truncate text-sm text-muted" dir="ltr">
                    {row.email}
                  </p>
                  <p className="mt-2">
                    <select
                      className="w-full rounded-lg border border-[#e8e2d8] bg-white px-2 py-1.5 text-sm outline-none focus:border-[#b89a6a]"
                      value={row.role}
                      disabled={
                        roleSavingId === row.id ||
                        (row.role === "owner" && !canAssignOwner) ||
                        !canManageRow(row)
                      }
                      onChange={(e) => requestRoleChange(row, e.target.value)}
                      aria-label={`${au.roleFilterLabel} ${row.name}`}
                    >
                      {roleCards.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                      {row.role === "owner" && !canAssignOwner ? (
                        <option value="owner">{ROLE_LABELS.owner}</option>
                      ) : null}
                    </select>
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {row.status === "active" ? au.statusActive : au.statusDisabled}
                    {row.last_login_at
                      ? ` · ${au.lastLogin} ${formatDate(row.last_login_at)}`
                      : ""}
                  </p>
                </div>
              </div>
                <div className="mt-3">
                  {renderMemberActions(row)}
                </div>
            </article>
          ))
        )}
      </div>

      <div className="admin-surface hidden overflow-hidden md:block">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr>
                <th>{au.fullName}</th>
                <th>{au.email}</th>
                <th>{au.roleFilterLabel}</th>
                <th>{au.statusLabel}</th>
                <th>{au.lastLogin}</th>
                <th>{au.createdAt}</th>
                <th>{au.moreActions}</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && !loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted">
                    {au.empty}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f4efe6] text-xs font-semibold text-[#8a7048]">
                          {initials(row.name, row.email)}
                        </div>
                        <div>
                          <p className="font-medium text-charcoal">
                            {row.name}
                            {row.is_self ? (
                              <span className="ms-2 text-xs text-muted">
                                ({au.you})
                              </span>
                            ) : null}
                          </p>
                          {row.role === "owner" ? (
                            <p className="text-[11px] text-[#8a7048]">
                              {au.ownerBadge}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span dir="ltr">{row.email}</span>
                    </td>
                    <td className="min-w-[10rem]">
                      <select
                        className="w-full rounded-lg border border-[#e8e2d8] bg-white px-2 py-1.5 text-sm outline-none focus:border-[#b89a6a]"
                        value={row.role}
                        disabled={
                          roleSavingId === row.id ||
                          (row.role === "owner" && !canAssignOwner) ||
                          !canManageRow(row)
                        }
                        onChange={(e) =>
                          requestRoleChange(row, e.target.value)
                        }
                        aria-label={`${au.roleFilterLabel} ${row.name}`}
                      >
                        {roleCards.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                        {row.role === "owner" && !canAssignOwner ? (
                          <option value="owner">{ROLE_LABELS.owner}</option>
                        ) : null}
                      </select>
                    </td>
                    <td>
                      {row.status === "active" ? (
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[0.8125rem] text-emerald-800">
                          {au.statusActive}
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[0.8125rem] text-amber-800">
                          {au.statusDisabled}
                        </span>
                      )}
                    </td>
                    <td className="text-muted">
                      {row.last_login_at ? formatDate(row.last_login_at) : "—"}
                    </td>
                    <td className="text-muted">
                      {row.created_at ? formatDate(row.created_at) : "—"}
                    </td>
                    <td>
                      {renderMemberActions(row)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {addOpen ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center p-0 sm:items-center sm:p-4">
          <button
            type="button"
            className="absolute inset-0 bg-charcoal/40"
            aria-label={au.close}
            onClick={() => setAddOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-staff-title"
            className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-[#e8e2d8] bg-white p-5 shadow-md sm:rounded-2xl sm:p-6"
          >
            <h2 id="add-staff-title" className="text-lg font-semibold text-charcoal">
              {addStep === "success" ? au.successTitle : au.addTitle}
            </h2>

            {addStep === "form" ? (
              <div className="mt-4 space-y-5">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAddMode("create")}
                    className={cn(
                      "rounded-xl border px-3 py-3 text-start text-sm",
                      addMode === "create"
                        ? "border-[#b89a6a] bg-[#f4efe6] text-charcoal"
                        : "border-[#e8e2d8] text-muted hover:bg-[#faf8f5]"
                    )}
                  >
                    {au.addNewStaff}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddMode("existing")}
                    className={cn(
                      "rounded-xl border px-3 py-3 text-start text-sm",
                      addMode === "existing"
                        ? "border-[#b89a6a] bg-[#f4efe6] text-charcoal"
                        : "border-[#e8e2d8] text-muted hover:bg-[#faf8f5]"
                    )}
                  >
                    {au.addExistingAccount}
                  </button>
                </div>

                {addMode === "create" ? (
                  <>
                    <Input
                      label={au.fullName}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                    <Input
                      label={au.email}
                      type="email"
                      dir="ltr"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                    <PasswordField
                      id="staff-password"
                      label={au.newPassword}
                      value={password}
                      onChange={setPassword}
                      show={showPassword}
                      onToggle={() => setShowPassword((v) => !v)}
                      showLabel={au.showPassword}
                      hideLabel={au.hidePassword}
                      error={
                        password.length > 0 && password.length < MIN_PASSWORD
                          ? au.passwordMin
                          : undefined
                      }
                    />
                    <PasswordField
                      id="staff-password-confirm"
                      label={au.confirmPassword}
                      value={confirmPassword}
                      onChange={setConfirmPassword}
                      show={showConfirm}
                      onToggle={() => setShowConfirm((v) => !v)}
                      showLabel={au.showPassword}
                      hideLabel={au.hidePassword}
                      error={passwordError}
                    />
                  </>
                ) : (
                  <>
                    <Input
                      label={au.existingSearchLabel}
                      value={candidateQ}
                      onChange={(e) => {
                        setCandidateQ(e.target.value);
                        setSelectedCandidate(null);
                      }}
                      placeholder={au.existingSearchHint}
                    />
                    <div className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-[#e8e2d8] p-2">
                      {candidates.length === 0 ? (
                        <p className="p-2 text-xs text-muted">{au.existingEmpty}</p>
                      ) : (
                        candidates.map((c) => (
                          <button
                            key={c.auth_user_id}
                            type="button"
                            onClick={() => setSelectedCandidate(c)}
                            className={cn(
                              "block w-full rounded-lg px-3 py-2 text-start text-sm",
                              selectedCandidate?.auth_user_id === c.auth_user_id
                                ? "bg-[#f4efe6] text-charcoal"
                                : "hover:bg-[#faf8f5]"
                            )}
                          >
                            <span className="font-medium">
                              {c.name || c.email || "—"}
                            </span>
                            <span className="ms-2 text-xs text-muted" dir="ltr">
                              {c.email}
                            </span>
                            {c.already_admin ? (
                              <span className="ms-2 text-xs text-amber-700">
                                {au.alreadyAdmin}
                              </span>
                            ) : null}
                          </button>
                        ))
                      )}
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <p className="text-sm font-medium text-charcoal">
                    {au.roleFilterLabel}
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {roleCards.map((card) => (
                      <button
                        key={card.value}
                        type="button"
                        onClick={() => setPromoteRole(card.value)}
                        className={cn(
                          "rounded-xl border px-3 py-3 text-start",
                          promoteRole === card.value
                            ? "border-[#b89a6a] bg-[#f4efe6]"
                            : "border-[#e8e2d8] hover:bg-[#faf8f5]"
                        )}
                      >
                        <p className="text-sm font-semibold text-charcoal">
                          {card.label}
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-muted">
                          {roleDescription(au, card.value)}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                <PermissionPreview role={promoteRole} au={au} />

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    className="!rounded-xl"
                    onClick={() => setAddOpen(false)}
                  >
                    {au.cancel}
                  </Button>
                  <Button
                    className="!rounded-xl"
                    disabled={!formValid}
                    onClick={requestReview}
                  >
                    {au.continueReview}
                  </Button>
                </div>
              </div>
            ) : null}

            {addStep === "review" ? (
              <div className="mt-4 space-y-4">
                <div className="admin-surface p-4">
                  <p className="text-xs text-muted">{au.reviewMember}</p>
                  <p className="mt-1 font-medium text-charcoal">{reviewName}</p>
                  <p className="text-sm text-muted" dir="ltr">
                    {reviewEmail}
                  </p>
                  <p className="mt-3 text-xs text-muted">{au.reviewRole}</p>
                  <p className="mt-1 font-medium text-charcoal">
                    {ROLE_LABELS[promoteRole]}
                  </p>
                </div>
                <PermissionPreview role={promoteRole} au={au} />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    className="!rounded-xl"
                    onClick={() => setAddStep("form")}
                    disabled={promoteLoading}
                  >
                    {au.cancel}
                  </Button>
                  <Button
                    className="!rounded-xl"
                    loading={promoteLoading}
                    disabled={!formValid}
                    onClick={() => void submitAdd()}
                  >
                    {au.addToTeam}
                  </Button>
                </div>
              </div>
            ) : null}

            {addStep === "success" && createdMember ? (
              <div className="mt-4 space-y-4">
                <div className="admin-surface p-4">
                  <p className="font-medium text-charcoal">{createdMember.name}</p>
                  <p className="text-sm text-muted" dir="ltr">
                    {createdMember.email}
                  </p>
                  <p className="mt-2 text-sm">
                    {ROLE_LABELS[createdMember.role]} ·{" "}
                    {createdMember.status === "active"
                      ? au.statusActive
                      : au.statusDisabled}
                  </p>
                </div>
                <div className="flex justify-end">
                  <Button
                    className="!rounded-xl"
                    onClick={() => {
                      setAddOpen(false);
                      resetAddForm();
                    }}
                  >
                    {au.close}
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={privilegeOpen}
        title={au.highPrivilegeWarning}
        description={au.roleChangeDesc}
        confirmLabel={au.confirmGrant}
        cancelLabel={au.cancel}
        onConfirm={() => {
          setPrivilegeOpen(false);
          setAddStep("review");
        }}
        onCancel={() => setPrivilegeOpen(false)}
      />

      <ConfirmDialog
        open={Boolean(disableTarget)}
        title={au.disableTitle}
        description={
          disableTarget
            ? `${au.disableDesc}${disableTarget.role === "owner" ? ` ${au.ownerProtected}` : ""}`
            : undefined
        }
        confirmLabel={au.disable}
        danger
        loading={actionLoading}
        onConfirm={() => void confirmDisabled(true)}
        onCancel={() => setDisableTarget(null)}
      />

      <ConfirmDialog
        open={Boolean(enableTarget)}
        title={au.enableTitle}
        description={au.enableDesc}
        confirmLabel={au.enable}
        loading={actionLoading}
        onConfirm={() => void confirmDisabled(false)}
        onCancel={() => setEnableTarget(null)}
      />

      <ConfirmDialog
        open={Boolean(demoteTarget)}
        title={au.demoteTitle}
        description={
          demoteTarget
            ? `${au.demoteDesc}${demoteTarget.role === "owner" ? ` ${au.ownerProtected}` : ""}`
            : undefined
        }
        confirmLabel={au.demoteConfirm}
        danger
        loading={actionLoading}
        onConfirm={() => void confirmDemote()}
        onCancel={() => setDemoteTarget(null)}
      />

      <ConfirmDialog
        open={Boolean(resetTarget)}
        title={au.resetTitle}
        description={au.resetDesc}
        confirmLabel={au.resetConfirm}
        loading={actionLoading}
        onConfirm={() => void confirmReset()}
        onCancel={() => setResetTarget(null)}
      />

      <ConfirmDialog
        open={Boolean(roleTarget)}
        title={au.roleChangeTitle}
        description={
          roleTarget
            ? `${au.roleChangeDesc}\n${au.currentRole}: ${ROLE_LABELS[roleTarget.row.role]}\n${au.newRole}: ${ROLE_LABELS[roleTarget.nextRole]}`
            : undefined
        }
        confirmLabel={au.confirmGrant}
        loading={Boolean(roleSavingId)}
        onConfirm={() => {
          if (roleTarget) void applyRoleChange(roleTarget.row, roleTarget.nextRole);
        }}
        onCancel={() => setRoleTarget(null)}
      />

      <ConfirmDialog
        open={bootstrapOpen}
        title={au.bootstrapConfirmTitle}
        description={au.bootstrapConfirmDesc}
        confirmLabel={au.bootstrapConfirm}
        loading={actionLoading}
        onConfirm={() => void confirmOwnerBootstrap()}
        onCancel={() => setBootstrapOpen(false)}
      />
    </div>
  );
}
