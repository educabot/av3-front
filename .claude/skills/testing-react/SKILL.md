---
name: testing-react
description: Buenas prácticas para testing de apps React con Vitest, Jest, Testing Library y MSW. Usala cuando estés escribiendo o revisando tests de componentes (render, screen, userEvent), hooks (renderHook), stores (Zustand/Redux), services (API mocks), o configuración de testing (setup, providers, MSW handlers). Cubre qué testear, qué evitar, queries accesibles, AAA, y patrones por tipo de archivo.
---

# Testing React — buenas prácticas

Guía para escribir tests útiles (no "tests que duelen al refactorear"). Asume Vitest o Jest + Testing Library + user-event v14+.

## 1. Qué testear, qué no

**SÍ:**
- Comportamiento visible al usuario (clicks, inputs, navegación, mensajes mostrados).
- Lógica con ramas no triviales (cálculos, validaciones, normalizadores).
- Edge cases que ya rompieron antes (regression tests).
- Contratos de hooks reusables.
- Stores: transiciones de estado y side effects.

**NO:**
- Detalles de implementación (qué `useState` interno tiene un componente).
- Estilos (testeá con visual regression si te importa).
- Librerías de terceros (Radix, react-router, TanStack Query — confiá en sus tests).
- Tipos — para eso está TS.
- Snapshots gigantes que nadie lee y todos aceptan a ciegas.

**Regla**: si refactoreás la implementación sin cambiar el comportamiento y el test rompe, el test está mal.

## 2. Estructura AAA

```ts
it('agrega un curso al hacer submit', async () => {
  // Arrange
  const user = userEvent.setup();
  render(<AdminCourses />, { wrapper: AllProviders });

  // Act
  await user.click(screen.getByRole('button', { name: /nuevo curso/i }));
  await user.type(screen.getByLabelText(/nombre/i), '1A');
  await user.click(screen.getByRole('button', { name: /guardar/i }));

  // Assert
  expect(await screen.findByText('1A')).toBeInTheDocument();
});
```

- **Arrange**: setup mínimo. Si necesitás 30 líneas, extraé un `setup()` helper.
- **Act**: una acción del usuario, idealmente.
- **Assert**: lo más cerca posible del usuario (texto visible, role, aria-label).

## 3. Queries — prioridad correcta

Orden de preferencia (Testing Library lo recomienda explícitamente):

1. `getByRole('button', { name: /guardar/i })` — accesible, refleja semántica.
2. `getByLabelText(/email/i)` — para inputs.
3. `getByPlaceholderText(/buscar/i)`.
4. `getByText(/bienvenido/i)`.
5. `getByDisplayValue(...)`.
6. `getByAltText(...)` (imágenes).
7. `getByTitle(...)`.
8. `getByTestId(...)` — **último recurso**.

Si tenés que usar `getByTestId` seguido, suele ser señal de que el componente no es accesible.

### `getBy` vs `queryBy` vs `findBy`

- `getBy*`: tira si no encuentra. Para cosas que **deben** estar.
- `queryBy*`: devuelve `null` si no encuentra. Para asserts negativos: `expect(queryByText(...)).not.toBeInTheDocument()`.
- `findBy*`: async, espera hasta que aparezca. Para cosas que aparecen tras una acción async (mutation, fetch).

## 4. user-event > fireEvent

```ts
// ✅ user-event simula la interacción real (focus, eventos múltiples, teclado)
const user = userEvent.setup();
await user.type(input, 'hola');
await user.click(button);

// ❌ fireEvent es bajo nivel — no dispara focus, no dispara change correctamente en muchos casos
fireEvent.change(input, { target: { value: 'hola' } });
```

- **Siempre `userEvent.setup()`** al inicio del test (v14+).
- **`await`** todas las acciones — son async.

## 5. Providers — wrapper reusable

```ts
// test-utils/render.tsx
export function AllProviders({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

export function renderWithProviders(ui: React.ReactElement, options?: RenderOptions) {
  return render(ui, { wrapper: AllProviders, ...options });
}
```

- **`retry: false` en tests** — evita que TanStack reintente y haga el test lento/flaky.
- **`gcTime: 0`** — evita que el cache sobreviva entre tests (aislamiento).
- **`MemoryRouter` para tests** — no toques `window.history`.
- **Un QueryClient nuevo por test** si el caché interfiere.

## 6. Mocking de API — MSW preferido

**Mejor opción: MSW** (Mock Service Worker). Intercepta `fetch`/`XHR` a nivel de red:

