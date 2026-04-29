---
name: accessibility-a11y
description: Buenas prácticas de accesibilidad (a11y) para aplicaciones web React. Usala cuando estés escribiendo o revisando elementos interactivos (botones, links, inputs), formularios, dialogs/modales, menús, navegación por teclado, focus management, ARIA, contraste, o cualquier UI que el usuario use con keyboard/screen reader. Cubre los errores típicos (div con onClick, button sin label accesible, focus que se pierde, ARIA mal usado, contraste insuficiente).
---

# Accesibilidad (a11y) — buenas prácticas

Hacer una app accesible **no es opcional** y tampoco es difícil si seguís un par de reglas. La mayoría de los problemas vienen de no usar HTML semántico correctamente.

## 1. La regla número 1: HTML semántico > ARIA

> "The first rule of ARIA is: don't use ARIA." — W3C ARIA Authoring Practices

```tsx
// ❌ div con onClick — no es accesible por teclado, screen readers no lo anuncian
<div onClick={handleClick} className='cursor-pointer'>Guardar</div>

// ✅ button — focus, Enter/Space, anunciado correctamente, gratis
<button onClick={handleClick}>Guardar</button>
```

**Elementos con superpoderes a11y gratuitos:**
- `<button>` — clickable, focusable, Enter/Space, role implícito.
- `<a href>` — navegable, focusable, contextual.
- `<input>`, `<select>`, `<textarea>` — labels, validación nativa.
- `<form>` — submit con Enter, validación nativa.
- `<nav>`, `<main>`, `<header>`, `<footer>`, `<section>`, `<article>` — landmarks.
- `<ul>`, `<ol>`, `<li>` — listas anunciadas con cuenta.
- `<dialog>` — modal nativo (con caveats).

**Si te encontrás escribiendo `role='button'` en un div, parate y usá `<button>`.**

## 2. Botones vs links

```tsx
// Acción (no cambia la URL): button
<button onClick={handleDelete}>Eliminar</button>

// Navegación (cambia la URL): link
<a href='/profile'>Perfil</a>
<Link to='/profile'>Perfil</Link>
```

**Reglas:**
- **`<button type='button'>`** por default si no es submit (evita submits accidentales en forms).
- **No uses `<a>` con `href='#'`** y `onClick` para acciones — es un button.
- **No uses `<button>` para navegar** — perdés ctrl+click, abrir en pestaña, copiar URL.

## 3. Labels para todo input

Cada input necesita una label asociada:

```tsx
// ✅ explícito (preferido)
<label htmlFor='email'>Email</label>
<input id='email' type='email' />

// ✅ wrapping
<label>
  Email
  <input type='email' />
</label>

// ✅ aria-label cuando no podés mostrar texto (icon-only inputs)
<input aria-label='Buscar' type='search' />

// ❌ placeholder NO es label
<input placeholder='Email' />
```

**Por qué importa**: screen readers anuncian el label, y clickear la label foca el input.

## 4. Botones icon-only

```tsx
// ❌ screen reader no sabe qué hace
<button onClick={close}><XIcon /></button>

// ✅ aria-label describe la acción
<button onClick={close} aria-label='Cerrar diálogo'>
  <XIcon aria-hidden='true' />
</button>
```

- **`aria-label`** describe la acción/destino.
- **`aria-hidden='true'`** en el icon decorativo para que no se anuncie dos veces.

## 5. Focus management

### Focus visible

```css
/* Cualquier elemento focuseable debe mostrar focus visible */
:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
}
```

```tsx
className='focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
```

- **`focus-visible:`** > `focus:` — solo cuando focus es por teclado, no por click (mejor UX visual).
- **Nunca `outline: none` sin reemplazo** — quitás la única señal de focus para usuarios de teclado.

### Trap de focus en dialogs

Cuando se abre un modal, el focus debe quedarse adentro:

```tsx
import { Dialog } from '@radix-ui/react-dialog';

<Dialog>...</Dialog>
```

Radix lo hace automático: trap de focus, focus inicial en el primer focuseable, restore al cerrar. Si no usás Radix, usá `focus-trap-react` o implementalo a mano (muy fácil de equivocarse).

### Restore focus al cerrar overlays

