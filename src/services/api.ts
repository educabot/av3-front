import { apiClient, fetchPaginated } from './api-client';
import type {
  Activity,
  ActivityUpdate,
  Area,
  ChatRequest,
  ChatResponse,
  CoordinationDocument,
  CoordinationDocumentCreate,
  CoordDocChatHistory,
  CoordDocChatRequest,
  CoordDocChatResponse,
  Course,
  CourseSubject,
  CourseSubjectUpdate,
  CourseUpdate,
  Font,
  GenerateActivityRequest,
  GenerateDocumentResponse,
  GenerateRequest,
  LessonPlan,
  LessonPlanCreate,
  LoginRequest,
  LoginResponse,
  MomentKey,
  Notification,
  OnboardingConfig,
  OnboardingStatus,
  Organization,
  OrgConfig,
  PaginatedResponse,
  PlanningProgress,
  PublishDocumentRequest,
  PublishDocumentResponse,
  Resource,
  ResourceCreate,
  ResourceType,
  SharedClassNumbersResponse,
  Student,
  Subject,
  SubjectUpdate,
  SuggestedClassCount,
  TimeSlot,
  Topic,
  TourStep,
  UpdateClassRequest,
  UpdateSectionsResponse,
  User,
} from '@/types';

// =============================================================================
// Auth
// =============================================================================

export const authApi = {
  login: (data: LoginRequest) => apiClient.post<LoginResponse>('/auth/login', data),
  logout: () => apiClient.post<void>('/auth/logout', {}),
};

// =============================================================================
// Areas
// =============================================================================

export const areasApi = {
  list: (params?: { limit?: number; offset?: number }) => fetchPaginated<Area>('/areas', params?.limit, params?.offset),
  getById: (id: number) => apiClient.get<Area>(`/areas/${id}`),
  create: (data: { name: string; description?: string }) => apiClient.post<Area>('/areas', data),
  update: (id: number, data: { name?: string; description?: string }) => apiClient.put<Area>(`/areas/${id}`, data),
  delete: (id: number) => apiClient.delete<void>(`/areas/${id}`),
  addCoordinator: (areaId: number, userId: number) =>
    apiClient.post<void>(`/areas/${areaId}/coordinators`, { user_id: userId }),
  removeCoordinator: (areaId: number, userId: number) =>
    apiClient.delete<void>(`/areas/${areaId}/coordinators/${userId}`),
};

// =============================================================================
// Subjects
// =============================================================================

export const subjectsApi = {
  list: (params?: { limit?: number; offset?: number; area_id?: number }) => {
    const query = params?.area_id ? `/subjects?area_id=${params.area_id}` : '/subjects';
    return fetchPaginated<Subject>(query, params?.limit, params?.offset);
  },
  create: (data: { name: string; area_id: number; description?: string }) => apiClient.post<Subject>('/subjects', data),
  update: (id: number, data: SubjectUpdate) => apiClient.patch<Subject>(`/subjects/${id}`, data),
  delete: (id: number) => apiClient.delete<void>(`/subjects/${id}`),
};

// =============================================================================
// Courses
// =============================================================================

export const coursesApi = {
  list: (params?: { limit?: number; offset?: number }) =>
    fetchPaginated<Course>('/courses', params?.limit, params?.offset),
  getById: (id: number) => apiClient.get<Course>(`/courses/${id}`),
  create: (data: { name: string }) => apiClient.post<Course>('/courses', data),
  addStudent: (courseId: number, data: { name: string }) =>
    apiClient.post<Student>(`/courses/${courseId}/students`, data),
  getSchedule: (courseId: number) => apiClient.get<TimeSlot[]>(`/courses/${courseId}/schedule`),
  createTimeSlot: (
    courseId: number,
    data: {
      day_of_week: number;
      start_time: string;
      end_time: string;
      course_subject_ids: number[];
    },
  ) => apiClient.post<TimeSlot>(`/courses/${courseId}/time-slots`, data),
  update: (id: number, data: CourseUpdate) => apiClient.patch<Course>(`/courses/${id}`, data),
  delete: (id: number) => apiClient.delete<void>(`/courses/${id}`),
};

// =============================================================================
// Course Subjects
// =============================================================================

