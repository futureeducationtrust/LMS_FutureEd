import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Role } from "@lms/types";
import toast from "react-hot-toast";

export type User = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  branchId: string;
  branch: { id: string; name: string };
  isActive: boolean;
  leadsCount: number;
  confirmedCount: number;
  createdAt: string;
};

export type UserFilters = {
  page?: number;
  pageSize?: number;
  role?: Role | undefined;
  branchId?: string | undefined;
  isActive?: boolean | undefined;
  search?: string | undefined;
};

export type UserListResponse = {
  users: User[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type DeactivatePreviewResponse = {
  affectedLeads: number;
  affectedInteractions: number;
  affectedAssignments: number;
};

// ── Get users list ──
export function useUsers(filters?: UserFilters) {
  return useQuery({
    queryKey: ["users", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([k, v]) => {
          if (v !== undefined && v !== "") params.set(k, String(v));
        });
      }
      const { data } = await api.get<{ success: true; data: UserListResponse }>(
        `/users?${params.toString()}`,
      );
      return data.data;
    },
  });
}

// ── Get single user ──
export function useUser(userId: string | null | undefined) {
  return useQuery({
    queryKey: ["users", userId],
    queryFn: async () => {
      if (!userId) throw new Error("User ID is required");
      const { data } = await api.get<{ success: true; data: User }>(
        `/users/${userId}`,
      );
      return data.data;
    },
    enabled: !!userId,
  });
}

// ── Create user ──
export function useCreateUser() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      name: string;
      email: string;
      phone: string;
      role: Role;
      branchId: string;
      sendSetupLink: boolean;
    }) => {
      const { data } = await api.post<{ success: true; data: User }>(
        "/users",
        params,
      );
      return data.data;
    },
    onSuccess: () => {
      toast.success("User created successfully");
      void qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error) => {
      toast.error("Failed to create user");
      console.error(error);
    },
  });
}

// ── Update user ──
export function useUpdateUser(userId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      name?: string;
      phone?: string;
      role?: Role;
      branchId?: string;
    }) => {
      const { data } = await api.patch<{ success: true; data: User }>(
        `/users/${userId}`,
        params,
      );
      return data.data;
    },
    onSuccess: () => {
      toast.success("User updated successfully");
      void qc.invalidateQueries({ queryKey: ["users"] });
      void qc.invalidateQueries({ queryKey: ["users", userId] });
    },
    onError: (error) => {
      toast.error("Failed to update user");
      console.error(error);
    },
  });
}

// ── Get deactivate preview (shows what will be affected) ──
export function useDeactivatePreview(userId: string | null | undefined) {
  return useQuery({
    queryKey: ["users", userId, "deactivate-preview"],
    queryFn: async () => {
      if (!userId) throw new Error("User ID is required");
      const { data } = await api.get<{
        success: true;
        data: DeactivatePreviewResponse;
      }>(`/users/${userId}/deactivate-preview`);
      return data.data;
    },
    enabled: !!userId,
  });
}

// ── Deactivate user ──
export function useDeactivateUser() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      await api.post(`/users/${userId}/deactivate`, {});
    },
    onSuccess: () => {
      toast.success("User deactivated successfully");
      void qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error) => {
      toast.error("Failed to deactivate user");
      console.error(error);
    },
  });
}

// ── Activate user ──
export function useActivateUser() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      await api.post(`/users/${userId}/activate`, {});
    },
    onSuccess: () => {
      toast.success("User activated successfully");
      void qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error) => {
      toast.error("Failed to activate user");
      console.error(error);
    },
  });
}

// ── Reset password for user ──
export function useResetPasswordForUser() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: { userId: string; sendResetLink: boolean }) => {
      await api.post(`/users/${params.userId}/reset-password`, {
        sendResetLink: params.sendResetLink,
      });
    },
    onSuccess: () => {
      toast.success("Password reset link sent");
      void qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error) => {
      toast.error("Failed to reset password");
      console.error(error);
    },
  });
}
