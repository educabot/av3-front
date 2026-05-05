// =============================================================================
// Alizia Frontend — Types alineados al RFC backend
// Ref: docs/rfc-alizia/tecnico/frontend-integration.md
//
// Tipos de dominios migrados a zod viven en src/schemas/ y se re-exportan acá
// para preservar la API existente (`import { User } from '@/types'`).
// =============================================================================

import type { SectionConfig } from '@/schemas/organization';
import type { SubjectCompact } from '@/schemas/subject';

export type {
  JWTClaims,
  LoginRequest,
  LoginResponse,
  User,
  UserRole,
} from '@/schemas/auth';
export type {
  Area,
  AreaCoordinator,
  UserCompact,
} from '@/schemas/area';
export type {
  OnboardingConfig,
  Organization,
  OrgConfig,
  ProfileField,
  SectionConfig,
  SectionType,
  TourStep,
} from '@/schemas/organization';
export type {
  Subject,
  SubjectCompact,
  SubjectUpdate,
} from '@/schemas/subject';

// --- Paginacion ---

export interface PaginatedResponse<T> {
  items: T[];
  more: boolean;
}

// --- API Errors ---
// El shape viene del team-ai-toolkit (web.Error): { code, description }.
// Algunos errores incluyen un objeto `details` extra cuando aplica.
export interface APIErrorBody {
  code: string;
  description: string;
  details?: Record<string, unknown>;
}

// --- Topics (reemplaza ProblematicNucleus, KnowledgeArea, Category) ---

export interface Topic {
  id: number;
  name: string;
  description?: string;
  level: number;
  parent_id: number | null;
  children?: Topic[];
}

// --- Courses ---

// A course is atemporal: it has no school year of its own.
// The academic year lives in course_subjects[].school_year (fuente de verdad RFC).
export interface Course {
  id: number;
  name: string;
  students?: Student[];
  course_subjects?: CourseSubject[];
}

export interface CourseUpdate {
  name?: string;
}

// --- Students ---

export interface Student {
  id: number;
  course_id: number;
  name: string;
}

// --- Course Subjects ---

export interface TeacherCompact {
  id: number;
  first_name: string;
  last_name: string;
}

export interface CourseSubject {
  id: number;
  course_id: number;
  subject_id: number;
  teacher_id: number;
  school_year: number;
  start_date?: string;
  end_date?: string;
  subject: SubjectCompact;
  teacher: TeacherCompact | null;
}

export interface CourseSubjectUpdate {
  teacher_id?: number;
  school_year?: number;
  start_date?: string;
  end_date?: string;
}

// --- Time Slots ---

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface TimeSlot {
  id: number;
  course_id: number;
  day: DayOfWeek;
  start_time: string;
  end_time: string;
  subjects: TimeSlotSubject[];
}

export interface TimeSlotSubject {
  course_subject_id: number;
  subject_name: string;
  teacher_name: string | null;
}

export interface SharedClassNumbersResponse {
  course_subject_id: number;
  total_classes: number;
  shared_class_numbers: number[];
}

// --- Activities ---

export type MomentKey = 'apertura' | 'desarrollo' | 'cierre';

export interface Activity {
  id: number;
  name: string;
  description?: string;
  moment: MomentKey;
  duration_minutes?: number;
}

export interface ActivityUpdate {
  name?: string;
  description?: string;
  moment?: MomentKey;
  duration_minutes?: number;
}

// --- Dynamic Sections (Coord Doc) ---

export interface SectionValue {
  value?: string;
  selected_option?: string;
}

// --- Coordination Document ---

export type CoordinationDocumentStatus = 'pending' | 'in_progress' | 'published';

export interface CoordinationDocument {
  id: number;
  organization_id: number;
  name: string;
  area_id: number;
  area_name: string;
  start_date: string;
  end_date: string;
  status: CoordinationDocumentStatus;
  sections: Record<string, SectionValue>;
  topics: Topic[];
  subjects: DocumentSubject[];
  org_config: { coord_doc_sections: SectionConfig[] };
  created_at: string;
  updated_at: string;
}

