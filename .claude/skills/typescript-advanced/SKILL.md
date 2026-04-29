---
name: typescript-advanced
description: Patrones avanzados de TypeScript — discriminated unions, satisfies, branded types, generics, mapped/conditional types, type narrowing, exhaustive switches. Usala cuando estés diseñando tipos no triviales, modelando estado con múltiples formas (loading/error/data), eliminando uniones débiles (string | null), creando helpers genéricos, o cuando un type empieza a sentirse "indeciso". Cubre los patrones que sacan más provecho del compilador y los anti-patrones (any, casts forzados, tipos paralelos al schema).
---

# TypeScript avanzado — patrones que pagan

Cosas que el compilador puede hacer por vos si las modelás bien. La regla guía: **el tipo correcto hace que los bugs sean imposibles de escribir**, no solo detectables.

## 1. Discriminated unions — el patrón más rentable

Cuando un valor tiene varias "formas", modelá cada forma con un campo discriminador:

```ts
// ❌ tipo "indeciso" — todos los campos opcionales, válido en cualquier combinación
type Request = {
  status: 'idle' | 'loading' | 'success' | 'error';
  data?: User;
  error?: string;
};

// ✅ discriminated union — cada estado tiene exactamente los campos válidos
type Request =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: User }
  | { status: 'error'; error: string };
```

Con la versión buena, TS te obliga a chequear `status` antes de acceder a `data`/`error`:

```ts
function render(req: Request) {
  if (req.status === 'success') {
    return req.data; // ✅ TS sabe que data existe acá
  }
  if (req.status === 'error') {
    return req.error; // ✅
  }
}
```

**Aplicaciones típicas**: estado de UI, mensajes de eventos, props de componentes con variantes, resultados (`Result<T, E>`), entidades persistidas vs no persistidas.

## 2. Exhaustive switches con `never`

Garantiza que cubrís todos los casos. Si agregás un nuevo variant al union, TS te avisa:

```ts
function label(role: 'admin' | 'teacher' | 'coordinator'): string {
  switch (role) {
    case 'admin': return 'Admin';
    case 'teacher': return 'Docente';
    case 'coordinator': return 'Coordinador';
    default: {
      const _exhaustive: never = role;
      throw new Error(`Rol no manejado: ${_exhaustive}`);
    }
  }
}
```

Si mañana agregan `'student'`, el `never` rompe el build. Sin esto, queda un bug silencioso.

## 3. `satisfies` — validar sin perder inferencia

`satisfies` chequea que un valor cumple un tipo, **sin** ensanchar/colapsar la inferencia:

```ts
type RouteConfig = { path: string; roles: string[] };

// ❌ con `: Record<string, RouteConfig>` perdés los keys exactos
const routes: Record<string, RouteConfig> = {
  home: { path: '/', roles: ['*'] },
  admin: { path: '/admin', roles: ['admin'] },
};
routes.unknown; // TS no se queja — perdiste la info de keys

// ✅ con satisfies, TS valida + recuerda los keys exactos
const routes = {
  home: { path: '/', roles: ['*'] },
  admin: { path: '/admin', roles: ['admin'] },
} satisfies Record<string, RouteConfig>;

routes.unknown; // ✅ error: 'unknown' no existe
routes.home.path; // ✅ tipo string literal
```

Usalo para configs, mappers, tablas de constantes.

## 4. `as const` y literal types

```ts
const ROLES = ['admin', 'teacher', 'coordinator'] as const;
type Role = typeof ROLES[number]; // 'admin' | 'teacher' | 'coordinator'

const STATUSES = {
  PENDING: 'pending',
  ACTIVE: 'active',
} as const;
type Status = typeof STATUSES[keyof typeof STATUSES]; // 'pending' | 'active'
```

- **`as const`** congela el array/objeto en literal types.
- **`typeof X[number]`** extrae los valores de un array tupla.
- Mejor que un `enum` para la mayoría de casos (los enums tienen surface area mayor en runtime).

## 5. Branded types — distinguir IDs

Dos `string` son intercambiables para TS, lo que esconde bugs:

```ts
function getUser(userId: string) { ... }
const orderId = '123';
getUser(orderId); // ❌ TS no se queja, pero es un bug
```

Branded types (también llamados nominal types):

```ts
type Brand<T, B> = T & { readonly __brand: B };
type UserId = Brand<string, 'UserId'>;
type OrderId = Brand<string, 'OrderId'>;

function asUserId(s: string): UserId { return s as UserId; }
function getUser(id: UserId) { ... }

const orderId: OrderId = 'order-1' as OrderId;
getUser(orderId); // ✅ error: OrderId no es UserId
```

- Costo runtime: cero.
- Costo cognitivo: medio — usalo en IDs y valores que comparten tipo primitivo pero no son intercambiables (montos en distintas monedas, paths absolutos vs relativos).

## 6. Generics en componentes y funciones

```ts
function List<T>({ items, render }: {
  items: T[];
  render: (item: T) => React.ReactNode;
}) {
  return <>{items.map(render)}</>;
}

<List items={users} render={(u) => <span>{u.name}</span>} />;
// TS infiere T = User
```

- **Constraints** (`<T extends { id: number }>`) cuando necesitás campos específicos.
- **Default**: `<T = string>` para casos comunes.
- **NoInfer** (TS 5.4+) cuando un parámetro debe inferirse de otro pero no del actual:
  ```ts
  function f<T>(value: T, fallback: NoInfer<T>) {...}
  f<number>(1, 'a'); // ❌ correcto: T es number, fallback no contamina
  ```

