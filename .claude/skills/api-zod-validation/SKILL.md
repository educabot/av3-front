---
name: api-zod-validation
description: Patrones para validar respuestas de API en runtime con zod, usar schemas como única fuente de verdad de tipos, manejar envelopes y errores del backend, y evitar la deriva entre tipos declarados y respuestas reales. Usala cuando estés diseñando o revisando capas de API (services, api-client, hooks de queries), parseando respuestas, definiendo tipos compartidos con el backend, o cuando un cambio del BE rompe el FE en runtime sin aviso. No es solo para forms — es para todo boundary externo (HTTP, localStorage, postMessage, env vars).
---

# Validación runtime con zod en boundaries

Los tipos de TS son **garantías de compile time**. En runtime, lo que viene del backend (o de localStorage, env, postMessage) puede ser cualquier cosa. zod cierra ese gap.

## 1. Por qué validar en runtime

Sin validación:

```ts
interface User { id: string; email: string; }

const user: User = await apiClient.get('/users/me');
// El BE cambió `email` → `mail`. TS dice que está OK. La app rompe en runtime
// con un undefined raro, lejos del lugar real del problema.
```

Con validación:

```ts
const userSchema = z.object({ id: z.string(), email: z.string() });
const user = userSchema.parse(await apiClient.get('/users/me'));
// Falla con un mensaje claro: "Expected string, received undefined at path 'email'".
```

**Beneficios:**
- Errores al recibir, no al usar — más fáciles de debuggear.
- Schema = única fuente de verdad para tipo + validación.
- Documentación viva del contrato con el BE.
- Defensa contra cambios silenciosos del backend.

**Costo:**
- Microsegundos por respuesta (irrelevante en la mayoría de casos).
- Disciplina para mantener schemas alineados con el BE.

## 2. Schema = type + validador

```ts
import { z } from 'zod';

export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().min(1),
  roles: z.array(z.enum(['admin', 'teacher', 'coordinator'])),
  avatar: z.string().url().nullable().optional(),
});

export type User = z.infer<typeof userSchema>;
```

- **Una sola fuente de verdad**: cambiás el schema → cambia el type.
- **No declares `interface User` aparte** — se desincroniza.
- Schemas en archivos por dominio: `schemas/user.ts`, `schemas/course.ts`.

## 3. `parse` vs `safeParse`

```ts
// parse: throw si no valida
const user = userSchema.parse(raw);

// safeParse: nunca throw, retorna result tagged
const result = userSchema.safeParse(raw);
if (result.success) {
  use(result.data);
} else {
  log(result.error);
}
```

| Cuándo `parse` | Cuándo `safeParse` |
|---|---|
| En el api-client (errores se propagan al caller) | Cuando querés branchear sin try/catch |
| En boot para env vars (querés crash al inicio) | Cuando recuperás de localStorage (corrupto = ignorar) |
| Cuando el caller ya tiene boundary de error | Cuando querés mostrar errores de validación al user |

## 4. Validación en el cliente HTTP

Centralizá la validación en el api-client para no repetirla en cada hook:

```ts
async function requestValidated<T>(
  endpoint: string,
  schema: z.ZodType<T>,
  options?: RequestInit,
): Promise<T> {
  const raw = await request(endpoint, options); // tu fetch wrapper
  return schema.parse(raw);
}

// Endpoints:
export const usersApi = {
  getMe: () => requestValidated('/users/me', userSchema),
  list: () => requestValidated('/users', paginatedSchema(userSchema)),
};
```

- **Validás siempre en el boundary** — los hooks/pages reciben datos ya tipados.
- **`z.infer<typeof schema>`** para el type de retorno cuando lo necesitás explícito.

## 5. Patrones útiles

### Schemas anidados / paginación

```ts
function paginatedSchema<T extends z.ZodType>(item: T) {
  return z.object({
    items: z.array(item),
    more: z.boolean(),
  });
}

const usersListSchema = paginatedSchema(userSchema);
type UsersList = z.infer<typeof usersListSchema>;
```

### Discriminated unions

```ts
const eventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('login'), userId: z.string() }),
  z.object({ type: z.literal('logout') }),
  z.object({ type: z.literal('error'), code: z.string() }),
]);

type Event = z.infer<typeof eventSchema>;
```

### Refinements — validaciones custom

```ts
const passwordSchema = z.string()
  .min(8, 'Mínimo 8 caracteres')
  .refine((p) => /[A-Z]/.test(p), 'Necesita una mayúscula')
  .refine((p) => /[0-9]/.test(p), 'Necesita un número');

const dateRangeSchema = z.object({
  start: z.string().date(),
  end: z.string().date(),
}).refine(
  (r) => new Date(r.start) <= new Date(r.end),
  { message: 'start debe ser ≤ end', path: ['end'] },
);
```

### Transforms — normalizar al validar