Cuando cerrás un dialog/dropdown, el focus debe volver al elemento que lo disparó. Radix también lo hace.

### Focus programático

```tsx
const inputRef = useRef<HTMLInputElement>(null);
useEffect(() => {
  inputRef.current?.focus();
}, []);

<input ref={inputRef} />
```

Útil para:
- Foco al primer input al abrir un form.
- Foco a un mensaje de error tras un submit fallido.
- Foco al título de la nueva página tras navegación SPA (los SPAs no lo hacen automático).

## 6. Navegación por teclado

Todo lo que se puede hacer con mouse, debe poder hacerse con teclado:

| Acción | Tecla esperada |
|---|---|
| Navegar entre focuseables | Tab / Shift+Tab |
| Activar button/link | Enter (button también con Space) |
| Cerrar dialog/dropdown | Escape |
| Navegar en menú/select | Flechas |
| Seleccionar primera/última opción | Home / End |

**Probá tu UI con solo teclado** — es la prueba más rentable que existe.

## 7. ARIA — cuando es necesario

ARIA es para cuando HTML semántico no alcanza. Casos típicos:

### `aria-live` — anunciar cambios dinámicos

```tsx
<div aria-live='polite'>{toastMessage}</div>
<div aria-live='assertive' role='alert'>{errorMessage}</div>
```

- `polite`: anuncia cuando termina lo que está hablando.
- `assertive` / `role='alert'`: interrumpe — para errores críticos.

### `aria-invalid` + `aria-describedby` para campos con error

```tsx
<input
  id='email'
  aria-invalid={!!error}
  aria-describedby={error ? 'email-error' : undefined}
/>
{error && <p id='email-error' role='alert'>{error}</p>}
```

### `aria-expanded` / `aria-controls` para toggles

```tsx
<button
  aria-expanded={isOpen}
  aria-controls='menu-1'
  onClick={() => setOpen(!isOpen)}
>
  Menú
</button>
{isOpen && <ul id='menu-1'>...</ul>}
```

### `aria-current` para navegación activa

```tsx
<Link to='/home' aria-current={isActive ? 'page' : undefined}>Home</Link>
```

### Reglas ARIA

1. **No re-declares lo que el HTML ya dice**: `<button role='button'>` es redundante (y peor: `<button role='link'>` rompe).
2. **Roles requieren propiedades**: `role='dialog'` necesita `aria-labelledby` o `aria-label`. `role='alert'` ya implica `aria-live='assertive'`.
3. **`aria-hidden='true'`** oculta del screen reader — útil para iconos decorativos. **Nunca lo pongas en algo focuseable** (los users de teclado siguen pudiendo entrar).

## 8. Contraste de color

- **Texto normal**: ratio ≥ **4.5:1** vs background.
- **Texto grande (≥18pt o ≥14pt bold)**: ratio ≥ **3:1**.
- **Estados focus / borders**: ratio ≥ **3:1**.

Usá [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/) o las DevTools.

**No transmitas info solo con color**: un error en rojo también necesita un icono o texto que diga "error".

## 9. Imágenes

```tsx
// Imagen informativa: alt describe el contenido
<img src='/logo.svg' alt='Logo de Alizia' />

// Imagen decorativa: alt vacío (sí, vacío, no ausente)
<img src='/decoration.svg' alt='' />

// SVG como icono dentro de botón con texto
<button><CheckIcon aria-hidden='true' /> Aceptar</button>
```

## 10. Forms accesibles

- **Label asociada** a cada input.
- **Errores con `role='alert'`** para que se anuncien.
- **`aria-invalid`** en el input.
- **Submit funciona con Enter** (gracias a `<form>` + `<button type='submit'>`).
- **Foco al primer error** después de un submit inválido.
- **Required fields marcados** visualmente y con `aria-required` o `required`.
- **Mensajes claros**: "Email inválido" > "Error en campo 1".

## 11. Modales / Dialogs

Checklist mínimo:
- [ ] Focus se mueve al modal al abrirse.
- [ ] Focus queda atrapado adentro (Tab cicla).
- [ ] Escape cierra.
- [ ] Click en backdrop cierra (configurable, pero esperado).
- [ ] Focus vuelve al disparador al cerrar.
- [ ] `aria-labelledby` apunta al título o `aria-label` describe el modal.
- [ ] El resto de la página queda inaccesible (Radix lo hace con `inert`/`aria-hidden`).

