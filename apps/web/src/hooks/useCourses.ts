import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import toast from "react-hot-toast";

export type Course = {
  id: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
};

export type CourseListResponse = {
  courses: Course[];
};

// ── Get all courses ──
export function useCourses() {
  return useQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      // First try /courses endpoint
      try {
        const { data } = await api.get<{
          success: true;
          data: CourseListResponse;
        }>("/courses");
        return data.data.courses;
      } catch (error) {
        // If no dedicated endpoint, return empty
        console.warn("Courses endpoint not available");
        return [];
      }
    },
    staleTime: 10 * 60_000, // 10 minutes
  });
}

// ── Get single course ──
export function useCourse(courseId: string | null | undefined) {
  return useQuery({
    queryKey: ["courses", courseId],
    queryFn: async () => {
      if (!courseId) throw new Error("Course ID is required");
      const { data } = await api.get<{ success: true; data: Course }>(
        `/courses/${courseId}`,
      );
      return data.data;
    },
    enabled: !!courseId,
  });
}

// ── Create course ──
export function useCreateCourse() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      name: string;
      code: string;
      description?: string;
    }) => {
      const { data } = await api.post<{ success: true; data: Course }>(
        "/courses",
        params,
      );
      return data.data;
    },
    onSuccess: () => {
      toast.success("Course created successfully");
      void qc.invalidateQueries({ queryKey: ["courses"] });
    },
    onError: (error) => {
      toast.error("Failed to create course");
      console.error(error);
    },
  });
}

// ── Update course ──
export function useUpdateCourse(courseId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      name?: string;
      code?: string;
      description?: string;
      isActive?: boolean;
    }) => {
      const { data } = await api.patch<{ success: true; data: Course }>(
        `/courses/${courseId}`,
        params,
      );
      return data.data;
    },
    onSuccess: () => {
      toast.success("Course updated successfully");
      void qc.invalidateQueries({ queryKey: ["courses"] });
      void qc.invalidateQueries({ queryKey: ["courses", courseId] });
    },
    onError: (error) => {
      toast.error("Failed to update course");
      console.error(error);
    },
  });
}