```ts
// test/handlers.ts
export const handlers = [
  http.get('/api/courses', () => HttpResponse.json({ items: [...], more: false })),
  http.post('/api/courses', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: 1, ...body }, { status: 201 });
  }),
];

// test/setup.ts
const server = setupServer(...handlers);
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

- **No mockees `fetch` global a mano** — MSW es más realista.
- **Override por test**: `server.use(http.get(..., () => HttpResponse.error()))`.
- **Funciona en tests Y en dev/Storybook** — un solo mock para todo.

## 7. Testing de hooks

```ts
import { renderHook, act } from '@testing-library/react';

it('useCounter incrementa', () => {
  const { result } = renderHook(() => useCounter());
  act(() => result.current.increment());
  expect(result.current.count).toBe(1);
});
```

- **Hooks que usan providers**: pasá `wrapper`:
  ```ts
  renderHook(() => useUser(), { wrapper: AllProviders });
  ```
- **`act()`** alrededor de updates síncronas. Para async, `await act(async () => {...})` o esperá con `waitFor`.

## 8. Testing de stores (Zustand)

```ts
import { useAuthStore } from '@/store/authStore';

beforeEach(() => {
  useAuthStore.setState({ user: null, error: null });
});

it('login setea el usuario', async () => {
  // Mockeá la API o usá MSW
  await useAuthStore.getState().login('a@b.com', 'pass');
  expect(useAuthStore.getState().user).not.toBeNull();
});
```

- **Resetá el store en `beforeEach`** — el estado es global.
- **Testealo directo con `getState()` y `setState()`** — no necesitás render.

## 9. Testing async — patrones

```ts
// ✅ findBy espera con timeout configurable
expect(await screen.findByText('Guardado')).toBeInTheDocument();

// ✅ waitFor para asserts no-DOM o condiciones complejas
await waitFor(() => {
  expect(mockApi).toHaveBeenCalledWith({ id: 1 });
});

// ❌ setTimeout / await new Promise(r => setTimeout(r, 100))
// Es flaky. Siempre.
```

- **`findBy*` y `waitFor`** son tus amigos.
- **Nunca `setTimeout`** en tests para "esperar a que termine".
- **`waitForElementToBeRemoved`** para que algo desaparezca.

## 10. Asserts — cerca del usuario

```ts
// ✅ refleja lo que ve el usuario
expect(screen.getByText(/se guardó correctamente/i)).toBeInTheDocument();

// ❌ implementación
expect(component.state.saved).toBe(true);
expect(component.find('.success-message').exists()).toBe(true);
```

- **`@testing-library/jest-dom`** matchers (`toBeInTheDocument`, `toHaveValue`, `toBeDisabled`, etc.) — siempre.
- **Texto regex case-insensitive**: `/guardar/i` evita romperse con tildes/mayúsculas.

## 11. Anti-patrones

- ❌ `getByTestId` cuando había un role disponible.
- ❌ Snapshots gigantes — nadie los revisa.
- ❌ Mockear hooks internos del componente bajo test.
- ❌ Tests que dependen del orden (sin `beforeEach` de limpieza).
- ❌ `fireEvent.change` para typear (usá `userEvent.type`).
- ❌ Tests con 5 asserts no relacionados — partilo.
- ❌ `act()` warnings ignorados — son bugs reales.
- ❌ `console.error` con "not wrapped in act" → falta await en algún user-event.
- ❌ Mockear el módulo entero (`vi.mock('@/services/api')`) cuando MSW haría lo mismo más limpio.
- ❌ Tests que pasan en local y rompen en CI por timezone / locale → fijá `TZ=UTC` y `LANG=en` en CI.

## 12. Naming y organización

- **Co-locá**: `Component.tsx` + `Component.test.tsx`.
- **Describe por unidad**, `it` por comportamiento:
  ```ts
  describe('AdminCourses', () => {
    it('lista los cursos al cargar', () => {...});
    it('crea un curso al hacer submit', () => {...});
    it('muestra error si falla la creación', () => {...});
  });
  ```
- **Naming en español o inglés** — consistente con el proyecto. Mezclar es ruido.

## Checklist al revisar un test

1. ¿Usa queries accesibles (role, label) o `getByTestId` por defecto?
2. ¿Usa `userEvent` o `fireEvent`?
3. ¿`await` en cada interacción?
4. ¿Hay providers correctos (Router, QueryClient)?
5. ¿El mock de API es por MSW o un mock global hecho a mano?
6. ¿Los asserts reflejan lo que ve el usuario?
7. ¿Hay limpieza entre tests (store reset, MSW reset)?
8. ¿Snapshots tienen sentido o son ruido?
9. ¿El test sobreviviría a un refactor que no cambia comportamiento?