```ts
// El BE manda dates como string ISO; queremos Date
const userSchema = z.object({
  id: z.string(),
  createdAt: z.string().datetime().transform((s) => new Date(s)),
});

type User = z.infer<typeof userSchema>; // createdAt: Date
```

- **Transforms cambian el type** — útil para parsear strings a Date, números, enums.

### Coerción

```ts
// query params siempre vienen como string
const filtersSchema = z.object({
  page: z.coerce.number().int().min(1),
  active: z.coerce.boolean(),
});
```

## 6. Manejo de errores zod

```ts
try {
  userSchema.parse(raw);
} catch (err) {
  if (err instanceof z.ZodError) {
    // err.issues es un array con detalles
    err.issues.forEach((issue) => {
      console.error(issue.path.join('.'), issue.message);
    });
  }
}
```

- **`err.issues`** (v3) o `err.errors` (legacy) — array tipado.
- **`flatten()`** o **`format()`** para formatos más amigables (especialmente útil en forms).
- En production, loggeá el path + el shape recibido (cuidado con datos sensibles).

## 7. Compartir schemas con el backend

Si el BE es Node/TS:

- **Schemas en un paquete compartido** (`@org/schemas`) → mismo schema valida el body en el server y la respuesta en el cliente.
- Si no se puede compartir: documentá los schemas en algún lado y revisá ambos en cada cambio del contrato.

Si el BE es Go/Python/etc.:

- **JSON Schema generado** desde zod (`zod-to-json-schema`) o desde el lenguaje del BE → comparten schema sin compartir código.
- **OpenAPI / contract testing** como red de seguridad.

## 8. Schemas para forms

Mismo schema sirve para validar **input del usuario** y **respuesta del server**:

```ts
const courseSchema = z.object({
  name: z.string().min(1),
  area_id: z.number().int().positive(),
});

// En el form (con react-hook-form):
useForm({ resolver: zodResolver(courseSchema) });

// En el api-client (al recibir una respuesta de creación):
const created = courseSchema.parse(await apiClient.post('/courses', data));
```

Ver skill **forms-rhf-zod** para más detalle del lado form.

## 9. Validar otros boundaries

zod no es solo para HTTP. Aplicá la misma idea en:

### Env vars

```ts
const envSchema = z.object({
  VITE_API_BASE_URL: z.string().url(),
  VITE_APP_ENV: z.enum(['local', 'staging', 'production']).default('local'),
});

export const env = envSchema.parse(import.meta.env);
// crash al inicio si falta o está mal — mejor que en runtime
```

### localStorage / sessionStorage

```ts
function readStoredUser(): User | null {
  const raw = sessionStorage.getItem('user');
  if (!raw) return null;
  const result = userSchema.safeParse(JSON.parse(raw));
  return result.success ? result.data : null; // descarta corruptos
}
```

### Mensajes de postMessage / WebSocket

Cualquier dato externo es input no confiable.

## 10. Anti-patrones

- ❌ Declarar `interface User` aparte del schema → se desincronizan.
- ❌ Validar solo "cuando hay tiempo" → no se hace nunca.
- ❌ Validar dentro del componente en vez del boundary → repetido y olvidable.
- ❌ `parse` en lugares donde un input corrupto debería ignorarse silenciosamente (usá `safeParse`).
- ❌ Schemas gigantes con todo opcional "por las dudas" → no validan nada.
- ❌ `z.any()` o `z.unknown()` regado → "validación" sin valor.
- ❌ Casts `as User` después de fetch sin validar → todo el beneficio de TS perdido.
- ❌ Mezclar tipos de DTO BE con tipos de modelo de dominio en el FE — separá si difieren.
- ❌ Validar respuestas, pero no env vars / storage → boundaries inconsistentes.

## 11. Performance

- **Es rapidísimo** para shapes normales — microsegundos.
- Si validás listas de **miles de items**, considerá:
  - `z.array(...).min(0)` sin transforms costosos.
  - Validar el shape del primer item + los counts, no item por item (menos seguro pero más rápido).
  - Mover validación a Web Worker si bloquea UI.
- 99% de los casos no necesita optimización.

## Checklist al revisar la capa de API

1. ¿Hay schemas zod, o solo `interface` declaradas a mano?
2. ¿La validación corre en el boundary (api-client) o regada por la app?
3. ¿Hay `as Type` después de un fetch sin validación?
4. ¿`parse` vs `safeParse` está usado donde corresponde?
5. ¿Env vars validadas al boot?
6. ¿Datos leídos de localStorage validados antes de usarse?
7. ¿Schemas anidados (paginación, envelopes) abstraídos en helpers?
8. ¿Errores zod loggeados con path + issue?
9. ¿Discriminated unions usadas para shapes que cambian?
10. ¿Schemas compartidos con el BE o documentados en algún lado?
