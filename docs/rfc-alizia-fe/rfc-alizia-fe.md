# RFC: Alizia Frontend — Especificacion de desarrollo

| Campo              | Valor                                      |
|--------------------|--------------------------------------------|
| **Autor(es)**      | Equipo Frontend                            |
| **Estado**         | Borrador                                   |
| **Tipo**           | Frontend / Arquitectura / Modulos          |
| **Creado**         | 2026-04-08                                 |
| **Ultima edicion** | 2026-04-08                                 |
| **Revisores**      | Pendiente                                  |
| **Decision**       | Pendiente                                  |

---

## Historial de versiones

| Version | Fecha      | Autor           | Cambios |
|---------|------------|-----------------|---------|
| 0.1     | 2026-04-08 | Equipo Frontend | Borrador inicial — estructura completa, modulos, brechas, plan |

---

## Indice

- [1. Contexto](#1-contexto)
- [2. Arquitectura frontend](#2-arquitectura-frontend)
- [3. Capa de datos](#3-capa-de-datos)
- [4. Autenticacion y autorizacion](#4-autenticacion-y-autorizacion)
- [5. Rutas y navegacion](#5-rutas-y-navegacion)
- [6. Modulos por epica](#6-modulos-por-epica)
- [7. Integracion IA (detalle frontend)](#7-integracion-ia-detalle-frontend)
- [8. Configuracion dinamica (Cosmos)](#8-configuracion-dinamica-cosmos)
- [9. Analisis de brechas (POC vs RFC)](#9-analisis-de-brechas-poc-vs-rfc)
- [10. Plan de implementacion](#10-plan-de-implementacion)
- [Glosario](#glosario)

---

## 1. Contexto

### 1.1 Relacion con el RFC backend

Este documento es la contraparte frontend del [RFC Alizia backend](../rfc-alizia/rfc-alizia.md). El RFC backend cubre producto, arquitectura Go, modelo de datos (26+ tablas), endpoints API, IA y 12 epicas. Explicitamente declara "Frontend" como no-objetivo.

**Principio: no duplicar, referenciar.** Este RFC no repite flujos de usuario, reglas de negocio ni contratos API ya definidos. En su lugar, referencia los documentos existentes y se enfoca en:

- Como se organizan los modulos frontend
- Que componentes renderizan cada funcionalidad
- Como se consume la API y se maneja el estado
- Que decisiones arquitectonicas aplican al frontend

**Documentos de referencia:**
- [Integracion frontend](../rfc-alizia/tecnico/frontend-integration.md) — guia de consumo de API
- [Endpoints API](../rfc-alizia/tecnico/endpoints.md) — contratos request/response
- [Catalogo de errores](../rfc-alizia/tecnico/errores.md) — codigos de error por dominio
- [Epicas](../rfc-alizia/epicas/epicas.md) — definicion de producto y tareas
- [Cosmos (Epica 10)](../rfc-alizia/epicas/10-cosmos/10-cosmos.md) — configuracion por organizacion

### 1.2 Estado actual del POC

El POC actual fue construido como prototipo funcional. Lo que existe:

| Area | Estado POC |
|------|-----------|
| Paginas | 11 paginas: Login, CoordinatorHome, TeacherHome, Course, Wizard, Document, TeacherCourseSubject, TeacherPlanWizard, TeacherLessonPlan, Resources, ResourceEditor |
| Componentes UI | ~25 componentes (button, card, dialog, input, ChatBot, ActivityCard, etc.) |
| Store | Zustand monolito (~300 lineas), carga todo al inicio con `Promise.all` |
| Auth | Mock: click-to-login sin JWT, sin headers de autorizacion |
| API client | Fetch wrapper sin auth headers, sin error parsing, sin paginacion |
| Tipos | Hardcoded: `ProblematicNucleus > KnowledgeArea > Category` (3 niveles fijos) |
| Routing | Sin guards de rol, sin lazy loading |
| Errores | Solo `console.error`, sin toasts de error, sin error boundaries |
| Tests | No existen |
| Onboarding | No existe |
| Dashboard | No existe (paginas home basicas) |

### 1.3 Stack tecnologico

**Confirmado del POC (se mantiene):**

| Tecnologia | Version | Rol |
|---|---|---|
| React | 19.1.1 | Framework UI |
| TypeScript | ~5.8.3 | Tipado estricto |
| Vite | 7.1.7 | Build tool (SWC) |
| Tailwind CSS | 4.1.13 | Estilos utilitarios |
| Zustand | 5.0.8 | Estado global |
| React Router | 7.12.0 | Enrutamiento |
| Radix UI | Multiples | Primitivos accesibles |
| Biome | 2.2.4 | Linting + formato |
| CVA | class-variance-authority | Variantes de componentes |
| Lucide React | 0.544.0 | Iconografia |
| Sonner | 2.0.7 | Toast notifications |
| Motion | 12.23.22 | Animaciones |
| date-fns | 4.1.0 | Utilidades de fecha |

**Nuevas dependencias para v2:**

| Tecnologia | Rol |
|---|---|
| Vitest + Testing Library | Tests unitarios y de componentes |
| MSW (Mock Service Worker) | Mock de API en tests |
| React Error Boundary | Manejo de errores a nivel de ruta |

---

## 2. Arquitectura frontend

### 2.1 Estructura de directorios

```
src/
├── components/
│   ├── ui/             # Componentes base reutilizables (button, card, input, dialog, etc.)
│   └── layout/         # Header, Sidebar, MainLayout
├── features/           # Modulos por dominio (organizados por epica)
│   ├── auth/           # Login, JWT, ProtectedRoute
│   ├── onboarding/     # Wizard de onboarding, ProfileForm, ProductTour
│   ├── coordination/   # Documento de coordinacion (wizard, editor, secciones)
│   ├── teaching/       # Lesson plans, momentos, actividades
│   ├── resources/      # Library, editor, tipos de recurso
│   ├── dashboard/      # Dashboard coordinador y docente
│   └── ai/             # ChatPanel reutilizable, GenerateButton
├── pages/              # Componentes de pagina (1:1 con rutas)
├── services/           # Cliente API, interceptores
├── store/              # Zustand slices por dominio
├── types/              # Interfaces TypeScript por dominio
├── hooks/              # Hooks custom reutilizables
├── lib/                # Utilidades (cn, formatters)
└── config/             # Constantes, feature flags, env vars
```

**Principio de co-locacion:** Los componentes especificos de un feature viven en `features/<dominio>/components/`. Solo los componentes compartidos entre multiples features van en `components/ui/`.

### 2.2 Patrones de componentes

**Patron base (ya usado en el POC, se confirma como estandar):**

1. **CVA para variantes** — `buttonVariants`, `badgeVariants`, etc. con `variant` y `size`
2. **Compound components** — Card (CardHeader, CardContent, CardFooter), Tabs, Dialog
3. **forwardRef** para todos los componentes reutilizables
4. **Radix `asChild`** para componentes polimorficos via Slot

**Patron nuevo: componentes config-driven**

Para renderizar UI dinamica segun la configuracion de la organizacion (Cosmos):

```typescript
// DynamicSectionRenderer: renderiza editores segun coord_doc_sections config
<DynamicSectionRenderer
  sections={orgConfig.coord_doc_sections}
  values={document.sections}
  onChange={handleSectionChange}
/>
```

Cada `type` en la config mapea a un componente:
- `text` → `<Textarea />`
- `select_text` → `<Select />` + `<Textarea />`
- `markdown` → `<MarkdownEditor />` (futuro)

### 2.3 Manejo de errores

**Tres capas:**

1. **ErrorBoundary a nivel de ruta** — Cada pagina envuelta en un error boundary que muestra UI de fallback
2. **Interceptor API** — Parsea `APIError` del backend, maneja 401 (redirect a login), muestra toast via Sonner para errores de usuario
3. **Triple loading/error/empty** — Todo componente que hace data fetching implementa 3 estados:
   - **Loading**: Skeleton placeholder
   - **Error**: Mensaje de error con opcion de reintentar
   - **Empty**: Estado vacio con mensaje contextual

**Mapeo de errores del backend a mensajes de usuario:**

```typescript
const ERROR_MESSAGES: Record<string, string> = {
  UNAUTHORIZED: 'Tu sesion expiro. Inicia sesion nuevamente.',
  FORBIDDEN: 'No tenes permisos para esta accion.',
  NOT_FOUND: 'El recurso no fue encontrado.',
  VALIDATION_ERROR: 'Revisa los datos ingresados.',
  AI_GENERATION_ERROR: 'Error al generar con IA. Intenta nuevamente.',
  AI_RATE_LIMITED: 'Demasiadas solicitudes. Espera un momento.',
  DOCUMENT_NOT_DRAFT: 'Solo se pueden editar documentos en borrador.',
  INVALID_MOMENT_ACTIVITIES: 'Revisa las actividades seleccionadas por momento.',
  LESSON_PLAN_INCOMPLETE: 'Completa todos los campos antes de publicar.',
};
```

---

## 3. Capa de datos

### 3.1 Cliente API

Refactorizar `src/services/api.ts` completamente:

```typescript
// Base URL desde variable de entorno
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Fetch wrapper con auth y error handling
async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = useAuthStore.getState().token;
  const res = await fetch(`${BASE_URL}/api/v1${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json();
    if (res.status === 401) {
      useAuthStore.getState().logout();
      throw new AuthError(error.error.code, error.error.message);
    }
    throw new APIError(error.error.code, error.error.message, error.error.details);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// Helpers tipados
export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint),
  post: <T>(endpoint: string, data: unknown) => request<T>(endpoint, { method: 'POST', body: JSON.stringify(data) }),
  patch: <T>(endpoint: string, data: unknown) => request<T>(endpoint, { method: 'PATCH', body: JSON.stringify(data) }),
  put: <T>(endpoint: string, data: unknown) => request<T>(endpoint, { method: 'PUT', body: JSON.stringify(data) }),
  delete: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
};
```

**Paginacion** — helper para patron "has more" del backend:

```typescript
interface PaginatedResponse<T> {
  items: T[];
  more: boolean;
}

// Hook reutilizable
function usePaginatedList<T>(endpoint: string, limit = 20) {
  const [items, setItems] = useState<T[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const loadMore = async () => {
    const res = await api.get<PaginatedResponse<T>>(`${endpoint}?limit=${limit}&offset=${offset}`);
    setItems(prev => [...prev, ...res.items]);
    setHasMore(res.more);
    setOffset(prev => prev + res.items.length);
  };

  return { items, hasMore, loadMore };
}
```

### 3.2 Interfaces TypeScript

**Brechas criticas entre tipos del POC y el RFC:**

| Entidad | POC actual | RFC requiere | Delta |
|---------|-----------|-------------|-------|
| Topics | 3 tipos separados: `ProblematicNucleus`, `KnowledgeArea`, `Category` | Unico tipo `Topic` recursivo con `level`, `parent_id`, `children` | **Reescribir** — eliminar 3 tipos, crear 1 generico |
| CoordinationDocument | `problem_edge: string`, `methodological_strategies: MethodologicalStrategies`, `eval_criteria: string` como campos directos | `sections: Record<string, SectionValue>` dinamico + `org_config: { coord_doc_sections }` | **Reescribir** — campos fijos → JSONB dinamico |
| CoordinationDocument status | `'draft' \| 'published' \| 'archived'` | `'pending' \| 'in_progress' \| 'published'` | **Actualizar** estados |
| LessonPlan | `global_font_id` / `moment_font_ids` como campos planos | `fonts: { global?: number[], apertura?: number[], ... }` como objeto + `resources_mode` | **Refactorizar** estructura de fonts |
| Resource | `resource_type: 'lecture_guide' \| 'course_sheet'` (enum hardcoded) | `resource_type_id: number` + `content: Record<string, any>` dinamico | **Reescribir** — enum → referencia a tipo configurable |
| User | Sin `organization_id`, sin `roles`, sin `profile_data` | Campos completos con multi-rol y onboarding | **Ampliar** |
| Organization | No existe | `{ id, name, slug, config: OrgConfig }` con JSONB config | **Crear** |
| Paginacion | No existe | `PaginatedResponse<T> = { items: T[], more: boolean }` | **Crear** |

**Interfaces principales alineadas al RFC:**

```typescript
// --- Organizacion ---
interface Organization {
  id: number;
  name: string;
  slug: string;
  config: OrgConfig;
  created_at: string;
}

interface OrgConfig {
  topic_max_levels: number;
  topic_level_names: string[];
  topic_selection_level: number;
  shared_classes_enabled: boolean;
  desarrollo_max_activities: number;
  coord_doc_sections: SectionConfig[];
  modules: Record<string, boolean>;
  visual_identity?: { platform_name: string; logo_url: string | null; primary_color: string };
  ai_settings?: { tone: string; max_generation_length: number; max_chat_interactions: number };
  onboarding?: { allow_skip: boolean; profile_fields: ProfileField[]; tour_steps: TourStep[] };
}

// --- Topics (reemplaza ProblematicNucleus, KnowledgeArea, Category) ---
interface Topic {
  id: number;
  name: string;
  description?: string;
  level: number;
  parent_id: number | null;
  children: Topic[];
}

// --- Coordination Document ---
interface CoordinationDocument {
  id: number;
  organization_id: number;
  name: string;
  area_id: number;
  area_name: string;
  start_date: string;
  end_date: string;
  status: 'pending' | 'in_progress' | 'published';
  sections: Record<string, SectionValue>;
  topics: Topic[];
  subjects: DocumentSubject[];
  org_config: { coord_doc_sections: SectionConfig[] };
  created_at: string;
  updated_at: string;
}

interface SectionConfig {
  key: string;
  label: string;
  type: 'text' | 'select_text' | 'markdown';
  options?: string[];
  ai_prompt: string;
  required: boolean;
}

interface SectionValue {
  value?: string;
  selected_option?: string;
}

interface DocumentSubject {
  id: number;
  coord_doc_subject_id: number;
  subject_id: number;
  subject_name: string;
  class_count: number;
  topics: Topic[];
  classes: DocumentClass[];
}

interface DocumentClass {
  id: number;
  class_number: number;
  title: string;
  objective: string;
  topics: Topic[];
  is_shared: boolean;
}

// --- Lesson Plan ---
interface LessonPlan {
  id: number | null;
  course_subject_id: number;
  coordination_document_id: number;
  class_number: number;
  title: string | null;
  objective?: string;
  knowledge_content?: string;
  didactic_strategies?: string;
  class_format?: string;
  status: 'pending' | 'in_progress' | 'published';
  is_shared: boolean;
  resources_mode: 'global' | 'per_moment';
  moments?: Moments;
  fonts?: LessonPlanFont[];
  topics?: Topic[];
  coord_class: { title: string; objective: string; topics: Topic[] };
  created_at?: string;
  updated_at?: string;
}

interface Moments {
  apertura: { activities: number[]; activityContent: Record<string, string> };
  desarrollo: { activities: number[]; activityContent: Record<string, string> };
  cierre: { activities: number[]; activityContent: Record<string, string> };
}

interface LessonPlanFont {
  moment: 'global' | 'apertura' | 'desarrollo' | 'cierre';
  font_id: number;
  font_name: string;
}

// --- Resources ---
interface ResourceType {
  id: number;
  key: string;
  name: string;
  description: string;
  requires_font: boolean;
  prompt: string;
  output_schema: Record<string, unknown>;
  is_custom: boolean;
}

interface Resource {
  id: number;
  resource_type_id: number;
  resource_type_name: string;
  title: string;
  content: Record<string, unknown>;  // Dinamico segun output_schema
  user_id: number;
  font_id?: number;
  course_subject_id?: number;
  status: 'draft' | 'active';
  created_at: string;
  updated_at: string;
}
```

> Ver [frontend-integration.md](../rfc-alizia/tecnico/frontend-integration.md) para la referencia completa de tipos.

### 3.3 Zustand store

Dividir el monolito actual en slices por dominio:

| Slice | Estado | Acciones |
|-------|--------|----------|
| `authSlice` | `token`, `user`, `roles` | `login()`, `logout()`, `isAuthenticated()`, `isCoordinator()`, `isTeacher()` |
| `configSlice` | `orgConfig`, `nomenclature` | `loadConfig()`, `getFeatureFlag()`, `getLevelName()` |
| `coordinationSlice` | `documents`, `currentDocument`, `wizardData`, `chatHistory` | `fetchDocuments()`, `createDocument()`, `updateSection()`, `generate()`, `sendChat()` |
| `teachingSlice` | `lessonPlans`, `currentPlan`, `lessonWizardData`, `teacherChatHistory` | `fetchPlans()`, `createPlan()`, `updatePlan()`, `generateActivity()` |
| `resourcesSlice` | `resources`, `currentResource`, `resourceTypes` | `fetchResources()`, `createResource()`, `generateContent()` |
| `referenceSlice` | `areas`, `subjects`, `topics`, `courses`, `activities`, `fonts` | `fetchAreas()`, `fetchTopics()`, `fetchActivities()`, etc. |
| `uiSlice` | `sidebarOpen`, `expandedSections` | `toggleSidebar()`, `toggleSection()` |

**Principio:** Cada modulo carga sus propios datos cuando se monta. No hay `loadAllData()` global. Los datos de referencia (areas, subjects, topics) se cargan una vez y se cachean en el store.

### 3.4 Estrategia de cache

| Tipo de dato | Cache | Razon |
|---|---|---|
| Org config | Session lifetime | Rara vez cambia. Se carga al login |
| Areas, subjects, topics, activities | Stale-while-revalidate (5 min) | Datos de referencia, cambian poco |
| Documents, lesson plans, resources | Sin cache | Datos mutables, siempre fresh |
| User profile | Session lifetime | Cambia solo en onboarding |

---

## 4. Autenticacion y autorizacion

### 4.1 Flujo JWT

```
1. Usuario ingresa email + password
2. POST /api/v1/auth/login → { token, user }
3. Token se guarda en memoria (authSlice.token) — NO en localStorage
4. Todas las requests llevan Authorization: Bearer <token>
5. Si 401 → authSlice.logout() → redirect a /login
6. No hay refresh token en MVP (backend RFC: "No hay refresh token en el MVP")
```

**Claims del JWT** (visibles para el frontend):

```typescript
interface JWTClaims {
  id: string;
  name: string;
  email: string;
  avatar: string;
  roles: ('teacher' | 'coordinator' | 'admin')[];
}
```

> `organization_id` se extrae en el backend, no es visible en el JWT.

### 4.2 Control de acceso por rol

**Hook `useAuth`:**

```typescript
function useAuth() {
  const { token, user, roles, logout } = useAuthStore();
  return {
    user,
    roles,
    isAuthenticated: !!token,
    isCoordinator: roles.includes('coordinator'),
    isTeacher: roles.includes('teacher'),
    isAdmin: roles.includes('admin'),
    logout,
  };
}
```

**Usuarios multi-rol:** Un usuario puede ser coordinator Y teacher. El frontend muestra la UI de ambos roles simultaneamente (sidebar con items de coordinador y docente).

### 4.3 Rutas protegidas

```typescript
// Componente wrapper para rutas protegidas
function ProtectedRoute({ roles, children }: { roles?: MemberRole[]; children: ReactNode }) {
  const { isAuthenticated, roles: userRoles } = useAuth();

  if (!isAuthenticated) return <Navigate to="/login" />;
  if (roles && !roles.some(r => userRoles.includes(r))) return <Navigate to="/" />;

  return children;
}

// Componente wrapper para feature flags (Cosmos)
function RequireModule({ module, children }: { module: string; children: ReactNode }) {
  const enabled = useFeatureFlag(module);
  if (!enabled) return <Navigate to="/" />;
  return children;
}
```

---

## 5. Rutas y navegacion

### 5.1 Mapa de rutas

| Ruta | Pagina | Roles | Lazy | Descripcion |
|------|--------|-------|------|-------------|
| `/login` | LoginPage | Publico | No | Email + password → JWT |
| `/onboarding` | OnboardingPage | Todos | Si | Primer ingreso: perfil + tour |
| `/` | Redirect | Todos | — | Redirige segun rol principal |
| `/coordinator` | CoordinatorDashboard | coordinator | Si | Dashboard: documentos, progreso |
| `/coordinator/documents` | DocumentListPage | coordinator | Si | Lista documentos de coordinacion |
| `/coordinator/documents/new` | DocumentWizardPage | coordinator | Si | Wizard 3 pasos |
| `/coordinator/documents/:id` | DocumentEditorPage | coordinator | Si | Editor con secciones + chat IA |
| `/teacher` | TeacherDashboard | teacher | Si | Dashboard: clases, planes pendientes |
| `/teacher/courses/:csId` | TeacherCoursePage | teacher | Si | Detalle curso + planes de clase |
| `/teacher/courses/:csId/plans/:classNumber/new` | LessonPlanWizardPage | teacher | Si | Wizard creacion plan |
| `/teacher/plans/:id` | LessonPlanEditorPage | teacher | Si | Editor momentos + chat IA |
| `/resources` | ResourceLibraryPage | teacher | Si | Library con filtro por disciplina |
| `/resources/new` | ResourceCreatePage | teacher | Si | Tipo + font → generar |
| `/resources/:id` | ResourceEditorPage | teacher | Si | Editor contenido dinamico |

### 5.2 Lazy loading

Todas las paginas se cargan con `React.lazy` + `Suspense`:

```typescript
const CoordinatorDashboard = lazy(() => import('./pages/CoordinatorDashboard'));
const DocumentWizard = lazy(() => import('./pages/DocumentWizard'));
// ...

<Suspense fallback={<PageSkeleton />}>
  <Route path="/coordinator" element={<CoordinatorDashboard />} />
</Suspense>
```

### 5.3 Navegacion

**Sidebar dinamica por rol y feature flags:**

```typescript
const sidebarItems = [
  // Coordinador
  { label: 'Dashboard', path: '/coordinator', icon: Home, roles: ['coordinator'] },
  { label: 'Documentos', path: '/coordinator/documents', icon: FileText, roles: ['coordinator'] },
  // Docente
  { label: 'Dashboard', path: '/teacher', icon: Home, roles: ['teacher'] },
  { label: 'Mis cursos', path: '/teacher/courses', icon: BookOpen, roles: ['teacher'] },
  // Recursos (feature flag)
  { label: 'Recursos', path: '/resources', icon: Library, roles: ['teacher'], module: 'contenido' },
];

// Filtrar por rol del usuario y feature flags activos
const visibleItems = sidebarItems.filter(item =>
  item.roles.some(r => userRoles.includes(r)) &&
  (!item.module || getFeatureFlag(item.module))
);
```

**Nomenclatura dinamica:** Los labels del sidebar y breadcrumbs pueden usar nombres de la config de la org (ej: "Documento de coordinacion" podria llamarse diferente segun provincia). Se resuelve via `useNomenclature()` hook.

---

## 6. Modulos por epica

### 6.1 Epica 1 — Roles y accesos

**Paginas:** LoginPage
**Componentes:** `LoginForm` (email + password), `RoleBadge`

**Flujo:**
1. Usuario ingresa email + password
2. `POST /api/v1/auth/login` → recibe JWT + user data
3. Almacena token en `authSlice`
4. Decodifica claims → extrae roles
5. Si multi-rol → redirige a `/` (la home decide que mostrar)
6. Si `onboarding_completed_at` es null → redirige a `/onboarding`

**Diferencia con POC:** El POC muestra una lista de usuarios para clickear. Se reemplaza por un formulario real de login.

### 6.2 Epica 2 — Onboarding

**Paginas:** OnboardingPage
**Componentes:** `OnboardingWizard`, `ProfileForm`, `ProductTour`

**Flujo:**
1. `GET /api/v1/users/me/onboarding-status` → `{ completed: false }`
2. Si `org.config.onboarding.profile_fields` tiene campos → mostrar `ProfileForm` con campos dinamicos
3. Si `org.config.onboarding.tour_steps` tiene pasos → mostrar `ProductTour`
4. `POST /api/v1/users/me/onboarding/complete` → marca completado
5. Redirect a home del rol

**Componentes config-driven:**
- `ProfileForm`: los campos se renderizan segun `onboarding.profile_fields` de la config
- `ProductTour`: los pasos se definen en `onboarding.tour_steps`
- Si `onboarding.allow_skip` es true → mostrar boton "Saltar"

**No existe en el POC.** Se construye desde cero.

### 6.3 Epica 3 — Integracion (datos de referencia)

**Paginas:** Ninguna dedicada (admin gestiona via API)
**Componentes:** `TopicTree`, `ScheduleGrid`, `SharedClassBadge`

El frontend **consume** estos datos pero no los gestiona:
- Areas, subjects → listados con paginacion
- Topics → arbol recursivo con niveles configurables
- Courses, students, course_subjects → listados
- Time slots → grilla horaria con indicador de clases compartidas
- Activities → filtradas por momento

**Componente clave — `TopicTree`:**

```typescript
// Renderiza arbol de topics respetando topic_max_levels de la config
<TopicTree
  topics={topics}                           // Arbol completo de GET /topics
  maxLevels={orgConfig.topic_max_levels}    // Profundidad maxima
  levelNames={orgConfig.topic_level_names}  // Nombres por nivel
  selectionLevel={orgConfig.topic_selection_level}  // Nivel en el que se seleccionan
  selected={selectedTopicIds}
  onSelect={handleTopicSelect}
/>
```

Reemplaza los 3 componentes hardcoded del POC (selectors de Nucleus, KnowledgeArea, Category) por un unico arbol generico.

### 6.4 Epica 4 — Documento de coordinacion

**Paginas:** DocumentListPage, DocumentWizardPage, DocumentEditorPage
**Componentes principales:**

| Componente | Descripcion |
|---|---|
| `DocumentCard` | Tarjeta en listado: nombre, area, estado, fechas |
| `DocumentWizard` | Wizard 3 pasos (topics → periodo → asignacion) |
| `TopicSelector` | Seleccion de topics al nivel `topic_selection_level` |
| `SubjectClassConfig` | Configura class_count y asigna topics por disciplina |
| `DynamicSectionRenderer` | Renderiza secciones segun `coord_doc_sections` config |
| `SectionEditor` | Editor segun type: text, select_text, markdown |
| `ClassPlanTable` | Tabla de clases por disciplina con titulo, objetivo, topics |
| `PublishValidation` | Valida secciones requeridas y completitud antes de publicar |
| `SharedClassIndicator` | Badge en clases con `is_shared: true` |

**Wizard (3 pasos):**

1. **Paso 1 — Topics**: `TopicTree` con `selectionLevel` para seleccionar al nivel correcto
2. **Paso 2 — Periodo**: Fechas inicio/fin + class_count por disciplina (autocompletado calculable)
3. **Paso 3 — Asignacion**: Distribuir topics seleccionados entre disciplinas del area

**Request final:** `POST /api/v1/coordination-documents` con `{ name, area_id, start_date, end_date, topic_ids, subjects: [{ subject_id, class_count, topic_ids }] }`

**Editor — Secciones dinamicas:**

El editor itera `org_config.coord_doc_sections` y renderiza un `SectionEditor` por cada una:
- `type: "text"` → Textarea editable
- `type: "select_text"` → Select con opciones + Textarea (el select popula `selected_option`, el textarea popula `value`)
- `type: "markdown"` → Editor markdown (futuro)

Guardado: `PATCH /coordination-documents/:id` con merge parcial de `sections`.

**Generacion IA:** Boton "Generar con Alizia" → `POST /coordination-documents/:id/generate`. Puede generar todo o solo `section_keys` especificas.

**Chat:** Usa el componente `ChatPanel` (ver seccion 7). Al recibir `document_updated: true`, refetch del documento.

**Publicacion:** Validar antes con `canPublish()` — todas las secciones `required` deben tener `value`, todas las disciplinas deben tener clases. Ver [frontend-integration.md#validacion-al-publicar](../rfc-alizia/tecnico/frontend-integration.md).

### 6.5 Epica 5 — Planificacion docente

**Paginas:** TeacherCoursePage, LessonPlanWizardPage, LessonPlanEditorPage
**Componentes principales:**

| Componente | Descripcion |
|---|---|
| `ClassCard` | Tarjeta por clase: numero, titulo (del coord doc), estado del plan, badge `is_shared` |
| `MomentEditor` | Editor por momento (apertura/desarrollo/cierre) |
| `ActivitySelector` | Seleccion de actividades filtradas por momento |
| `ActivityContentEditor` | Editor del contenido generado por actividad |
| `FontSelector` | Selector de fuentes educativas (global o per_moment) |
| `MomentsValidation` | Valida constraints: apertura=1, desarrollo=1..N, cierre=1 |
| `ResourceModeToggle` | Switch entre modo global y per_moment para fuentes |

**Flujo:**

1. `GET /course-subjects/:id/lesson-plans` → lista con todas las clases (coord_class + lesson plan si existe)
2. Click en clase sin plan → LessonPlanWizardPage
3. Wizard: titulo, objetivo, topics → actividades por momento → fuentes
4. `POST /lesson-plans` con moments, fonts, etc.
5. Generacion de contenido: `POST /lesson-plans/:id/generate-activity` por cada actividad
6. Edicion: `PATCH /lesson-plans/:id`
7. Publicacion: `PATCH /lesson-plans/:id/status` → `{ status: "published" }`

**Validacion de momentos:**
- Apertura: exactamente 1 actividad
- Desarrollo: 1 a `config.desarrollo_max_activities` actividades
- Cierre: exactamente 1 actividad

**Clases compartidas:** El `ClassCard` muestra badge si `is_shared: true`. El docente sabe que otro docente tiene esa clase simultaneamente.

### 6.6 Epica 6 — Asistente IA

**Componentes:** `ChatPanel` (reutilizable), `GenerateButton`, `LoadingOrb`

El asistente IA es transversal — se usa en documentos de coordinacion, lesson plans y recursos. Ver **seccion 7** para detalle de implementacion.

### 6.7 Epica 7 — Dashboard

**Paginas:** CoordinatorDashboard, TeacherDashboard
**Componentes:**

**Coordinador:**
| Componente | Descripcion |
|---|---|
| `DocumentStatusCard` | Estado de cada documento: draft/in_progress/published |
| `PlanningProgressBar` | Progreso de planificacion docente por curso (X/Y clases planificadas) |
| `CourseOverview` | Resumen de cursos del area con estado de asignaciones |

**Docente:**
| Componente | Descripcion |
|---|---|
| `UpcomingClassesWidget` | Proximas clases con estado del plan |
| `PendingPlansCard` | Planes pendientes de completar |
| `PublishedDocumentsCard` | Documentos de coordinacion publicados para mis disciplinas |
| `NotificationList` | Notificaciones (publicaciones, actualizaciones, deadlines) |

**No existe en el POC.** Las paginas `CoordinatorHome` y `TeacherHome` actuales son basicas. Se construye desde cero con widgets de datos agregados.

### 6.8 Epica 8 — Contenido y recursos

**Paginas:** ResourceLibraryPage, ResourceCreatePage, ResourceEditorPage
**Componentes:**

| Componente | Descripcion |
|---|---|
| `ResourceTypeSelector` | Seleccion de tipo de recurso (de `GET /resource-types`) |
| `FontRequirementSelector` | Selector de font si `requires_font: true` |
| `DynamicContentRenderer` | Renderiza `content` segun `output_schema` del tipo |
| `ResourceCard` | Tarjeta en library: titulo, tipo, status |

**Flujo de creacion:**
1. `GET /resource-types` → mostrar tipos disponibles
2. Si tipo `requires_font` → `GET /fonts?area_id=X` → selector
3. `POST /resources` → crea recurso en draft con content vacio
4. `POST /resources/:id/generate` → genera contenido con IA
5. El `content` generado sigue el `output_schema` del tipo
6. `DynamicContentRenderer` itera el schema y renderiza inputs editables
7. `PATCH /resources/:id` para guardar ediciones manuales

**Renderizado dinamico de content:**

El `output_schema` define la estructura. Ejemplo para "guia de lectura":
```json
{ "title": "string", "sections": [{ "heading": "string", "content": "string" }] }
```
El renderer genera: H3 para `heading`, Textarea para `content`, con posibilidad de agregar/eliminar secciones.

**Library:** Filtro soft por disciplina (UX only, no permisos — regla de negocio #13). Cualquier docente de la org puede ver todos los recursos.

### 6.9 Epica 10 — Cosmos (configuracion transversal)

**Paginas:** Ninguna dedicada
**Hooks y patrones:**

```typescript
// Hook para acceder a la config de la org
function useOrgConfig(): OrgConfig {
  return useConfigStore(state => state.orgConfig);
}

// Hook para feature flags
function useFeatureFlag(module: string): boolean {
  const config = useOrgConfig();
  return config.modules?.[module] ?? true; // Default: habilitado
}

// Hook para nomenclatura dinamica
function useNomenclature(key: string): string {
  const config = useOrgConfig();
  return config.nomenclature?.[key] ?? DEFAULT_NOMENCLATURE[key];
}

// Hook para nombres de niveles de topics
function useLevelName(level: number): string {
  const config = useOrgConfig();
  return config.topic_level_names?.[level - 1] ?? `Nivel ${level}`;
}
```

**Identidad visual:**

La config `visual_identity` se aplica como CSS custom properties al iniciar la app:

```typescript
// Al cargar config
function applyVisualIdentity(config: OrgConfig) {
  const root = document.documentElement;
  if (config.visual_identity?.primary_color) {
    root.style.setProperty('--color-primary', config.visual_identity.primary_color);
  }
  // Logo y nombre se leen directamente del config en el Header
}
```

**Feature flags en accion:**
- `modules.contenido = false` → oculta "Recursos" del sidebar, `/resources` retorna redirect
- `modules.planificacion = false` → oculta flujo de lesson plans
- `shared_classes_enabled = false` → no muestra badges de clase compartida

---

## 7. Integracion IA (detalle frontend)

### 7.1 Patron ChatPanel

Componente reutilizable usado en documentos, lesson plans y recursos:

```typescript
interface ChatPanelProps {
  entityType: 'coordination-document' | 'lesson-plan' | 'resource';
  entityId: number;
  onEntityUpdated: () => void;  // Callback para refetch de la entidad
  placeholder?: string;
}
```

**Comportamiento:**
1. Mantiene historial de mensajes en estado local
2. Envia `{ message, history }` al endpoint de chat de la entidad
3. Recibe respuesta con `content` y `document_updated: boolean`
4. Si `document_updated: true` → llama `onEntityUpdated()` para refetch
5. Agrega ambos mensajes (user + assistant) al historial local

**Endpoints de chat por entidad:**
- Documento: `POST /coordination-documents/:id/chat`
- Lesson plan: `POST /lesson-plans/:id/chat` (futuro)
- General: `POST /chat`

### 7.2 Generacion de contenido

**Patron "Generar con Alizia":**

```typescript
interface GenerateButtonProps {
  onClick: () => Promise<void>;
  label?: string;         // Default: "Generar con Alizia"
  isGenerating: boolean;
}
```

**Estados durante generacion:**
1. Click en "Generar" → `isGenerating = true`
2. UI: desactiva edicion, muestra skeleton en las secciones que se generan
3. Respuesta exitosa → actualiza secciones, `isGenerating = false`
4. Error → toast con mensaje, restaura estado anterior, `isGenerating = false`

**Generacion parcial vs completa:**
- Sin `section_keys` → genera todo (secciones + opcionalmente plan de clases)
- Con `section_keys: ["problem_edge"]` → genera solo esa seccion
- El frontend permite botones "Generar" individuales por seccion

### 7.3 Estados de carga y error

| Estado | UI | Accion |
|--------|-----|--------|
| Generando | Skeleton + "Generando..." | Desactiva edicion |
| Chat pensando | Indicador loading en chat | Desactiva input |
| Error de IA | Toast "Error al generar. Intenta nuevamente." | Boton retry |
| Rate limited | Toast "Demasiadas solicitudes. Espera un momento." | Cooldown visual |
| Timeout | Toast "La generacion tardo demasiado." | Boton retry |

---

## 8. Configuracion dinamica (Cosmos)

### 8.1 Carga de configuracion

1. **Al login exitoso**: `GET /api/v1/auth/me` retorna user + org info
2. **Config completa**: Se obtiene como parte del response del documento o via endpoint dedicado
3. Se almacena en `configSlice` y esta disponible via `useOrgConfig()`

### 8.2 Secciones dinamicas

El patron mas complejo del frontend. El array `coord_doc_sections` en la config define que secciones tiene el documento de coordinacion:

```
org_config.coord_doc_sections → DynamicSectionRenderer → SectionEditor (por type)
```

Cada seccion tiene:
- `key` — identificador unico
- `label` — nombre visible
- `type` — determina el componente de edicion
- `options` — solo para `select_text`
- `ai_prompt` — usado por el backend para generar
- `required` — validacion al publicar

El frontend NO necesita conocer el `ai_prompt` — eso es backend-only. Pero lo recibe en el response para completitud.

### 8.3 Feature flags

```typescript
// Uso en componentes
const canShowResources = useFeatureFlag('contenido');
const canShowPlanning = useFeatureFlag('planificacion');

// Uso en rutas
<Route path="/resources" element={
  <RequireModule module="contenido">
    <ResourceLibraryPage />
  </RequireModule>
} />
```

### 8.4 Identidad visual

| Config | Uso en frontend |
|--------|----------------|
| `platform_name` | Titulo en Header, tab del browser |
| `logo_url` | Logo en Header y Login |
| `primary_color` | CSS custom property `--color-primary`, aplicada a botones, links, accents |

---

## 9. Analisis de brechas (POC vs RFC)

### 9.1 Tabla de brechas

| Area | Estado POC | Requisito RFC | Prioridad | Esfuerzo |
|------|-----------|--------------|-----------|----------|
| **Autenticacion** | Click-to-login mock | JWT (email+password), token en memoria, 401 redirect | Critica | Medio |
| **Cliente API** | Fetch sin auth ni error handling | Auth header, error interceptor, toast, paginacion | Critica | Medio |
| **Tipos TypeScript** | 3 tipos hardcoded para topics, campos fijos en Document | Topic generico recursivo, sections dinamicas, tipos alineados | Critica | Alto |
| **Store** | Monolito 300 lineas, carga todo al inicio | Slices por dominio, carga per-module | Alta | Alto |
| **Routing** | Sin guards, sin lazy loading | ProtectedRoute, RequireModule, React.lazy | Alta | Medio |
| **Manejo de errores** | Solo console.error | ErrorBoundary, toast, loading/error/empty states | Alta | Medio |
| **Paginacion** | No implementada | Patron "has more", hook usePaginatedList | Alta | Bajo |
| **Onboarding** | No existe | Wizard multi-paso, profile form dinamico, product tour | Media | Alto |
| **Dashboard** | Paginas home basicas | Widgets de datos agregados, progreso, notificaciones | Media | Alto |
| **Config dinamica** | No existe (valores hardcoded) | useOrgConfig, feature flags, identidad visual, nomenclatura | Alta | Medio |
| **Tests** | No existen | Vitest + Testing Library + MSW | Alta | Alto |
| **Accesibilidad** | Parcial (Radix provee base) | Keyboard nav, ARIA labels, focus management | Media | Medio |

### 9.2 Lo que se reutiliza del POC

| Componente/Modulo | Estado | Accion |
|---|---|---|
| Componentes UI (button, card, input, dialog, select, tabs, etc.) | Funcionales | Mantener tal cual |
| Layout (Header, Sidebar, MainLayout) | Funcional | Refactorizar sidebar para dinamismo por rol |
| Estructura de paginas (Wizard, Document, LessonPlan) | Estructura base OK | Refactorizar para usar nuevos tipos y API |
| ChatBot component | Funcional | Evolucionar a ChatPanel reutilizable |
| Patron CVA + Radix | Consolidado | Mantener como estandar |
| AnimatedOrb | Funcional | Mantener para loading states de IA |
| Design tokens (colores, tipografia) | Definidos en index.css | Mantener, hacer overrideable por Cosmos |

### 9.3 Lo que se descarta

| Componente/Modulo | Razon |
|---|---|
| Auth mock (click-to-login) | Reemplazado por JWT real |
| `api.ts` sin auth | Reemplazado por cliente con interceptor |
| Tipos `ProblematicNucleus`, `KnowledgeArea`, `Category` | Reemplazados por `Topic` generico |
| `CoordinationDocument` con campos fijos (`problem_edge`, etc.) | Reemplazado por `sections: Record<string, SectionValue>` |
| `loadAllData()` global en App.tsx | Reemplazado por carga per-module |
| Store monolito (`useStore.ts`) | Reemplazado por slices |

### 9.4 Lo que se construye desde cero

| Modulo | Descripcion |
|---|---|
| Flujo JWT completo | Login form, token storage, 401 handling |
| Onboarding | Wizard, profile form dinamico, product tour |
| Dashboard coordinador | Widgets de estado de documentos y progreso |
| Dashboard docente | Clases proximas, planes pendientes, notificaciones |
| `TopicTree` generico | Arbol recursivo con niveles configurables |
| `DynamicSectionRenderer` | Renderiza secciones segun config |
| `DynamicContentRenderer` | Renderiza contenido de recursos segun output_schema |
| Protected routes | ProtectedRoute + RequireModule |
| Error handling UI | ErrorBoundary, toast interceptor, loading/error/empty |
| Config hooks | useOrgConfig, useFeatureFlag, useNomenclature |
| Test suite | Vitest + Testing Library + MSW |

---

## 10. Plan de implementacion

### 10.1 Fases

Las fases frontend se alinean con las fases del backend para permitir desarrollo en paralelo:

| Fase FE | Contenido | Depende de (Backend) | Epicas |
|---------|-----------|---------------------|--------|
| **1 — Fundaciones** | Auth JWT, cliente API con interceptor, store refactor (slices), routing con guards, error handling, lazy loading | Fase 1 BE (auth endpoints) | 1 |
| **2 — Datos de referencia + Cosmos** | Consumo de areas/subjects/topics/courses/activities, `TopicTree` generico, `ScheduleGrid`, config loading, feature flags, identidad visual | Fase 2 BE (admin endpoints) | 3, 10 |
| **3 — Documento de coordinacion** | Wizard 3 pasos, `DynamicSectionRenderer`, editor de secciones, `ClassPlanTable`, publicacion, validacion | Fase 3 BE (coordination endpoints) | 4 |
| **4 — Integracion IA** | `ChatPanel` reutilizable, `GenerateButton`, loading states, manejo de `document_updated` | Fase 4 BE (AI endpoints) | 6 |
| **5 — Planificacion docente** | Lista de clases, `MomentEditor`, `ActivitySelector`, `FontSelector`, generacion por actividad, publicacion | Fase 5 BE (teaching endpoints) | 5 |
| **6 — Recursos** | `ResourceTypeSelector`, `DynamicContentRenderer`, library con filtro, generacion, edicion | Fase 6 BE (resource endpoints) | 8 |
| **7 — Dashboard + Onboarding** | Dashboard coordinador, dashboard docente, notificaciones, onboarding wizard, profile form, product tour | Fase 7 BE (dashboard endpoints) | 7, 2 |

### 10.2 Criterios de aceptacion transversales

Aplican a **todas** las paginas y componentes:

- [ ] Toda pagina tiene estados de loading, error y empty
- [ ] Todo formulario valida antes de enviar
- [ ] Todo error de API muestra toast con mensaje de usuario
- [ ] Acceso por rol protegido en todas las rutas
- [ ] Todas las paginas usan lazy loading
- [ ] Feature flags de Cosmos respetados en sidebar y rutas
- [ ] Nomenclatura dinamica usada donde corresponda
- [ ] Identidad visual aplicada desde config
- [ ] Tests para: store slices, cliente API, flujos de usuario clave
- [ ] Secciones dinamicas renderizan correctamente segun config de la org

---

## Glosario

Extiende el [glosario del RFC backend](../rfc-alizia/rfc-alizia.md#glosario) con terminos frontend:

| Termino | Definicion |
|---------|-----------|
| Slice | Fragmento del store Zustand dedicado a un dominio (auth, coordination, etc.) |
| Feature flag | Toggle booleano en `org.config.modules` que activa/desactiva modulos de la UI |
| DynamicSectionRenderer | Componente que renderiza editores segun `coord_doc_sections` de la config |
| DynamicContentRenderer | Componente que renderiza contenido de recursos segun `output_schema` del tipo |
| ChatPanel | Componente reutilizable de chat con Alizia, usado en documentos, planes y recursos |
| TopicTree | Componente de arbol recursivo para topics con niveles configurables por org |
| ProtectedRoute | Wrapper de ruta que verifica autenticacion y roles |
| RequireModule | Wrapper de ruta que verifica feature flags de Cosmos |
| Config-driven | Patron donde la UI se renderiza dinamicamente segun la configuracion de la organizacion |
| Stale-while-revalidate | Estrategia de cache que muestra datos existentes mientras busca actualizaciones |
| Triple loading/error/empty | Patron obligatorio: todo componente con data fetching implementa 3 estados |
