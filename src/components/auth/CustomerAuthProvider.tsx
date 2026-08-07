"use client";

import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { LoginModal } from "@/components/auth/LoginModal";
import {
  AuthContext,
  type AuthContextValue,
  type AuthMe,
  type OpenLoginOptions,
} from "@/components/auth/auth-context";
import { sanitizeGuestCartItems } from "@/lib/guest/cart-items";
import { mergeCartLines } from "@/lib/shop/cart-lines";

const GUEST_MODE_KEY = "nadeen_guest_mode";
const FETCH_TIMEOUT_MS = 12_000;

function readGuestMode(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(GUEST_MODE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeGuestMode(value: boolean) {
  if (typeof window === "undefined") return;
  try {
    if (value) window.localStorage.setItem(GUEST_MODE_KEY, "1");
    else window.localStorage.removeItem(GUEST_MODE_KEY);
  } catch {
    /* ignore */
  }
}

async function fetchJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs = FETCH_TIMEOUT_MS
): Promise<{ ok: boolean; status: number; data: T | null }> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(input, {
      ...init,
      signal: controller.signal,
      credentials: init?.credentials ?? "same-origin",
    });
    const data = (await res.json().catch(() => null)) as T | null;
    return { ok: res.ok, status: res.status, data };
  } finally {
    window.clearTimeout(timer);
  }
}

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<AuthMe | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [redirectAfter, setRedirectAfter] = useState<string | undefined>();
  const [loginMessage, setLoginMessage] = useState<string | undefined>();
  const [guestMode, setGuestMode] = useState(false);
  const [guestId, setGuestId] = useState<string | null>(null);

  const ensureGuestSession = useCallback(
    async (opts?: { forceNew?: boolean }) => {
      try {
        const { ok, data } = await fetchJson<{ guest_id?: string }>(
          "/api/guest/session",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              language: "ar",
              force_new: Boolean(opts?.forceNew),
            }),
          }
        );
        if (ok && data?.guest_id) {
          setGuestId(data.guest_id);
          return data.guest_id;
        }
      } catch {
        /* non-fatal — browsing can continue without a persisted guest row */
      }
      return null;
    },
    []
  );

  const refresh = useCallback(async () => {
    try {
      const { ok, data } = await fetchJson<AuthMe>("/api/auth/me", {
        cache: "no-store",
      });
      if (ok && data) {
        setMe(data);
        if (data.user || data.customer) {
          writeGuestMode(false);
          setGuestMode(false);
        }
      } else {
        setMe(null);
      }
    } catch {
      setMe(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setGuestMode(readGuestMode());
      void (async () => {
        await refresh();
        // Always ensure guest cookie on first visit (even if later logging in)
        void ensureGuestSession();
      })();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh, ensureGuestSession]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("login") === "1") {
      // Persist across React Strict Mode remount (replaceState alone loses the intent).
      sessionStorage.setItem("nadeen_open_login", "1");
      const redirect = params.get("redirect") || "";
      if (redirect) sessionStorage.setItem("nadeen_login_redirect", redirect);
      else sessionStorage.removeItem("nadeen_login_redirect");
      const err = params.get("error");
      if (err) sessionStorage.setItem("nadeen_login_error", err);
      else sessionStorage.removeItem("nadeen_login_error");
      params.delete("login");
      params.delete("error");
      const clean = `${window.location.pathname}${params.toString() ? `?${params}` : ""}`;
      window.history.replaceState({}, "", clean);
    }
    if (sessionStorage.getItem("nadeen_open_login") !== "1") return;

    const redirect =
      sessionStorage.getItem("nadeen_login_redirect") || undefined;
    const errMsg = sessionStorage.getItem("nadeen_login_error") || undefined;
    setRedirectAfter(redirect);
    if (errMsg) setLoginMessage(decodeURIComponent(errMsg));
    setLoginOpen(true);

    const clear = window.setTimeout(() => {
      sessionStorage.removeItem("nadeen_open_login");
      sessionStorage.removeItem("nadeen_login_redirect");
      sessionStorage.removeItem("nadeen_login_error");
    }, 300);
    return () => window.clearTimeout(clear);
  }, []);

  const openLogin = useCallback((opts?: OpenLoginOptions) => {
    setRedirectAfter(opts?.redirect);
    setLoginMessage(opts?.message);
    setLoginOpen(true);
  }, []);

  const continueAsGuest = useCallback(async () => {
    // Complete immediately — never block the modal on guest API latency.
    writeGuestMode(true);
    setGuestMode(true);
    setLoginMessage(undefined);
    setLoginOpen(false);
    void ensureGuestSession().then((id) => {
      if (!id && process.env.NODE_ENV !== "production") {
        console.warn("[auth] guest session missing after continueAsGuest");
      }
    });
  }, [ensureGuestSession]);

  const clearGuestMode = useCallback(() => {
    writeGuestMode(false);
    setGuestMode(false);
  }, []);

  const closeLogin = useCallback(() => {
    writeGuestMode(true);
    setGuestMode(true);
    setLoginMessage(undefined);
    setLoginOpen(false);
    void ensureGuestSession();
  }, [ensureGuestSession]);

  const logout = useCallback(
    async (allDevices = false) => {
      // Optimistic UI — never wait forever for logout network.
      writeGuestMode(true);
      setGuestMode(true);
      setMe(null);
      setLoginOpen(false);
      setLoading(false);

      try {
        await fetchJson(`/api/auth/logout${allDevices ? "?all=1" : ""}`, {
          method: "POST",
        });
      } catch {
        /* still leave as logged out locally */
      }

      void ensureGuestSession({ forceNew: true });

      if (typeof window !== "undefined") {
        window.location.assign("/");
      }
    },
    [ensureGuestSession]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      user: me?.user ?? null,
      customer: me?.customer ?? null,
      settings: me?.settings ?? null,
      flags: me?.flags ?? {},
      guestMode,
      guestId,
      refresh,
      ensureGuestSession,
      openLogin,
      closeLogin,
      continueAsGuest,
      clearGuestMode,
      logout,
      loginOpen,
    }),
    [
      loading,
      me,
      guestMode,
      guestId,
      refresh,
      ensureGuestSession,
      openLogin,
      closeLogin,
      continueAsGuest,
      clearGuestMode,
      logout,
      loginOpen,
    ]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      <LoginModal
        open={loginOpen}
        onClose={closeLogin}
        onContinueAsGuest={continueAsGuest}
        message={loginMessage}
        onSuccess={async () => {
          writeGuestMode(false);
          setGuestMode(false);
          setLoginMessage(undefined);
          // Pull guest cart into localStorage before navigating (non-blocking cap)
          try {
            const { ok, data } = await fetchJson<{ items?: unknown[] }>(
              "/api/guest/cart?take=1",
              {},
              5_000
            );
            if (ok && Array.isArray(data?.items) && data.items.length) {
              const key = "nadeen_shop_cart";
              let existingRaw: unknown[] = [];
              try {
                const parsed = JSON.parse(
                  window.localStorage.getItem(key) || "[]"
                ) as unknown;
                if (Array.isArray(parsed)) existingRaw = parsed;
              } catch {
                existingRaw = [];
              }
              // Root-cause: blind concat duplicated synced guest lines (same line_id).
              const merged = mergeCartLines(
                sanitizeGuestCartItems(existingRaw),
                sanitizeGuestCartItems(data.items)
              );
              window.localStorage.setItem(key, JSON.stringify(merged));
            }
          } catch {
            /* ignore */
          }
          await refresh();
          setLoginOpen(false);
          const next = redirectAfter || "/account";
          window.location.assign(next);
        }}
        settings={me?.settings ?? null}
        flags={me?.flags ?? {}}
      />
    </AuthContext.Provider>
  );
}

export function useCustomerAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useCustomerAuth must be used within CustomerAuthProvider");
  }
  return ctx;
}

export type { OpenLoginOptions };
