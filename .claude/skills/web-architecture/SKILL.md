---
name: web-architecture
description: Patrones de arquitectura para apps web React/Vite/Next con TypeScript. Usala cuando estés diseñando o revisando estructura de carpetas, capas (services/hooks/store/pages), routing, code-splitting, error boundaries, configuración de entorno, o decisiones de cómo separar dominio/UI/datos. Aplica a SPAs (Vite + React Router) y a Next.js (App Router). No aplica a React Native — para eso usá mobile-architecture.
---

# Web architecture — buenas prácticas

Guía de patrones probados para proyectos React web modernos (Vite o Next). El objetivo: capas claras, fácil de testear, fácil de borrar/mover.

## 1. Estructura de carpetas

```
src/
  components/        ← UI reusable, sin lógica de dominio
    ui/              ← primitives (Button, Input, Dialog) — shadcn-style
    <feature>/       ← componentes específicos de un dominio
  pages/             ← pantallas (1 archivo por ruta) — solo composición
  hooks/             ← hooks reusables, sin estado global
    queries/         ← TanStack Query hooks por dominio
  services/          ← capa de API (fetch/axios), endpoints agrupados por dominio
  store/             ← Zustand/Jotai slices (auth, ui, config)
  lib/               ← utilidades puras (formatters, helpers, cn, env)
  types/             ← tipos compartidos (alineados al backend)
  config/            ← env, constantes, feature flags
  test/              ← setup global de testing
```

**Reglas:**
- `pages/` solo compone — la lógica vive en hooks o services.
- `components/ui/` no importan de `services/` ni `store/` — son dumb.
- `services/` no importan de `store/` (evitá ciclos). Si un service necesita auth, recibe el token por parámetro o por callback inyectado.
- `hooks/queries/` es la única capa que llama `services/` directamente desde la app.

## 2. Capas — quién llama a quién

```
pages → hooks (queries + locales) → services → fetch
            ↓
         store (auth, ui, config)
```

- **No saltees capas**: una page no debería llamar `fetch()` ni `apiClient.get()` directamente. Si hace falta una vez, creá el hook.
- **Server state nunca en store global**: TanStack Query es la fuente de verdad para datos del backend. Zustand/Context para auth, tema, sidebar, modales globales.
- **Stores chicos y temáticos**: `authStore`, `uiStore`, `configStore`. Un store gigante con todo dentro es un anti-patrón.

## 3. Cliente HTTP

- **Wrapper único** sobre `fetch` (o `axios`) en `services/api-client.ts`. Centraliza:
  - Base URL desde env
  - Auth header (token leído de un módulo, no del store directo — evita ciclos)
  - Manejo de errores tipado (`APIError` con `code`, `status`, `details`)
  - Auto-logout en 401 vía callback inyectado
  - Manejo de envelopes del backend (si los hay) en un solo lugar
- **Endpoints agrupados por dominio**: `authApi`, `usersApi`, `coursesApi`. Un objeto por dominio, una función por endpoint.
- **Nunca `any`** en respuestas — tipalo con genéricos (`apiClient.get<User>(...)`).
- **Validación runtime con zod** en el boundary si el contrato del BE es inestable. Schema = type + validador en una pieza.

## 4. Routing

### React Router 7 (SPA)
- **Lazy load por página**: `lazy(() => import('./pages/X'))` + `<Suspense fallback={<LoadingFallback />}>`. Cada page = chunk separado.
- **`ErrorBoundary` global** + **`RouteBoundary`** por subtree para que un crash de pantalla no tire toda la app.
- **Route guards declarativos**: `<ProtectedRoute roles={['admin']}>` — no metas la lógica de auth dentro de cada page.
- **Evitá ternarios anidados de role** en `<Routes>`. Hacé un `<RoleHome>` o árboles separados por rol.

### Next.js App Router
- `'use client'` solo donde hace falta (eventos, estado, effects). Por defecto: server component.
- `loading.tsx` y `error.tsx` por segmento.
- Data fetching en server components con `fetch()` + cache, mutaciones con server actions.

## 5. Code-splitting

- **Por ruta**: lazy en cada page (default).
- **Por feature pesada**: editores, gráficos, markdown — `lazy()` en el componente que los usa, no en el padre.
- **No splittees** componentes pequeños — el overhead de chunk es mayor que el beneficio.

