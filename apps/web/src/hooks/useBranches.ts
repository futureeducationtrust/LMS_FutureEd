import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import toast from "react-hot-toast";

export type Branch = {
  id: string;
  name: string;
  city: string;
  address: string;
  isActive: boolean;
  createdAt: string;
};

export type BranchListResponse = {
  branches: Branch[];
};

// ── Get all branches ──
export function useBranches() {
  return useQuery({
    queryKey: ["branches"],
    queryFn: async () => {
      const { data } = await api.get<{
        success: true;
        data: BranchListResponse;
      }>("/branches");
      return data.data.branches;
    },
    staleTime: 5 * 60_000, // 5 minutes
  });
}

// ── Get single branch ──
export function useBranch(branchId: string | null | undefined) {
  return useQuery({
    queryKey: ["branches", branchId],
    queryFn: async () => {
      if (!branchId) throw new Error("Branch ID is required");
      const { data } = await api.get<{ success: true; data: Branch }>(
        `/branches/${branchId}`,
      );
      return data.data;
    },
    enabled: !!branchId,
  });
}

// ── Create branch ──
export function useCreateBranch() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      name: string;
      city: string;
      address: string;
    }) => {
      const { data } = await api.post<{ success: true; data: Branch }>(
        "/branches",
        params,
      );
      return data.data;
    },
    onSuccess: () => {
      toast.success("Branch created successfully");
      void qc.invalidateQueries({ queryKey: ["branches"] });
    },
    onError: (error) => {
      toast.error("Failed to create branch");
      console.error(error);
    },
  });
}

// ── Update branch ──
export function useUpdateBranch(branchId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      name?: string;
      city?: string;
      address?: string;
      isActive?: boolean;
    }) => {
      const { data } = await api.patch<{ success: true; data: Branch }>(
        `/branches/${branchId}`,
        params,
      );
      return data.data;
    },
    onSuccess: () => {
      toast.success("Branch updated successfully");
      void qc.invalidateQueries({ queryKey: ["branches"] });
      void qc.invalidateQueries({ queryKey: ["branches", branchId] });
    },
    onError: (error) => {
      toast.error("Failed to update branch");
      console.error(error);
    },
  });
}
