---
name: zustand-patterns
description: Patrones para usar Zustand correctamente — slices, selectores estrechos, middleware (persist, immer, devtools), shallow comparison, integración con TanStack Query, y testing. Usala cuando estés escribiendo o revisando stores Zustand, decidiendo qué meter en un store y qué no, optimizando rerenders por selectores mal armados, persistiendo estado o consumiendo el store fuera de React. Cubre los errores típicos (server state en stores, selectores que retornan funciones u objetos nuevos, store gigante con 30 keys).
---

# Zustand — patrones que escalan

Zustand es minimalista a propósito. Esa simplicidad es buena, pero también te deja libre para hacer cosas mal. Esta guía cubre lo que ahorra problemas a futuro.

## 1. Qué meter en un store y qué no

| Tipo de estado | ¿Va en Zustand? |
|---|---|
| Server data (de API) | ❌ TanStack Query |
| Auth: user, token | ✅ Zustand |
| UI global (sidebar, modales globales) | ✅ Zustand |
| Config de organización (tema, feature flags) | ✅ Zustand |
| Estado de un form | ❌ useState / RHF |
| Filtros de listas | ⚠️ URL params (preferido) o Zustand |
| Estado entre 2 componentes hermanos | ❌ lift state up |

**Regla de oro**: si solo lo necesita un componente, no va en el store. Si solo lo necesita una página, no va en el store. Empezá local.

## 2. Store básico

```ts
import { create } from 'zustand';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: false,

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const { user } = await authApi.login({ email, password });
      set({ user, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err; // que el componente decida cómo mostrar el error
    }
  },

  logout: () => set({ user: null }),
}));
```

- **Tipá el state explícitamente** (`interface AuthState`).
- **`set` mergea** por default (no necesitás `set((s) => ({ ...s, x: 1 }))`).
- **`get()` para leer** dentro de acciones sin causar re-render.
- **No tragues errores** en acciones — re-throw para que el caller decida.

## 3. Selectores estrechos — la regla más importante

```ts
// ❌ rerender en cada cambio del store (incluso de otros campos)
const store = useAuthStore();

// ❌ rerender porque el objeto es nuevo cada vez
const { user, isLoading } = useAuthStore((s) => ({ user: s.user, isLoading: s.isLoading }));

// ✅ rerender solo si user cambia
const user = useAuthStore((s) => s.user);
const isLoading = useAuthStore((s) => s.isLoading);
```

- **Un campo por hook** o usá `shallow`:
  ```ts
  import { useShallow } from 'zustand/react/shallow';
  const { user, isLoading } = useAuthStore(useShallow((s) => ({ user: s.user, isLoading: s.isLoading })));
  ```
- **Selectores que retornan funciones** del store son anti-patrón: ejecutás la función en cada render. Mejor exponer el valor calculado:
  ```ts
  // ❌
  const getUserRole = useAuthStore((s) => s.getUserRole);
  const role = getUserRole();
  // ✅
  const role = useAuthStore((s) => primaryRole(s.user));
  ```

## 4. Acciones afuera del componente

Zustand permite leer/mutar el store desde cualquier lugar:

```ts
// En un service, un effect global, un test, donde sea:
const user = useAuthStore.getState().user;
useAuthStore.getState().logout();
```

- **`getState()`**: snapshot, no suscribe a cambios.
- **`setState()`**: mutar desde afuera.
- **`subscribe()`**: escuchar cambios sin componente.

```ts
// Ejemplo: callback global de 401 en el api-client
useAuthStore.subscribe((state, prev) => {
  if (prev.user && !state.user) {
    // user logged out → cleanup
  }
});
```

## 5. Slices pattern — para stores grandes

Cuando un store crece, partilo en slices:

```ts
import { create, type StateCreator } from 'zustand';

interface AuthSlice {
  user: User | null;
  login: () => void;
}

interface UiSlice {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

const createAuthSlice: StateCreator<AuthSlice & UiSlice, [], [], AuthSlice> = (set) => ({
  user: null,
  login: () => set({ user: { id: '1' } as User }),
});

const createUiSlice: StateCreator<AuthSlice & UiSlice, [], [], UiSlice> = (set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
});

export const useStore = create<AuthSlice & UiSlice>()((...a) => ({
  ...createAuthSlice(...a),
  ...createUiSlice(...a),
}));
```

**Pero antes de hacer esto, considerá la alternativa**: stores separados por dominio (`useAuthStore`, `useUiStore`). Más simple, igual de efectivo, evita cross-coupling.

## 6. Middleware — los útiles

### `persist` — sobrevive al refresh

```ts
import { persist, createJSONStorage } from 'zustand/middleware';

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
    }),
    {
      name: 'ui-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ sidebarOpen: state.sidebarOpen }), // solo lo que querés persistir
    },
  ),
);
```

- **`name`** es la key en storage.
- **`partialize`** — no persistas todo (sobre todo, no persistas funciones ni errores).
- **`storage`** — `localStorage` para preferencias durables, `sessionStorage` para sesión (cierra tab → muere).
- **Migrations** disponibles vía `version` + `migrate` cuando cambia el shape.

### `devtools` — debugging

