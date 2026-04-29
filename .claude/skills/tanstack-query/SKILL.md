---
name: tanstack-query
description: Buenas prácticas con TanStack Query (React Query) v4/v5. Usala cuando estés escribiendo o revisando useQuery, useMutation, useInfiniteQuery, queryKey, invalidateQueries, optimistic updates, prefetch, suspense mode, o cualquier integración con TanStack Query. Cubre los errores típicos (queryKey mal armada, server state en stores, mutations sin invalidación, refetch loops). No aplica a SWR ni a useEffect+fetch.
---

# TanStack Query — buenas prácticas

Guía pragmática para usar TanStack Query (v4/v5) sin tirarte un pie. Asume React 18+ y TS.

## 1. queryKey — la base de todo

- **Siempre array, siempre serializable**: `['user', userId]`, no `'user-' + userId`.
- **Incluí todas las dependencias** que cambian la respuesta:
  ```ts
  queryKey: ['posts', { authorId, status, page }]
  ```
- **Centralizá las keys** en una factory por dominio:
  ```ts
  export const postKeys = {
    all: ['posts'] as const,
    lists: () => [...postKeys.all, 'list'] as const,
    list: (filters: PostFilters) => [...postKeys.lists(), filters] as const,
    details: () => [...postKeys.all, 'detail'] as const,
    detail: (id: number) => [...postKeys.details(), id] as const,
  };
  ```
  - Invalidar `postKeys.lists()` invalida todas las listas, sin tocar detalles.
  - Invalidar `postKeys.all` invalida todo del dominio.
- **`as const`** para que TS infiera readonly tuples.
- **NO incluyas en la key** valores que no afectan la respuesta (UI state, tema, etc.).

## 2. useQuery — patrones

```ts
const { data, isPending, isError, error } = useQuery({
  queryKey: postKeys.detail(id),
  queryFn: () => postsApi.getById(id),
  enabled: id > 0,
  staleTime: 5 * 60 * 1000,
});
```

- **`enabled`** cuando la query depende de datos aún no disponibles (`enabled: !!userId`). Sin esto, dispara con `undefined` y rompe.
- **`staleTime` explícito** según el dominio:
  - Datos de referencia que rara vez cambian: `5-15 min`.
  - Datos que cambian seguido: `0` o `30s`.
  - Default global: ponelo en el `QueryClient` para que no haya que repetirlo.
- **`select`** para derivar/transformar sin invalidar la cache base:
  ```ts
  useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
    select: (users) => users.filter((u) => u.active),
  });
  ```
  Cambios en `select` no refetchean — solo recalculan.
- **`isPending` (v5) ≠ `isLoading` (v4)**: en v5, `isLoading = isPending && isFetching`. Para "primer load nunca cargó", usá `isPending`.
- **No mezcles** TanStack Query con `useState`/`useEffect` para cachear datos del server. Es uno o el otro — y la respuesta es TanStack Query.

## 3. useMutation — patrones

```ts
const queryClient = useQueryClient();

const mutation = useMutation({
  mutationFn: (data: CreatePostInput) => postsApi.create(data),
  onSuccess: (newPost) => {
    queryClient.invalidateQueries({ queryKey: postKeys.lists() });
    // o setQueryData si querés evitar refetch:
    queryClient.setQueryData(postKeys.detail(newPost.id), newPost);
  },
  onError: (err) => {
    showApiError(err);
  },
});

mutation.mutate(input);
```

- **Invalidá todas las queries afectadas en `onSuccess`** — no en el componente. La regla: la mutation sabe qué tocó, ella decide qué invalidar.
- **`setQueryData` para updates inmediatas** sin esperar el refetch. Útil para detalles después de crear.
- **Errores en `onError` o en `isError`** del componente, no con try/catch alrededor de `mutate`.
- **`mutate` vs `mutateAsync`**: `mutate` es fire-and-forget (los errores van a `onError`). `mutateAsync` devuelve promesa — solo si necesitás `await` para encadenar.

## 4. Optimistic updates

Para UX instantánea (likes, toggles, edición inline):

```ts
useMutation({
  mutationFn: updateTodo,
  onMutate: async (newTodo) => {
    await queryClient.cancelQueries({ queryKey: todoKeys.detail(newTodo.id) });
    const previous = queryClient.getQueryData(todoKeys.detail(newTodo.id));
    queryClient.setQueryData(todoKeys.detail(newTodo.id), newTodo);
    return { previous };
  },
  onError: (_err, newTodo, context) => {
    queryClient.setQueryData(todoKeys.detail(newTodo.id), context?.previous);
  },
  onSettled: (_data, _err, newTodo) => {
    queryClient.invalidateQueries({ queryKey: todoKeys.detail(newTodo.id) });
  },
});
```

