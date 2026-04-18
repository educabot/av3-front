// =============================================================================
// Alizia Frontend — Types alineados al RFC backend
// Ref: docs/rfc-alizia/tecnico/frontend-integration.md
// =============================================================================

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

// --- Auth ---

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export type UserRole = 'teacher' | 'coordinator' | 'admin';

export interface User {
  // El back usa strings para IDs de usuario (convención team-ai-toolkit).
  // Coercioná en el punto de uso si necesitás comparar con IDs numéricos.
  id: string;
  name: string;
  email: string;
  avatar?: string;
  roles: UserRole[];
}

export interface JWTClaims {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  roles: UserRole[];
  aud?: string[];
  exp?: number;
  iss?: string;
}

// --- Organization & Config (Cosmos) ---

export interface Organization {
  id: string;
  name: string;
  slug: string;
  config: OrgConfig;
}

export interface OrgConfig {
  topic_max_levels: number;
  topic_level_names: string[];
  topic_selection_level: number;
  shared_classes_enabled: boolean;
  desarrollo_max_activities: number;
  coord_doc_sections: SectionConfig[];
  features: Record<string, boolean>;
  visual_identity?: {
    platform_name: string;
    logo_url: string | null;
    primary_color: string;
  };
  ai_settings?: {
    tone: string;
    max_generation_length: number;
    max_chat_interactions: number;
  };
  onboarding?: OnboardingConfig;
}

export interface OnboardingConfig {
  skip_allowed: boolean;
  profile_fields: ProfileField[];
  tour_steps: TourStep[];
}

export interface ProfileField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'multiselect';
  options?: string[];
  required: boolean;
}

export interface TourStep {
  key: string;
  title: string;
  description: string;
  order: number;
  roles?: UserRole[];
  requires_feature?: string;
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

// --- Areas ---

export interface UserCompact {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
}

export interface AreaCoordinator {
  id: number;
  area_id: number;
  user: UserCompact | null;
}

export interface Area {
  id: number;
  name: string;
  description?: string;
  subjects?: Subject[];
  coordinators?: AreaCoordinator[];
}

// --- Subjects ---

export interface Subject {
  id: number;
  area_id: number;
  name: string;
  description?: string;
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

// --- Students ---

export interface Student {
  id: number;
  course_id: number;
  name: string;
}

// --- Course Subjects ---

export interface SubjectCompact {
  id: number;
  name: string;
}

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

// --- Time Slots ---

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';

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

// --- Dynamic Sections (Coord Doc) ---

export type SectionType = 'text' | 'select_text' | 'markdown';

export interface SectionConfig {
  key: string;
  label: string;
  type: SectionType;
  options?: string[];
  ai_prompt: string;
  required: boolean;
}

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