## 6. Error handling

```
ErrorBoundary global  ← captura crashes de render
  RouteBoundary       ← contiene crash a la ruta actual
    Suspense          ← fallback de carga
      <Page />        ← lógica de negocio
```

- **APIError** tipada con `code/status/details` — la UI decide qué mensaje mostrar a partir del `code`.
- **Toasts para errores transitorios** (mutations fallidas, network blips), boundary para crashes de render.
- **Mapper de códigos a mensajes**: `lib/error-messages.ts` traduce `code` → mensaje user-friendly.
- **No tragues errores**: log + toast + (opcional) reportar a Sentry. Catch silencioso es deuda futura.

## 7. Configuración de entorno

- **Un solo módulo `config/env.ts`** que lea `import.meta.env` y exponga un objeto tipado.
- **Validá con zod al boot**: `z.string().url()` para URLs, `z.enum([...])` para entornos. Si falla, tira al inicio (mejor que en runtime).
- **Nunca uses `process.env.X` o `import.meta.env.X` directo** desde código de feature. Usá el objeto centralizado.
- **No expongas secrets** al cliente (en Vite, las vars `VITE_*` van al bundle público).

## 8. State — dónde vive

| Tipo | Solución |
|---|---|
| Server data (de API) | TanStack Query |
| Auth (user actual, token) | Zustand store |
| UI global (sidebar, modales) | Zustand store |
| Config de organización (tema, features) | Zustand store inicializado en bootstrap |
| Estado de un form | useState / react-hook-form |
| Estado compartido entre 2-3 componentes | lift up |
| Filtros/búsqueda (sincronizados con URL) | URL search params |

**Regla de oro**: empezá local. Subí solo cuando haga falta. Y los **filtros de listas van en la URL** (search params) — sobreviven al refresh y son shareables.

## 9. Bootstrap de la app

- **No bloquees toda la app esperando 6 queries**. Prefetch solo lo crítico (auth + config), el resto bajo demanda.
- **Skeletons por feature** > spinner gigante.
- **Si necesitás cargar config global** (tema, feature flags), hacelo antes del primer render protegido — un `<AppBootstrap>` wrapper resuelve eso sin contaminar pages.

## 10. Convenciones

- **Path aliases**: `@/` → `src/`. Configurá en `tsconfig.json` + `vite.config.ts`.
- **Naming**: `PascalCase.tsx` para componentes, `useThing.ts` para hooks, `kebab-case.ts` para utils.
- **Co-locá tests** al lado del archivo (`Component.tsx` + `Component.test.tsx`).
- **Un componente por archivo** (sub-componentes privados pequeños OK).
- **No barrel files gigantes** (`index.ts` re-exportando todo) — rompen tree-shaking y crean ciclos. Barrel solo cuando hay valor real (ej. `components/ui/index.ts` para shadcn).

## 11. Anti-patrones típicos

- ❌ Page que llama `fetch()` directamente.
- ❌ Server state metido en Zustand "para tenerlo a mano".
- ❌ Store global con 30 keys de cosas no relacionadas.
- ❌ `process.env.X` regado por toda la app sin centralizar.
- ❌ Lógica de auth replicada en cada page (`if (!user) navigate('/login')` en 15 archivos).
- ❌ Bootstrap que bloquea con spinner durante 5 segundos.
- ❌ Filtros de lista en `useState` (se pierden al F5, no se pueden compartir por link).
- ❌ Service que importa del store del usuario directamente — ciclo + acoplamiento.

## Checklist al revisar arquitectura

1. ¿Las pages solo componen, o tienen `fetch`/lógica adentro?
2. ¿Hay server state en Zustand/Context que debería estar en TanStack Query?
3. ¿El cliente HTTP centraliza errores y auth, o cada hook lo hace a mano?
4. ¿Las rutas están lazy-loaded?
5. ¿Hay `ErrorBoundary` + `Suspense` en niveles correctos?
6. ¿`env.ts` valida al boot o castea con `as string`?
7. ¿Hay ciclos `services ↔ store`?
8. ¿Los filtros de listas están en URL o en useState?
9. ¿Hay archivos de page con >300 líneas? (señal de que falta extraer)
10. ¿Las queryKeys están centralizadas o sueltas en el código?
