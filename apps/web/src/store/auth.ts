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

  setAuth: (user: AuthUser, accessToken: string) => void;
  clearAuth: () => void;
  bootstrap: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: false,
  isBootstrapped: false,

  setAuth: (user, accessToken) => {
    tokenStore.set(accessToken);
    set({ user, isLoading: false });
  },

  clearAuth: () => {
    tokenStore.clear();
    set({ user: null, isLoading: false });
  },

  bootstrap: async () => {
    if (get().isBootstrapped) return;
    set({ isLoading: true });
    try {
      // Try refresh first to get new access token
      const { data: refreshData } = await api.post("/auth/refresh");
      tokenStore.set(refreshData.data.accessToken);

      // Then get user info
      const { data: meData } = await api.get("/auth/me");
      set({ user: meData.data, isLoading: false, isBootstrapped: true });
    } catch {
      set({ user: null, isLoading: false, isBootstrapped: true });
    }
  },
}));
