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
import { LoginModal } from "@/components/auth/LoginModal";

type AuthMe = {
  user: { id: string; email?: string | null; phone?: string | null } | null;
  customer: CustomerProfile | null;
  is_admin?: boolean;
  settings: CustomerAuthSettings & {
    google_ready?: boolean;
    apple_ready?: boolean;
    otp_ready?: boolean;
    email_ready?: boolean;
  };
  flags?: Record<string, boolean>;
};

type AuthContextValue = {
  loading: boolean;
  user: AuthMe["user"];
  customer: CustomerProfile | null;
  settings: AuthMe["settings"] | null;
  flags: Record<string, boolean>;
  refresh: () => Promise<void>;
  openLogin: (opts?: { redirect?: string }) => void;
  closeLogin: () => void;
  logout: (allDevices?: boolean) => Promise<void>;
  loginOpen: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<AuthMe | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [redirectAfter, setRedirectAfter] = useState<string | undefined>();

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const data = (await res.json()) as AuthMe;
      setMe(data);
    } catch {
      setMe(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refresh();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("login") !== "1") return;
    const redirect = params.get("redirect") || undefined;
    params.delete("login");
    params.delete("error");
    const clean = `${window.location.pathname}${params.toString() ? `?${params}` : ""}`;
    window.history.replaceState({}, "", clean);
    const timer = window.setTimeout(() => {
      setRedirectAfter(redirect);
      setLoginOpen(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const openLogin = useCallback((opts?: { redirect?: string }) => {
    setRedirectAfter(opts?.redirect);
    setLoginOpen(true);
  }, []);

  const closeLogin = useCallback(() => setLoginOpen(false), []);

  const logout = useCallback(
    async (allDevices = false) => {
      await fetch(`/api/auth/logout${allDevices ? "?all=1" : ""}`, {
        method: "POST",
      });
      await refresh();
      if (typeof window !== "undefined" && window.location.pathname.startsWith("/account")) {
        window.location.href = "/";
      }
    },
    [refresh]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      user: me?.user ?? null,
      customer: me?.customer ?? null,
      settings: me?.settings ?? null,
      flags: me?.flags ?? {},
      refresh,
      openLogin,
      closeLogin,
      logout,
      loginOpen,
    }),
    [loading, me, refresh, openLogin, closeLogin, logout, loginOpen]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      <LoginModal
        open={loginOpen}
        onClose={closeLogin}
        onSuccess={async () => {
          await refresh();
          setLoginOpen(false);
          if (redirectAfter) {
            window.location.href = redirectAfter;
          }
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
