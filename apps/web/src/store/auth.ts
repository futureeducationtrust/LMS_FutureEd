import { create } from "zustand";
import { tokenStore } from "@/lib/api";
import api from "@/lib/api";
import type { Role } from "@lms/types";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  branchId: string;
  branch?: { name: string; city?: string };
};

type AuthState = {
  user: AuthUser | null;
  isLoading: boolean;
  isBootstrapped: boolean;
  isBootstrapping: boolean;
  isAuthenticated: boolean;

  setAuth: (user: AuthUser, accessToken: string) => void;
  clearAuth: () => void;
  bootstrap: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: false,
  isBootstrapped: false,
  isBootstrapping: false,
  isAuthenticated: false,

  setAuth: (user, accessToken) => {
    tokenStore.set(accessToken);
    set({ user, isLoading: false, isAuthenticated: true });
  },

  clearAuth: () => {
    tokenStore.clear();
    if (typeof document !== "undefined") {
      document.cookie = "auth_session=; path=/; max-age=0; SameSite=Lax";
    }
    set({ user: null, isLoading: false, isAuthenticated: false });
  },

  bootstrap: async () => {
    if (get().isBootstrapped || get().isBootstrapping) return;
    set({ isLoading: true, isBootstrapping: true });
    let refreshStatus: number | undefined;
    try {
      // Call the same-origin Next.js proxy so iOS Safari's ITP never blocks the cookie.
      // The root layout starts this request from an inline <head> script so it
      // overlaps the JS download; reuse that response when it exists (once).
      const early = (window as Window & { __earlyRefresh?: Promise<Response | null> }).__earlyRefresh;
      delete (window as Window & { __earlyRefresh?: Promise<Response | null> }).__earlyRefresh;
      const refreshRes = (early ? await early : null) ?? (await fetch("/api/auth/refresh", { method: "POST" }));
      refreshStatus = refreshRes.status;
      if (!refreshRes.ok) throw new Error("refresh_failed");
      const refreshData = await refreshRes.json() as { data: { accessToken: string; user?: AuthUser } };
      tokenStore.set(refreshData.data.accessToken);

      // The refresh response carries the user (same shape as /auth/me), so
      // cold load is one round trip, not two. Older API builds omit it —
      // fall back to /auth/me then.
      const user = refreshData.data.user ?? (await api.get("/auth/me")).data.data;
      set({
        user,
        isLoading: false,
        isBootstrapped: true,
        isBootstrapping: false,
        isAuthenticated: true,
      });
    } catch {
      // Only an explicit authentication failure means the session is gone.
      // A 429 must not sign a user out.
      if (refreshStatus === 401) {
        get().clearAuth();
        set({ isBootstrapped: true, isBootstrapping: false });
        return;
      }

      // Retain the session and retry transient failures (including 429)
      // without redirecting the user to the login page.
      set({ isLoading: true, isBootstrapping: false });
      window.setTimeout(() => void get().bootstrap(), 5_000);
    }
  },
}));