## 7. Mapped types y conditional types

### Mapped types — transformar shapes

```ts
type Partial<T> = { [K in keyof T]?: T[K] };
type Readonly<T> = { readonly [K in keyof T]: T[K] };
type Pick<T, K extends keyof T> = { [P in K]: T[P] };
type Nullable<T> = { [K in keyof T]: T[K] | null };
```

Usá los built-in: `Partial`, `Required`, `Readonly`, `Pick`, `Omit`, `Record`, `Awaited`, `ReturnType`, `Parameters`, `NonNullable`.

### Conditional types — branches en types

```ts
type IsArray<T> = T extends unknown[] ? true : false;
type ElementOf<T> = T extends (infer E)[] ? E : never;
type ElementOf<string[]>; // string
```

- **`infer`** captura un sub-tipo en un branch.
- Útiles para utility types, no para shapes de dominio.

## 8. Template literal types

```ts
type Endpoint = `/api/${string}`;
type Event = `on${Capitalize<string>}`;

type RouteParams<T extends string> = T extends `${string}:${infer Param}/${infer Rest}`
  ? Param | RouteParams<`/${Rest}`>
  : T extends `${string}:${infer Param}`
    ? Param
    : never;

type X = RouteParams<'/users/:userId/posts/:postId'>; // 'userId' | 'postId'
```

- Útiles para validar strings con shape (paths, event names, CSS variables).
- Si te encontrás escribiendo recursión densa: pará y revisá si vale la pena vs un type más simple.

## 9. Type narrowing — patterns útiles

```ts
// type guard manual
function isUser(x: unknown): x is User {
  return typeof x === 'object' && x !== null && 'id' in x && 'email' in x;
}

// in operator
if ('error' in result) {
  // result tiene `error`
}

// instanceof
if (err instanceof APIError) {
  // err.code disponible
}

// discriminated union narrowing (mejor que todo lo anterior si controlás los tipos)
if (result.status === 'success') { ... }
```

- **`unknown` > `any`** siempre. `unknown` te obliga a narrowing antes de usarlo.
- **Type guards** en util functions reusables, no inline en cada lugar.

## 10. `unknown`, `never`, `void`

| Type | Significa |
|---|---|
| `unknown` | "puede ser cualquier cosa, validalo antes de usar" |
| `never` | "este código nunca debería ejecutarse" (exhaustive checks, throws) |
| `void` | "función que no devuelve nada útil" |
| `any` | "apago el compilador" — evitar |

`never` aparece naturalmente en exhaustive switches y en branches imposibles. Si TS te dice que algo es `never` y no esperabas, hay un bug en tu modelado.

## 11. Tipar respuestas API

Combiná **runtime validation** (zod) con **types inferidos** del schema. Una sola fuente de verdad:

```ts
const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  roles: z.array(z.enum(['admin', 'teacher'])),
});

type User = z.infer<typeof userSchema>;

// En el api-client:
async function getUser(id: string): Promise<User> {
  const raw = await apiClient.get(`/users/${id}`);
  return userSchema.parse(raw); // valida + tipa
}
```

Ver la skill `api-zod-validation` para más patrones.

## 12. Anti-patrones

- ❌ `any` "temporal".
- ❌ `as` para forzar un tipo cuando hay que arreglar el modelo.
- ❌ Casts encadenados: `x as unknown as T` → señal de que el modelo está mal.
- ❌ `interface` paralela al schema zod (se desincronizan — usá `z.infer`).
- ❌ `enum` cuando un `as const` resuelve sin agregar runtime weight.
- ❌ Tipos opcionales en todos los campos para "ser flexible" → todo termina siendo `T | undefined` y la lógica se llena de `?.`.
- ❌ Generics innecesarios — si nunca cambia, no es generic.
- ❌ `Function`, `Object`, `{}` como tipos — son demasiado anchos. Usá `() => void`, `Record<string, unknown>`, `unknown`.
- ❌ `T | null | undefined` mezclado — elegí uno y quedate con ese.

## 13. Convenciones de proyecto

- **`type` vs `interface`**: `type` por defecto. `interface` cuando vas a extender o necesitás declaration merging.
- **Naming**: `User`, `UserId`, `UserRole`. Sin prefijos `I` (`IUser`).
- **Organización**: types compartidos en `types/` o co-locados con el módulo dueño. Evitá un `types/global.ts` gigante.
- **Re-exportar tipos**: `export type { User }` (con `type`) — evita imports accidentales en runtime.

## Checklist al revisar tipos

1. ¿Hay uniones débiles (`status: string`) que serían discriminated unions?
2. ¿Hay `any` sin justificación?
3. ¿Hay casts (`as X`) que esconden un modelo mal armado?
4. ¿Los IDs son `string` plano o branded?
5. ¿Los switches tienen exhaustive check con `never`?
6. ¿Las constantes usan `as const` para preservar literales?
7. ¿`satisfies` donde aplicaría en lugar de `: Type`?
8. ¿Generics tienen constraints sensatos (no `<T>` sin extends donde hace falta)?
9. ¿Tipos derivados del runtime (zod, ORMs) o duplicados a mano?
10. ¿`unknown` en boundaries en vez de `any`?