**Radix Dialog te da todo esto gratis.** Si no usás Radix, implementalo cuidadosamente o usá una librería.

## 12. Skip links

Para usuarios de teclado, un "skip to content" al inicio de la página les ahorra Tab-ear por toda la nav:

```tsx
<a href='#main' className='sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2'>
  Saltar al contenido principal
</a>
<nav>...</nav>
<main id='main'>...</main>
```

`sr-only` (clase de Tailwind) lo oculta visualmente pero no para screen readers; se vuelve visible al recibir focus.

## 13. Routing en SPAs

SPAs rompen el comportamiento nativo de navegación. Cosas a hacer:

- **Anunciar el cambio de página**: `<h1>` actualizado o `aria-live` en un region que diga la página actual.
- **Foco al `<h1>` o al `<main>`** después de navegar.
- **Título del documento (`document.title`) actualizado** por ruta.

Librerías: `react-helmet-async`, `react-router`'s loaders pueden ayudar a coordinar esto.

## 14. Testing a11y

### Testing Library — usá queries accesibles

```ts
// ✅ refleja la API que usa el screen reader
screen.getByRole('button', { name: /guardar/i });
screen.getByLabelText(/email/i);

// ❌ getByTestId esquiva la accesibilidad
screen.getByTestId('save-btn');
```

Si tenés que usar `getByTestId`, suele ser señal de que el elemento no es accesible.

### `jest-axe` — auditoría automática

```ts
import { axe, toHaveNoViolations } from 'jest-axe';
expect.extend(toHaveNoViolations);

it('no tiene violaciones a11y', async () => {
  const { container } = render(<Login />);
  expect(await axe(container)).toHaveNoViolations();
});
```

- Captura ~30-40% de los problemas de a11y automáticamente.
- **El resto requiere testing manual** con teclado y screen reader.

### Manual

- **Solo teclado**: Tab, Shift+Tab, Enter, Space, Escape, flechas. ¿Podés hacer todo?
- **Screen reader**: VoiceOver (Mac), NVDA (Win), Narrator (Win), TalkBack (Android). Probá las pantallas críticas.
- **Zoom 200%**: ¿la UI sigue funcionando?
- **Reduced motion**: respetá `prefers-reduced-motion`.

## 15. Anti-patrones

- ❌ `<div onClick>` en vez de `<button>`.
- ❌ `<a href='#'>` con `onClick` para una acción.
- ❌ `<input>` sin label.
- ❌ Botón icon-only sin `aria-label`.
- ❌ `outline: none` sin reemplazo de focus.
- ❌ `placeholder` como sustituto de label.
- ❌ `role='button'` o `role='link'` en `<div>` (con suerte funciona, sin suerte no).
- ❌ Errores de form solo en color rojo, sin icono ni texto explícito.
- ❌ Modales sin trap de focus, sin `Escape`, sin restore.
- ❌ `aria-hidden='true'` en algo focuseable.
- ❌ ARIA roles redundantes (`<button role='button'>`).
- ❌ Foco perdido tras cambio de ruta en SPA.
- ❌ `tabIndex='1'` (positivo) — rompe el orden natural de focus.
- ❌ Imágenes informativas con `alt=''`, decorativas sin `alt`.

## Checklist al revisar un componente / página

1. ¿Todos los interactivos son `<button>`/`<a>`/`<input>`, no `<div>`?
2. ¿Cada input tiene label asociada?
3. ¿Botones icon-only tienen `aria-label`?
4. ¿Focus es visible (`focus-visible:`)?
5. ¿Se puede usar todo con solo teclado (Tab, Enter, Escape, flechas)?
6. ¿Los modales atrapan focus y vuelven al disparador al cerrar?
7. ¿Mensajes de error usan `role='alert'` o `aria-live`?
8. ¿Inputs inválidos tienen `aria-invalid` y `aria-describedby`?
9. ¿Contraste de texto ≥ 4.5:1?
10. ¿Tests usan `getByRole`/`getByLabelText`, no `getByTestId`?
11. ¿`document.title` se actualiza al cambiar de ruta?
12. ¿La info crítica no depende solo del color?
