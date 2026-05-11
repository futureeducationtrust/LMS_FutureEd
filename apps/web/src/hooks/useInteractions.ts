import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { InteractionType, Role } from "@lms/types";
import toast from "react-hot-toast";

export type Interaction = {
  id: string;
  leadId: string;
  type: InteractionType;
  note: string;
  recordingUrl?: string;
  createdBy: {
    id: string;
    name: string;
    email: string;
    role: Role;
  };
  createdAt: string;
  updatedAt: string;
};

export type InteractionListResponse = {
  interactions: Interaction[];
  total: number;
};

// ── Get interactions for a lead ──
export function useInteractions(leadId: string | null | undefined) {
  return useQuery({
    queryKey: ["interactions", leadId],
    queryFn: async () => {
      if (!leadId) throw new Error("Lead ID is required");
      const { data } = await api.get<{
        success: true;
        data: InteractionListResponse;
      }>(`/leads/${leadId}/interactions`);
      return data.data;
    },
    enabled: !!leadId,
  });
}

// ── Add interaction (note) ──
export function useAddInteraction(leadId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      type: InteractionType;
      note: string;
      recordingUrl?: string;
    }) => {
      const { data } = await api.post<{
        success: true;
        data: Interaction;
      }>(`/leads/${leadId}/interactions`, params);
      return data.data;
    },
    onSuccess: () => {
      toast.success("Interaction added successfully");
      void qc.invalidateQueries({ queryKey: ["interactions", leadId] });
      void qc.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: (error) => {
      toast.error("Failed to add interaction");
      console.error(error);
    },
  });
}

// ── Edit interaction ──
export function useEditInteraction(leadId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: { interactionId: string; note: string }) => {
      const { data } = await api.patch<{
        success: true;
        data: Interaction;
      }>(`/interactions/${params.interactionId}`, { note: params.note });
      return data.data;
    },
    onSuccess: () => {
      toast.success("Interaction updated successfully");
      void qc.invalidateQueries({ queryKey: ["interactions", leadId] });
    },
    onError: (error) => {
      toast.error("Failed to update interaction");
      console.error(error);
    },
  });
}

// ── Delete interaction (ADMIN only) ──
export function useDeleteInteraction(leadId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (interactionId: string) => {
      await api.delete(`/interactions/${interactionId}`);
    },
    onSuccess: () => {
      toast.success("Interaction deleted successfully");
      void qc.invalidateQueries({ queryKey: ["interactions", leadId] });
    },
    onError: (error) => {
      toast.error("Failed to delete interaction");
      console.error(error);
    },
  });
}
