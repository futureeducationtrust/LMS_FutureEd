import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { useNotifications } from "@/store/notifications";
import { extractApiError } from "@/lib/utils";

export function useCourses() {
  return useQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      const { data } = await api.get("/settings/courses");
      return data.data;
    },
    staleTime: 5 * 60_000,
  });
}

export function useCreateCourse() {
  const qc = useQueryClient();
  const { success, error } = useNotifications();
  return useMutation({
    mutationFn: async (body: {
      name: string;
      code?: string;
      description?: string;
    }) => {
      const { data } = await api.post("/settings/courses", body);
      return data.data;
    },
    onSuccess: () => {
      success("Course created");
      void qc.invalidateQueries({ queryKey: ["courses"] });
    },
    onError: (e) => error("Failed to create course", extractApiError(e)),
  });
}

export function useUpdateCourse() {
  const qc = useQueryClient();
  const { success, error } = useNotifications();
  return useMutation({
    mutationFn: async ({
      id,
      ...body
    }: {
      id: string;
      name?: string;
      isActive?: boolean;
    }) => {
      const { data } = await api.patch(`/settings/courses/${id}`, body);
      return data.data;
    },
    onSuccess: () => {
      success("Course updated");
      void qc.invalidateQueries({ queryKey: ["courses"] });
    },
    onError: (e) => error("Failed to update", extractApiError(e)),
  });
}

export function useLeadSources() {
  return useQuery({
    queryKey: ["lead-sources"],
    queryFn: async () => {
      const { data } = await api.get("/settings/sources");
      return data.data;
    },
    staleTime: 5 * 60_000,
  });
}

export function useCreateLeadSource() {
  const qc = useQueryClient();
  const { success, error } = useNotifications();
  return useMutation({
    mutationFn: async (body: { name: string }) => {
      const { data } = await api.post("/settings/sources", body);
      return data.data;
    },
    onSuccess: () => {
      success("Source type created");
      void qc.invalidateQueries({ queryKey: ["lead-sources"] });
    },
    onError: (e) => error("Failed to create", extractApiError(e)),
  });
}