export const courseSubjectsApi = {
  list: (params?: { limit?: number; offset?: number; course_id?: number; teacher_id?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.course_id) searchParams.set('course_id', String(params.course_id));
    if (params?.teacher_id) searchParams.set('teacher_id', String(params.teacher_id));
    const query = searchParams.toString() ? `/course-subjects?${searchParams}` : '/course-subjects';
    return fetchPaginated<CourseSubject>(query, params?.limit, params?.offset);
  },
  getById: (id: number) => apiClient.get<CourseSubject>(`/course-subjects/${id}`),
  create: (data: {
    course_id: number;
    subject_id: number;
    teacher_id: number;
    start_date: string;
    end_date: string;
    school_year: number;
  }) => apiClient.post<CourseSubject>('/course-subjects', data),
  getSharedClassNumbers: (id: number, totalClasses: number) =>
    apiClient.get<SharedClassNumbersResponse>(
      `/course-subjects/${id}/shared-class-numbers?total_classes=${totalClasses}`,
    ),
  update: (id: number, data: CourseSubjectUpdate) => apiClient.patch<CourseSubject>(`/course-subjects/${id}`, data),
  delete: (id: number) => apiClient.delete<void>(`/course-subjects/${id}`),
};

// =============================================================================
// Topics
// =============================================================================

export const topicsApi = {
  getTree: (params?: { level?: number; parent_id?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.level) searchParams.set('level', String(params.level));
    if (params?.parent_id) searchParams.set('parent_id', String(params.parent_id));
    const query = searchParams.toString() ? `/topics?${searchParams}` : '/topics';
    return apiClient.get<{ items: Topic[] }>(query);
  },
  create: (data: { name: string; description?: string; parent_id: number | null }) =>
    apiClient.post<Topic>('/topics', data),
  update: (id: number, data: { name?: string; description?: string; parent_id?: number | null }) =>
    apiClient.patch<Topic>(`/topics/${id}`, data),
  delete: (id: number) => apiClient.delete<void>(`/topics/${id}`),
};

// =============================================================================
// Activities
// =============================================================================

export const activitiesApi = {
  list: (params?: { moment?: MomentKey }) => {
    const query = params?.moment ? `/activities?moment=${params.moment}` : '/activities';
    return apiClient.get<PaginatedResponse<Activity>>(query);
  },
  create: (data: { moment: MomentKey; name: string; description?: string; duration_minutes?: number }) =>
    apiClient.post<Activity>('/activities', data),
  getById: (id: number) => apiClient.get<Activity>(`/activities/${id}`),
  update: (id: number, data: ActivityUpdate) => apiClient.patch<Activity>(`/activities/${id}`, data),
  delete: (id: number) => apiClient.delete<void>(`/activities/${id}`),
};

// =============================================================================
// Coordination Documents
// =============================================================================

export const coordinationDocumentsApi = {
  list: async (params?: { limit?: number; offset?: number; area_id?: number; status?: string }): Promise<PaginatedResponse<CoordinationDocument>> => {
    const searchParams = new URLSearchParams();
    if (params?.area_id) searchParams.set('area_id', String(params.area_id));
    if (params?.status) searchParams.set('status', params.status);
    const query = searchParams.toString() ? `/coordination-documents?${searchParams}` : '/coordination-documents';
    const items = await apiClient.get<CoordinationDocument[]>(query);
    return { items, more: false };
  },
  getById: (id: number) => apiClient.get<CoordinationDocument>(`/coordination-documents/${id}`),
  create: (data: CoordinationDocumentCreate) =>
    apiClient.post<{ id: number }>('/coordination-documents', data),
  updateSections: (id: number, sections: Record<string, unknown>) =>
    apiClient.patch<UpdateSectionsResponse>(`/coordination-documents/${id}`, { sections }),
  archive: (id: number) =>
    apiClient.patch<CoordinationDocument>(`/coordination-documents/${id}`, { status: 'archived' }),
  delete: (id: number) => apiClient.delete<void>(`/coordination-documents/${id}`),
  generate: (id: number, data?: GenerateRequest) =>
    apiClient.post<GenerateDocumentResponse>(`/coordination-documents/${id}/generate`, data ?? {}),
  updateClass: (docId: number, classId: number, data: UpdateClassRequest) =>
    apiClient.patch<CoordinationDocument>(`/coordination-documents/${docId}/classes/${classId}`, data),
  publish: (id: number, data?: PublishDocumentRequest) =>
    apiClient.post<PublishDocumentResponse>(`/coordination-documents/${id}/publish`, data ?? {}),
  chat: (id: number, data: CoordDocChatRequest) =>
    apiClient.post<CoordDocChatResponse>(`/coordination-documents/${id}/chat`, data),
  getChatHistory: (id: number, params?: { limit?: number; offset?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.offset) searchParams.set('offset', String(params.offset));
    const query = searchParams.toString()
      ? `/coordination-documents/${id}/chat/history?${searchParams}`
      : `/coordination-documents/${id}/chat/history`;
    return apiClient.get<CoordDocChatHistory>(query);
  },
};

export const suggestedClassCountsApi = {
  getByArea: (areaId: number, startDate: string, endDate: string) =>
    apiClient.get<SuggestedClassCount[]>(
      `/areas/${areaId}/suggested-class-counts?start_date=${startDate}&end_date=${endDate}`,
    ),
};

// =============================================================================
// Lesson Plans
// =============================================================================