- **`cancelQueries`** primero — si no, una respuesta en vuelo pisa el optimistic.
- **`onError` con context** restaura el estado anterior.
- **`onSettled` invalida** para reconciliar con el server.
- No hagas optimistic en mutations críticas (pagos, datos legales) — ahí esperá la confirmación.

## 5. useInfiniteQuery — paginación

```ts
const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
  queryKey: postKeys.list(filters),
  queryFn: ({ pageParam }) => postsApi.list({ ...filters, offset: pageParam }),
  initialPageParam: 0,
  getNextPageParam: (lastPage, allPages) =>
    lastPage.more ? allPages.flatMap((p) => p.items).length : undefined,
});

const items = data?.pages.flatMap((p) => p.items) ?? [];
```

- **No reinventes paginación con `useState` + offset manual**. `useInfiniteQuery` lo hace.
- **`getNextPageParam` devuelve `undefined`** cuando no hay más → `hasNextPage = false`.
- **El cambio de filtros invalida la query** automáticamente (porque el queryKey cambia) — no llames `reset()` manual.

## 6. Prefetching

```ts
// En un loader, hover, o bootstrap:
queryClient.prefetchQuery({
  queryKey: postKeys.detail(id),
  queryFn: () => postsApi.getById(id),
  staleTime: 30_000,
});
```

- **Útil al hacer hover** sobre un link que va al detalle (UX instantánea).
- **Bootstrap selectivo**: prefetch solo lo crítico para el primer render. No precargues todo "por las dudas".
- **`staleTime` en prefetch** evita un refetch inmediato cuando el componente monta.

## 7. Defaults globales del QueryClient

```ts
new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,        // v5 (era cacheTime en v4)
      retry: 1,
      refetchOnWindowFocus: false, // opt-in por query si hace falta
    },
    mutations: {
      onError: (err) => logError(err),
    },
  },
});
```

- **`refetchOnWindowFocus: false`** suele ser lo que querés en apps con datos no muy volátiles (evitás refetches inesperados al cambiar de tab).
- **`retry: 1`** balanceado — más es agresivo, 0 es frágil con redes flaky.
- **Defaults explícitos** > confiar en lo que TanStack decida en cada versión.

## 8. Suspense mode

```ts
const { data } = useSuspenseQuery({
  queryKey: postKeys.detail(id),
  queryFn: () => postsApi.getById(id),
});
// data está garantizado — no hay isPending
```

- Combiná con `<Suspense fallback={...}>` y `<ErrorBoundary>`.
- **Pro**: tipos sin null check, código limpio.
- **Contra**: cada render que dispara una nueva key suspende el árbol entero — no apto para data que cambia con cada interacción.

## 9. Errores y dev tools

- **`isError` + `error`** en el componente, no try/catch.
- **Tipá el error**: por defecto es `Error`, podés usar `useQuery<Data, APIError>` o configurar globalmente.
- **`@tanstack/react-query-devtools`** siempre en dev — te muestra cache, fetches, invalidaciones.

## 10. Anti-patrones

- ❌ `useEffect(() => { fetch(...) }, [id])` cuando podrías usar `useQuery`.
- ❌ `queryKey: ['user']` para el usuario `id`, sin meter el id en la key.
- ❌ Server state copiado a Zustand "para acceso rápido" — ya tenés `queryClient.getQueryData`.
- ❌ Mutation sin `invalidateQueries` ni `setQueryData` → la UI muestra datos viejos hasta el próximo refetch.
- ❌ `mutateAsync` con try/catch cuando un `onError` hace lo mismo.
- ❌ `enabled` que depende de un valor que cambia entre `undefined` y un número → ojo con el rerender.
- ❌ `refetchInterval` de 1 segundo cuando podrías invalidar en respuesta a un evento.
- ❌ Prefetch de 10 queries al login bloqueando el render.
- ❌ Mezclar `useQuery` con un store custom de `usePaginatedList` que no comparte cache.

## Checklist al revisar TanStack Query

1. ¿La queryKey incluye TODO lo que afecta la respuesta?
2. ¿Las keys están centralizadas en una factory?
3. ¿`enabled` está donde corresponde para evitar disparos con `undefined`?
4. ¿Las mutations invalidan / setean las queries afectadas?
5. ¿Hay `staleTime` explícito o estás usando el default?
6. ¿Hay server state en stores globales que debería estar acá?
7. ¿Los errores se manejan con `isError` o con try/catch envuelto?
8. ¿`useInfiniteQuery` para paginación, no `useState` + offset manual?
9. ¿`refetchOnWindowFocus` está deliberadamente configurado?