export interface DocumentSubject {
  id: number;
  coord_doc_subject_id: number;
  subject_id: number;
  subject_name: string;
  class_count: number;
  topics: Topic[];
  classes: DocumentClass[];
}

export interface DocumentClass {
  id: number;
  class_number: number;
  title: string;
  objective: string;
  topics: Topic[];
  is_shared: boolean;
}

export interface CoordinationDocumentCreate {
  name: string;
  area_id: number;
  start_date: string;
  end_date: string;
  topic_ids: number[];
  subjects: { subject_id: number; class_count: number; topic_ids: number[] }[];
}

export interface CoordinationDocumentUpdate {
  name?: string;
  start_date?: string;
  end_date?: string;
  status?: CoordinationDocumentStatus;
  sections?: Record<string, SectionValue>;
}

// --- Lesson Plans ---

export type LessonPlanStatus = 'pending' | 'in_progress' | 'published';

export interface Moments {
  apertura: MomentData;
  desarrollo: MomentData;
  cierre: MomentData;
}

export interface MomentData {
  activities: number[];
  activityContent: Record<string, string>;
}

export interface LessonPlanFonts {
  global?: number[];
  apertura?: number[];
  desarrollo?: number[];
  cierre?: number[];
}

export type ResourcesMode = 'global' | 'per_moment';

export interface LessonPlan {
  id: number | null;
  course_subject_id: number;
  coordination_document_id: number;
  class_number: number;
  title: string | null;
  objective?: string;
  knowledge_content?: string;
  didactic_strategies?: string;
  class_format?: string;
  status: LessonPlanStatus;
  is_shared: boolean;
  resources_mode: ResourcesMode;
  moments?: Moments;
  fonts?: LessonPlanFonts;
  topics?: Topic[];
  coord_class: {
    title: string;
    objective: string;
    topics: Topic[];
  };
  created_at?: string;
  updated_at?: string;
}

export interface LessonPlanCreate {
  course_subject_id: number;
  coordination_document_id: number;
  class_number: number;
  title?: string;
  topic_ids?: number[];
  moments: Moments;
  resources_mode: ResourcesMode;
  fonts?: LessonPlanFonts;
}

// --- Fonts ---

export interface Font {
  id: number;
  name: string;
  description?: string;
  area_id: number;
  url?: string;
  created_at: string;
}

// --- Resources ---

export interface ResourceType {
  id: number;
  key: string;
  name: string;
  description: string;
  requires_font: boolean;
  prompt: string;
  output_schema: Record<string, unknown>;
  is_custom: boolean;
}

export type ResourceStatus = 'draft' | 'active';

export interface Resource {
  id: number;
  resource_type_id: number;
  resource_type_name: string;
  title: string;
  content: Record<string, unknown>;
  user_id: number;
  font_id?: number;
  course_subject_id?: number;
  status: ResourceStatus;
  created_at: string;
  updated_at: string;
}

export interface ResourceCreate {
  title: string;
  resource_type_id: number;
  font_id?: number;
  course_subject_id?: number;
}

// --- Chat ---

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  message: string;
  history: ChatMessage[];
}

export interface ChatResponse {
  content: string;
  document_updated: boolean;
}

// --- Generate ---

export interface GenerateRequest {
  section_keys?: string[];
  regenerate_class_plans?: boolean;
}

export interface GenerateActivityRequest {
  moment: MomentKey;
  activity_id: number;
}

// --- Notifications ---

export type NotificationType = 'publication' | 'update' | 'deadline';

export interface Notification {
  id: number;
  user_id: number;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

// --- Onboarding ---

export interface OnboardingStatus {
  completed: boolean;
  completed_at?: string;
}

// --- Dashboard ---

export interface PlanningProgress {
  course_subject_id: number;
  course_subject_name: string;
  completed: number;
  total: number;
}
