import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { LeadSummary } from "./useLeads";

export type CampaignAssigneeSummary = { id: string; name: string; email: string };

export type CampaignRow = {
  id: string;
  name: string;
  sourceFile: string | null;
  isArchived: boolean;
  createdAt: string;
  createdBy: { id: string; name: string };
  assignees: CampaignAssigneeSummary[];
  leadCount: number;
  newCount: number;
  workedCount: number;
  unassignedCount: number;
  progress: number; // 0..1
};

export type CampaignListResponse = {
  campaigns: CampaignRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  // totals over the whole filtered set, not just this page
  summary: { campaigns: number; leads: number; remaining: number; unassignedCampaigns: number };
};

export type CampaignFilters = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: "active" | "completed" | "archived" | "all";
  assigneeId?: string;
  createdById?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: "createdAt" | "name" | "leadCount" | "progress";
  sortOrder?: "asc" | "desc";
};

export type CampaignDetail = CampaignRow & {
  assignees: Array<CampaignAssigneeSummary & { total: number; remaining: number }>;
  unassigned: { total: number; remaining: number };
  myQueue: { total: number; resumeIndex: number; resumeLeadId: string | null };
};

export type CampaignWork = {
  campaign: { id: string; name: string };
  lead: LeadSummary | null;
  index: number;
  total: number;
  prevId: string | null;
  nextId: string | null;
};

function toParams(filters: Record<string, unknown>): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== "" && v !== null) params.set(k, String(v));
  });
  return params.toString();
}

export function useCampaignList(filters: CampaignFilters) {
  return useQuery({
    queryKey: ["campaigns", filters],
    queryFn: async () => {
      const { data } = await api.get<{ success: true; data: CampaignListResponse }>(
        `/campaigns?${toParams(filters)}`,
      );
      return data.data;
    },
    refetchInterval: 30_000,
  });
}

export function useCampaign(id: string | null | undefined) {
  return useQuery({
    queryKey: ["campaign", id],
    queryFn: async () => {
      const { data } = await api.get<{ success: true; data: CampaignDetail }>(`/campaigns/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

// Lightweight name list for the import page: shows what the campaign will
// be called after versioning ("Leads (2)").
export function useCampaignNamePreview(base: string | null) {
  return useQuery({
    queryKey: ["campaign-name-preview", base],
    queryFn: async () => {
      const { data } = await api.get<{ success: true; data: { names: string[]; resolved?: string } }>(
        `/campaigns/names?base=${encodeURIComponent(base ?? "")}`,
      );
      return data.data;
    },
    enabled: !!base,
    staleTime: 10_000,
  });
}

export function useAssignCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, userIds, reason }: { id: string; userIds: string[]; reason?: string }) => {
      const { data } = await api.post<{
        success: true;
        data: { assigned: number; changed: number; perAssignee: Record<string, number> };
      }>(`/campaigns/${id}/assign`, { userIds, reason });
      return data.data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      qc.invalidateQueries({ queryKey: ["campaign", vars.id] });
      qc.invalidateQueries({ queryKey: ["leads"] });
    },
  });
}

export function useUpdateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string; name?: string; isArchived?: boolean }) => {
      const { data } = await api.patch<{ success: true; data: CampaignRow }>(`/campaigns/${id}`, body);
      return data.data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      qc.invalidateQueries({ queryKey: ["campaign", vars.id] });
    },
  });
}

// The work view. Without leadId the server resumes where this user left
// off in THIS campaign; every fetch persists the cursor server-side.
export function useCampaignWork(id: string, leadId: string | null) {
  return useQuery({
    queryKey: ["campaign-work", id, leadId],
    queryFn: async () => {
      const qs = leadId ? `?leadId=${encodeURIComponent(leadId)}` : "";
      const { data } = await api.get<{ success: true; data: CampaignWork }>(`/campaigns/${id}/work${qs}`);
      return data.data;
    },
    enabled: !!id,
    staleTime: 0,
  });
}

// ── Workspace queue (left panel) ──
export type QueueTab = "new" | "active";

export type QueueLead = {
  id: string;
  studentName: string;
  phone: string;
  status: string;
  city: string | null;
  nextFollowUpAt: string | null;
  createdAt: string;
  assignedTo: { id: string; name: string } | null;
  course: string | null;
  lastCall: { outcome: string | null; durationSecs: number | null; at: string; by: string } | null;
};

export type CampaignQueue = {
  campaign: { id: string; name: string };
  tab: QueueTab;
  counts: { new: number; active: number };
  leads: QueueLead[];
};

export type QueueParams = {
  tab: QueueTab;
  search?: string;
  searchField?: string;
  statuses?: string;    // comma-separated
  assigneeIds?: string; // comma-separated, may include "unassigned"
  dateFrom?: string;
  dateTo?: string;
};

export function useCampaignQueue(id: string, params: QueueParams) {
  return useQuery({
    queryKey: ["campaign-queue", id, params],
    queryFn: async () => {
      const { data } = await api.get<{ success: true; data: CampaignQueue }>(
        `/campaigns/${id}/queue?${toParams(params)}`,
      );
      return data.data;
    },
    enabled: !!id,
    refetchInterval: 30_000,
  });
}

export function useSaveCampaignProgress() {
  return useMutation({
    mutationFn: async ({ id, lastLeadId }: { id: string; lastLeadId: string }) => {
      await api.put(`/campaigns/${id}/progress`, { lastLeadId });
    },
  });
}