```ts
import { devtools } from 'zustand/middleware';

export const useStore = create<State>()(
  devtools(
    (set) => ({...}),
    { name: 'auth-store' },
  ),
);
```

- Activa Redux DevTools.
- Solo en dev: `process.env.NODE_ENV !== 'production'`.

### `immer` — mutaciones inmutables

```ts
import { immer } from 'zustand/middleware/immer';

export const useStore = create<State>()(
  immer((set) => ({
    items: [],
    addItem: (item) => set((s) => {
      s.items.push(item); // ✅ mutación safe gracias a immer
    }),
  })),
);
```

- Útil cuando manejás estado profundamente anidado.
- **No lo uses solo "porque sí"** — agrega una dependencia y un poco de magia.

## 7. Combinar con TanStack Query

**Zustand para client state, TanStack Query para server state**. Son complementarios, no rivales.

```ts
// Zustand: token y user actual (client state)
const user = useAuthStore((s) => s.user);

// TanStack Query: datos del usuario (server state)
const { data: profile } = useQuery({
  queryKey: ['profile', user?.id],
  queryFn: () => profileApi.get(user!.id),
  enabled: !!user,
});
```

- **No copies los datos del usuario en Zustand** "para acceso rápido" — TanStack ya cachea.
- **Leé del store de Zustand para auth/UI**, leé de TanStack para datos.

## 8. Testing

```ts
import { useAuthStore } from '@/store/authStore';

beforeEach(() => {
  // Reset al estado inicial
  useAuthStore.setState({
    user: null,
    isLoading: false,
  });
});

it('login setea el usuario', async () => {
  // Mockeá la API o usá MSW
  await useAuthStore.getState().login('a@b.com', 'pass');
  expect(useAuthStore.getState().user).not.toBeNull();
});
```

- **Resetá en `beforeEach`** — el store es global y persiste entre tests.
- **Testeá con `getState()` / `setState()`** — no necesitás render.
- **Si usás `persist`**, limpiá storage en `beforeEach` también:
  ```ts
  beforeEach(() => {
    localStorage.clear();
    useUiStore.persist.rehydrate();
  });
  ```

## 9. Patrones útiles

### Reset al estado inicial

```ts
const initialState = { user: null, isLoading: false };

export const useAuthStore = create<AuthState>((set) => ({
  ...initialState,
  reset: () => set(initialState),
  // ...
}));
```

### Computed values

```ts
export const useStore = create<State>((set, get) => ({
  items: [],
  filter: '',
  // computed: NO los pongas como state — calculá en selector
}));

// En el componente:
const filteredItems = useStore((s) => s.items.filter((i) => i.name.includes(s.filter)));
// O con useMemo si es caro y depende de varios fields
```

### Suscribirse a cambios específicos

```ts
import { subscribeWithSelector } from 'zustand/middleware';

export const useStore = create<State>()(
  subscribeWithSelector((set) => ({
    user: null,
  })),
);

// Subscribe a un campo específico
useStore.subscribe(
  (state) => state.user,
  (user, prev) => {
    if (user && !prev) console.log('logged in');
  },
);
```

## 10. Anti-patrones

- ❌ Server state en Zustand "para tenerlo a mano" → usá TanStack Query.
- ❌ Store gigante con 30 keys de cosas no relacionadas → partí por dominio.
- ❌ Selector que retorna objeto nuevo sin `shallow` → rerenders innecesarios.
- ❌ Selector que retorna una función del store → la ejecutás cada render.
- ❌ Acciones que tragan errores → re-throw siempre.
- ❌ `persist` con todo el state, incluyendo funciones, errores, loading flags.
- ❌ Mutar state directamente (`get().items.push(x)`) sin set → no rerendera.
- ❌ `useStore()` sin selector → rerender en cualquier cambio.
- ❌ Inicializar con datos async dentro del `create()` → usá un método explícito (`hydrate()`, `init()`).
- ❌ Replicar lógica entre store y componentes — exponé la acción y llamá desde donde sea.

## 11. Cuándo NO usar Zustand

- **Estado que solo afecta a un componente**: useState.
- **Estado de un form**: react-hook-form.
- **Server data**: TanStack Query.
- **Estado simple de un context que ya existe** (tema, locale): Context.
- **App con server components serios** (Next.js App Router con poco client state): Context puede alcanzar.

Zustand brilla en: client state global, simple, accedido desde varias rutas/features, con acciones complejas.

## Checklist al revisar un store Zustand

1. ¿Hay server state que debería estar en TanStack Query?
2. ¿Los selectores son estrechos (un campo o `shallow`)?
3. ¿Hay selectores que retornan funciones u objetos nuevos cada render?
4. ¿El store tiene >10-15 keys sin relación lógica? → partir.
5. ¿`persist` solo persiste lo necesario (`partialize`)?
6. ¿Las acciones re-throw errores en vez de tragarlos?
7. ¿Hay `getState()`/`setState()` desde afuera de React donde corresponde?
8. ¿Los tests resetean el store en `beforeEach`?
9. ¿Hay computed values en el state que deberían ser derivados?
10. ¿`devtools` activado en dev, desactivado en prod?
