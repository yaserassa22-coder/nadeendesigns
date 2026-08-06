"use client";

import { createContext, type Context, type ReactNode } from "react";
import type { CustomerAuthSettings, CustomerProfile } from "@/types/customer-auth";
import type { AuthProviderPublic } from "@/lib/customer-auth/providers/types";

/**
 * Auth context identity must be stable across Next/Turbopack route chunks.
 * Layout (CustomerAuthProvider) and account/header consumers can evaluate
 * the provider module twice; without a process-wide singleton they get
 * different Context objects and auth UI stops updating (logout "does nothing").
 */
const GLOBAL_KEY = "__nadeen_designs_auth_context__";

export type AuthMe = {
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
  message?: string;
};

export type AuthContextValue = {
  loading: boolean;
  user: AuthMe["user"];
  customer: CustomerProfile | null;
  settings: AuthMe["settings"] | null;
  flags: Record<string, boolean>;
  guestMode: boolean;
  guestId: string | null;
  refresh: () => Promise<void>;
  ensureGuestSession: (opts?: { forceNew?: boolean }) => Promise<string | null>;
  openLogin: (opts?: OpenLoginOptions) => void;
  closeLogin: () => void;
  continueAsGuest: () => void | Promise<void>;
  clearGuestMode: () => void;
  logout: (allDevices?: boolean) => Promise<void>;
  loginOpen: boolean;
};

type GlobalWithAuth = typeof globalThis & {
  [GLOBAL_KEY]?: Context<AuthContextValue | null>;
};

export function getAuthContext(): Context<AuthContextValue | null> {
  const g = globalThis as GlobalWithAuth;
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = createContext<AuthContextValue | null>(null);
  }
  return g[GLOBAL_KEY];
}

export const AuthContext = getAuthContext();

export type { ReactNode };
