"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/auth";
import api, { tokenStore } from "@/lib/api";

// Called once on app mount
// Attempts to restore session using httpOnly cookie
export function useAuthInit(): { isLoading: boolean } {
  const { setAuth, clearAuth, isLoading } = useAuthStore();

  useEffect(() => {
    async function restoreSession() {
      try {
        // Use the same-origin proxy so the httpOnly refresh cookie is sent.
        const response = await fetch("/api/auth/refresh", { method: "POST" });
        if (!response.ok) throw new Error("refresh_failed");
        const { data } = (await response.json()) as {
          data: { accessToken: string };
        };
        tokenStore.set(data.accessToken);
        const meResponse = await api.get("/auth/me");
        setAuth(meResponse.data.data, data.accessToken);
        document.cookie =
          "auth_session=1; path=/; max-age=604800; SameSite=Lax";
      } catch {
        clearAuth();
      }
    }

    void restoreSession();
  }, [setAuth, clearAuth]);

  return { isLoading };
}
