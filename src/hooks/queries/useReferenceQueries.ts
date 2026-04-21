import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  areasApi,
  coursesApi,
  subjectsApi,
  topicsApi,
  courseSubjectsApi,
  activitiesApi,
  fontsApi,
} from '@/services/api';
import type { Activity, ActivityUpdate, CourseSubjectUpdate, CourseUpdate, Font, SubjectUpdate } from '@/types';

export const referenceKeys = {
  areas: ['areas'] as const,
  courses: ['courses'] as const,
  subjects: ['subjects'] as const,
  topics: ['topics'] as const,
  courseSubjects: ['courseSubjects'] as const,
  activitiesByMoment: ['activitiesByMoment'] as const,
  fonts: ['fonts'] as const,
};

export function useAreasQuery() {
  return useQuery({
    queryKey: referenceKeys.areas,
    queryFn: async () => (await areasApi.list()).items,
  });
}

export function useCoursesQuery() {
  return useQuery({
    queryKey: referenceKeys.courses,
    queryFn: async () => (await coursesApi.list()).items,
  });
}

export function useSubjectsQuery() {
  return useQuery({
    queryKey: referenceKeys.subjects,
    queryFn: async () => (await subjectsApi.list()).items,
  });
}

export function useTopicsQuery() {
  return useQuery({
    queryKey: referenceKeys.topics,
    queryFn: async () => (await topicsApi.getTree()).items,
  });
}

export function useCourseSubjectsQuery() {
  return useQuery({
    queryKey: referenceKeys.courseSubjects,
    queryFn: async () => (await courseSubjectsApi.list()).items,
  });
}

export function useActivitiesByMomentQuery() {
  return useQuery({
    queryKey: referenceKeys.activitiesByMoment,
    queryFn: async () => {
      const [apertura, desarrollo, cierre] = await Promise.all([
        activitiesApi.list({ moment: 'apertura' }),
        activitiesApi.list({ moment: 'desarrollo' }),
        activitiesApi.list({ moment: 'cierre' }),
      ]);
      return {
        apertura: apertura.items as Activity[],
        desarrollo: desarrollo.items as Activity[],
        cierre: cierre.items as Activity[],
      };
    },
  });
}

export function useFontsQuery(areaId?: number) {
  return useQuery({
    queryKey: [...referenceKeys.fonts, areaId],
    queryFn: async () => (areaId ? (await fontsApi.list({ area_id: areaId })).items : ([] as Font[])),
    enabled: areaId !== undefined && areaId > 0,
  });
}

// =============================================================================
// Mutations — Subjects
// =============================================================================

export function useUpdateSubjectMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: SubjectUpdate }) => subjectsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: referenceKeys.subjects });
    },
  });
}

export function useDeleteSubjectMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => subjectsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: referenceKeys.subjects });
    },
  });
}

// =============================================================================
// Mutations — Topics
// =============================================================================

export function useDeleteTopicMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => topicsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: referenceKeys.topics });
    },
  });
}

// =============================================================================
// Mutations — Activities
// =============================================================================

export function useActivityQuery(id: number) {
  return useQuery({
    queryKey: ['activity', id] as const,
    queryFn: () => activitiesApi.getById(id),
    enabled: id > 0,
  });
}

export function useUpdateActivityMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ActivityUpdate }) => activitiesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: referenceKeys.activitiesByMoment });
    },
  });
}

export function useDeleteActivityMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => activitiesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: referenceKeys.activitiesByMoment });
    },
  });
}

// =============================================================================
// Mutations — Courses
// =============================================================================

export function useUpdateCourseMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: CourseUpdate }) => coursesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: referenceKeys.courses });
    },
  });
}

export function useDeleteCourseMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => coursesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: referenceKeys.courses });
      queryClient.invalidateQueries({ queryKey: referenceKeys.courseSubjects });
    },
  });
}

// =============================================================================
// Mutations — Course Subjects
// =============================================================================

export function useUpdateCourseSubjectMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: CourseSubjectUpdate }) => courseSubjectsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: referenceKeys.courseSubjects });
      queryClient.invalidateQueries({ queryKey: referenceKeys.courses });
    },
  });
}

export function useDeleteCourseSubjectMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => courseSubjectsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: referenceKeys.courseSubjects });
      queryClient.invalidateQueries({ queryKey: referenceKeys.courses });
    },
  });
}
