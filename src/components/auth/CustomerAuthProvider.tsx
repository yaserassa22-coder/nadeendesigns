"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { CustomerAuthSettings, CustomerProfile } from "@/types/customer-auth";
import type { AuthProviderPublic } from "@/lib/customer-auth/providers/types";
import { LoginModal } from "@/components/auth/LoginModal";

const GUEST_MODE_KEY = "nadeen_guest_mode";

type AuthMe = {
  user: { id: string; email?: string | null; phone?: string | null } | null;
  customer: CustomerProfile | null;
  is_admin?: boolean;
  settings: CustomerAuthSettings & {
    google_ready?: boolean;
    apple_ready?: boolean;
    otp_ready?: boolean;
    email_ready?: boolean;
    providers?: AuthProviderPublic[];
  };
  flags?: Record<string, boolean>;
};

export type OpenLoginOptions = {
  redirect?: string;
  /** Contextual message shown in the auth modal */
  message?: string;
};

type AuthContextValue = {
  loading: boolean;
  user: AuthMe["user"];
  customer: CustomerProfile | null;
  settings: AuthMe["settings"] | null;
  flags: Record<string, boolean>;
  /** Explicit guest browsing/checkout mode (no forced login) */
  guestMode: boolean;
  guestId: string | null;
  refresh: () => Promise<void>;
  ensureGuestSession: (opts?: { forceNew?: boolean }) => Promise<string | null>;
  openLogin: (opts?: OpenLoginOptions) => void;
  closeLogin: () => void;
  continueAsGuest: () => void;
  clearGuestMode: () => void;
  logout: (allDevices?: boolean) => Promise<void>;
  loginOpen: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

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
        const res = await fetch("/api/guest/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            language: "ar",
            force_new: Boolean(opts?.forceNew),
          }),
        });
        const data = (await res.json()) as { guest_id?: string };
        if (data.guest_id) {
          setGuestId(data.guest_id);
          return data.guest_id;
        }
      } catch {
        /* non-fatal */
      }
      return null;
    },
    []
  );

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const data = (await res.json()) as AuthMe;
      setMe(data);
      if (data.user || data.customer) {
        writeGuestMode(false);
        setGuestMode(false);
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
        await ensureGuestSession();
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
      params.delete("login");
      params.delete("error");
      const clean = `${window.location.pathname}${params.toString() ? `?${params}` : ""}`;
      window.history.replaceState({}, "", clean);
    }
    if (sessionStorage.getItem("nadeen_open_login") !== "1") return;

    const redirect =
      sessionStorage.getItem("nadeen_login_redirect") || undefined;
    setRedirectAfter(redirect);
    setLoginOpen(true);

    const clear = window.setTimeout(() => {
      sessionStorage.removeItem("nadeen_open_login");
      sessionStorage.removeItem("nadeen_login_redirect");
    }, 300);
    return () => window.clearTimeout(clear);
  }, []);

  const openLogin = useCallback((opts?: OpenLoginOptions) => {
    setRedirectAfter(opts?.redirect);
    setLoginMessage(opts?.message);
    setLoginOpen(true);
  }, []);

  const continueAsGuest = useCallback(() => {
    writeGuestMode(true);
    setGuestMode(true);
    setLoginMessage(undefined);
    setLoginOpen(false);
    void ensureGuestSession();
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
      await fetch(`/api/auth/logout${allDevices ? "?all=1" : ""}`, {
        method: "POST",
        credentials: "same-origin",
      });
      writeGuestMode(true);
      setGuestMode(true);
      // New guest session so shopping continues after registered logout
      await ensureGuestSession({ forceNew: true });
      await refresh();
      if (typeof window !== "undefined" && window.location.pathname.startsWith("/account")) {
        window.location.href = "/";
      }
    },
    [refresh, ensureGuestSession]
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
          // Pull guest cart into localStorage before navigating
          try {
            const cartRes = await fetch("/api/guest/cart?take=1", {
              credentials: "same-origin",
            });
            const cartData = (await cartRes.json()) as { items?: unknown[] };
            if (Array.isArray(cartData.items) && cartData.items.length) {
              const key = "nadeen_shop_cart";
              const existing = JSON.parse(
                window.localStorage.getItem(key) || "[]"
              ) as unknown[];
              const merged = [...cartData.items, ...existing].slice(0, 50);
              window.localStorage.setItem(key, JSON.stringify(merged));
            }
          } catch {
            /* ignore */
          }
          await refresh();
          setLoginOpen(false);
          const next = redirectAfter || "/account";
          window.location.href = next;
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
