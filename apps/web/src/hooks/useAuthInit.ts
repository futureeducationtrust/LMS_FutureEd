"use client";

import { useEffect } from "react";
import type { Role } from "@lms/types";
import { useAuthStore } from "@/store/auth";
import api from "@/lib/api";

// Called once on app mount
// Attempts to restore session using httpOnly cookie
export function useAuthInit(): { isLoading: boolean } {
  const { setAuth, clearAuth, setLoading, isLoading } = useAuthStore();

  useEffect(() => {
    async function restoreSession() {
      try {
        // Try to get a new access token using the refresh cookie
        const { data } = await api.post<{
          data: {
            accessToken: string;
            user: {
              id: string;
              name: string;
              email: string;
              role: Role;
              branchId: string;
              branch?: { name: string; city?: string };
            };
          };
        }>("/auth/refresh");

        const { accessToken, user } = data.data;

        setAuth(
          {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            branchId: user.branchId,
            branch: user.branch,
          },
          accessToken,
        );
      } catch {
        // No valid cookie / session expired — user goes to login
        clearAuth();
      } finally {
        setLoading(false);
      }
    }

    void restoreSession();
  }, [setAuth, clearAuth, setLoading]);

  return { isLoading };
}