export const lessonPlansApi = {
  listByCourseSubject: (courseSubjectId: number) =>
    apiClient.get<PaginatedResponse<LessonPlan>>(`/course-subjects/${courseSubjectId}/lesson-plans`),
  getById: (id: number) => apiClient.get<LessonPlan>(`/lesson-plans/${id}`),
  create: (data: LessonPlanCreate) => apiClient.post<LessonPlan>('/lesson-plans', data),
  update: (id: number, data: Partial<LessonPlanCreate>) => apiClient.patch<LessonPlan>(`/lesson-plans/${id}`, data),
  delete: (id: number) => apiClient.delete<void>(`/lesson-plans/${id}`),
  generateActivity: (id: number, data: GenerateActivityRequest) =>
    apiClient.post<{ moment: MomentKey; activity_id: number; content: string }>(
      `/lesson-plans/${id}/generate-activity`,
      data,
    ),
  updateStatus: (id: number, status: string) => apiClient.patch<LessonPlan>(`/lesson-plans/${id}/status`, { status }),
};

// =============================================================================
// Fonts
// =============================================================================

export const fontsApi = {
  list: (params: { area_id: number; validated_only?: boolean }) => {
    const searchParams = new URLSearchParams();
    searchParams.set('area_id', String(params.area_id));
    if (params.validated_only !== undefined) searchParams.set('validated_only', String(params.validated_only));
    return apiClient.get<PaginatedResponse<Font>>(`/fonts?${searchParams}`);
  },
  getById: (id: number) => apiClient.get<Font>(`/fonts/${id}`),
};

// =============================================================================
// Resource Types
// =============================================================================

export const resourceTypesApi = {
  list: () => apiClient.get<PaginatedResponse<ResourceType>>('/resource-types'),
};

// =============================================================================
// Resources
// =============================================================================

export const resourcesApi = {
  list: (params?: { limit?: number; offset?: number }) =>
    fetchPaginated<Resource>('/resources', params?.limit, params?.offset),
  getById: (id: number) => apiClient.get<Resource>(`/resources/${id}`),
  create: (data: ResourceCreate) => apiClient.post<Resource>('/resources', data),
  update: (id: number, data: { title?: string; content?: Record<string, unknown>; status?: string }) =>
    apiClient.patch<Resource>(`/resources/${id}`, data),
  delete: (id: number) => apiClient.delete<void>(`/resources/${id}`),
  generate: (id: number, data?: { custom_instruction?: string }) =>
    apiClient.post<{ content: Record<string, unknown> }>(`/resources/${id}/generate`, data ?? {}),
};

// =============================================================================
// Chat (general, sin contexto de documento)
// =============================================================================

export const chatApi = {
  send: (data: ChatRequest) => apiClient.post<ChatResponse>('/chat', data),
};

// =============================================================================
// Organization / Config
// =============================================================================

export const orgApi = {
  getMy: () => apiClient.get<Organization>('/organizations/me'),
  updateConfig: (configPatch: Partial<OrgConfig>) =>
    apiClient.patch<Organization>('/organizations/me/config', { config: configPatch }),
};

// =============================================================================
// Onboarding
// =============================================================================

export const onboardingApi = {
  getStatus: () => apiClient.get<OnboardingStatus>('/users/me/onboarding-status'),
  complete: () => apiClient.post<{ status: string }>('/users/me/onboarding/complete', {}),
  getConfig: () => apiClient.get<OnboardingConfig>('/onboarding-config'),
  getProfile: () => apiClient.get<Record<string, unknown>>('/users/me/profile'),
  saveProfile: (data: Record<string, unknown>) => apiClient.put<Record<string, unknown>>('/users/me/profile', data),
  getTourSteps: () => apiClient.get<TourStep[]>('/users/me/onboarding/tour-steps'),
};

// =============================================================================
// Notifications
// =============================================================================

export const notificationsApi = {
  list: () => apiClient.get<PaginatedResponse<Notification>>('/users/me/notifications'),
  markAsRead: (id: number) => apiClient.patch<void>(`/users/me/notifications/${id}/read`, {}),
};

// =============================================================================
// Dashboard
// =============================================================================

export const dashboardApi = {
  getCoordinator: () => apiClient.get<{ planning_progress: PlanningProgress[] }>('/dashboard/coordinator'),
  getTeacher: () =>
    apiClient.get<{ pending_plans_count: number; upcoming_classes_count: number }>('/dashboard/teacher'),
};

// =============================================================================
// Users (admin)
// =============================================================================

export const usersApi = {
  list: (params?: { limit?: number; offset?: number; role?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.role) searchParams.set('role', params.role);
    const query = searchParams.toString() ? `/users?${searchParams}` : '/users';
    return fetchPaginated<User>(query, params?.limit, params?.offset);
  },
};
