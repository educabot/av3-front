---
name: tailwind-shadcn
description: Patrones para Tailwind CSS y componentes shadcn/Radix. Usala cuando estés escribiendo o revisando UI con clases Tailwind, decidiendo cuándo abstraer en componente, usando cn(), variantes con cva (class-variance-authority), theming con CSS variables, dark mode, responsive, o composición con asChild/Slot. Cubre los errores típicos (clases regadas, condicionales inline ilegibles, variants con booleans, !important everywhere, tokens hardcodeados).
---

# Tailwind + shadcn — buenas prácticas

Tailwind escala bien si tenés disciplina. shadcn (componentes copiados, no instalados) sobre Radix es el stack moderno para SPAs accesibles. Esta skill cubre los dos juntos.

## 1. `cn()` — la utility que necesitás

```ts
// lib/utils.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- **clsx** maneja condicionales y arrays.
- **tailwind-merge** resuelve conflictos: `cn('p-2', 'p-4')` → `'p-4'`.
- **Usalo siempre** en componentes que aceptan `className` desde props.

```tsx
function Button({ className, variant, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'rounded-md px-3 py-2 text-sm font-medium transition-colors',
        variant === 'primary' && 'bg-primary text-primary-foreground',
        variant === 'ghost' && 'bg-transparent hover:bg-muted',
        className, // último → permite overrides desde el caller
      )}
      {...props}
    />
  );
}
```

**Regla**: el `className` del caller siempre va último en `cn()`.

## 2. Variants con `cva` (class-variance-authority)

Cuando un componente tiene múltiples ejes de variación (variant + size + state), `cva` ordena el caos:

```ts
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  // base
  'inline-flex items-center justify-center rounded-md font-medium transition-colors disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  },
);

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
```

- **Discriminated variants** > booleans (`primary`, `secondary`, `danger`) — la skill `react-typescript` lo dice también.
- **`compoundVariants`** para combinaciones específicas: "destructive + sm tiene este border extra".
- shadcn usa exactamente este patrón.

## 3. Theming con CSS variables

shadcn (y Tailwind 4) usan CSS variables con Tailwind classes:

```css
/* index.css */
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222 47% 11%;
    --primary: 221 83% 53%;
    --primary-foreground: 210 40% 98%;
  }
  .dark {
    --background: 222 47% 11%;
    --foreground: 210 40% 98%;
    --primary: 217 91% 60%;
    --primary-foreground: 222 47% 11%;
  }
}
```

```tsx
<div className='bg-background text-foreground' />
<button className='bg-primary text-primary-foreground' />
```

- **Nunca uses colores literales** (`bg-blue-500`) en componentes de dominio. Usá tokens (`bg-primary`).
- **Dark mode** = cambiar variables, no clases. Un solo `dark:` por excepción es OK; salpicar `dark:` por todos lados es código duplicado.
- **Tokens semánticos** (`background`, `muted`, `accent`, `destructive`) > tokens visuales (`gray-100`).

## 4. Cuándo abstraer en componente

Tailwind invita a regar clases. La regla:

| Situación | Acción |
|---|---|
| Misma combinación de clases en 1-2 lugares | Dejá inline |
| 3+ lugares | Extraé componente |
| Componente con muchas variantes | Usá `cva` |
| Layout específico de una página | Inline |
| Patrón de UI del sistema (Card, Section, Stack) | Componente reusable |

**Trampa común**: extraer en componente al primer uso "para no repetir" → componente con 12 props condicionales. Mejor: copiá una vez, abstraé en el tercer uso.

## 5. Composición con `asChild` (Radix/shadcn)

Radix permite "fundir" un componente con su hijo, manteniendo la API y el estilo:

```tsx
// ❌ doble interactivo (link dentro de button) — bug de a11y
<Button onClick={...}><a href='/x'>Ir</a></Button>

// ✅ asChild: el Button cede el rol al a, mantiene estilos
<Button asChild>
  <Link to='/x'>Ir</Link>
</Button>
```

- Funciona porque Radix usa `<Slot>` internamente.
- Útil para Button + Link, Dialog.Trigger + custom button, etc.
- Si tu componente custom necesita hacer lo mismo, importá `Slot` de `@radix-ui/react-slot`.

## 6. Responsive

- **Mobile-first**: clase base = mobile, prefijos `sm:`, `md:`, `lg:` para breakpoints más grandes.
- **No abuses de breakpoints**: `text-sm md:text-base lg:text-lg xl:text-xl` es ruido — elegí 2 puntos de quiebre y quedate con eso.
- **Container queries** (Tailwind 4): `@container` + `@md:` cuando el componente debe responder a su contenedor, no al viewport.

## 7. Estados (hover, focus, disabled)

```tsx
className='
  bg-primary text-primary-foreground
  hover:bg-primary/90
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
  disabled:opacity-50 disabled:pointer-events-none
'
```

- **`focus-visible:`** > `focus:` — solo cuando es focus por teclado, no por click.
- **Estados se ven, sí o sí**: hover y focus deben ser distinguibles visualmente.
- **`disabled:`** baja opacidad + corta interacción.
- **`group`/`peer`** para reaccionar a estado de elementos hermanos/padres:
  ```tsx
  <div className='group'>
    <input />
    <span className='hidden group-focus-within:block'>...</span>
  </div>
  ```

## 8. Dark mode

shadcn + `next-themes` (o equivalente) lo resuelven con clase en el `<html>`:

```tsx
<html className='dark'>
```

- Tokens hacen el trabajo automático.
- **Evitá `dark:bg-X dark:text-Y` esparcido** — si lo necesitás más de 1-2 veces, faltó un token.

## 9. Performance

- **Tailwind purga clases no usadas** — el bundle final es chico.
- **No construyas clases dinámicamente con strings** (`bg-${color}-500`): Tailwind no las detecta y las purga.
  - Mal: `<div className={\`bg-${variant}-500\`} />`
  - Bien: tabla lookup con clases completas:
    ```tsx
    const COLORS = { red: 'bg-red-500', blue: 'bg-blue-500' } as const;
    <div className={COLORS[variant]} />
    ```
- **Safelist** en `tailwind.config` para clases que sí se generan dinámicamente (raro, pero pasa).

## 10. shadcn — patrón "copy, no install"

shadcn no es una librería instalada — son componentes que copiás a tu repo y poseés. Implicaciones:

- **Modificar shadcn está bien** (es tu código).
- **Actualizaciones manuales**: shadcn evoluciona, pero vos no recibís updates automáticos. OK para componentes estables.
- **No los importes desde `node_modules`** — viven en `components/ui/`.
- **No los renombres** sin necesidad — el CLI/registry usa los nombres canónicos.

## 11. Anti-patrones

- ❌ Clases regadas en JSX condicional ilegible:
  ```tsx
  className={`p-2 ${active ? 'bg-blue-500 text-white' : 'bg-gray-100'} ${size === 'lg' ? 'text-lg' : 'text-sm'}`}
  ```
  → usá `cn()` o `cva`.
- ❌ Colores literales en componentes (`bg-blue-500`) en vez de tokens (`bg-primary`).
- ❌ `!important` (`!bg-red-500`) para vencer la cascada → arreglá la cascada.
- ❌ `style={{...}}` mezclado con Tailwind sin razón.
- ❌ Componente con 10 props booleanas (`primary`, `secondary`, `large`, `small`) → `variant` + `size` con `cva`.
- ❌ Construir nombres de clase con template strings dinámicos.
- ❌ Replicar `dark:`-prefixed por todo el árbol — faltan tokens.
- ❌ Inline `<Button className='!bg-red-500'>` para hacer un botón rojo → agregá variant `destructive`.
- ❌ Re-implementar componentes que shadcn ya provee (Dialog, Select, DropdownMenu) → te perdés a11y de Radix.

## 12. Convenciones para tu equipo

Decidí explícitamente y documentá:

1. **Orden de clases**: alfabético, por categoría, o automático (`prettier-plugin-tailwindcss`). El plugin es lo más fácil.
2. **Cuándo extraer componente**: regla de 3 + nombre claro.
3. **Tokens semánticos**: lista de los que usa el equipo (`primary`, `muted`, `accent`, `destructive`).
4. **Ubicación de variants**: junto al componente, en `cva`.
5. **Política de dark mode**: tokens, no `dark:` regado.

## Checklist al revisar UI

1. ¿Hay `cn()` cuando el componente acepta `className` desde props?
2. ¿Las variantes usan `cva` o son booleans + ternarios?
3. ¿Los colores son tokens semánticos o literales (`bg-blue-500`)?
4. ¿Las clases están construidas estáticamente (no template strings dinámicos)?
5. ¿`focus-visible:` para estados de focus, no `focus:`?
6. ¿`asChild` cuando hay anidamiento de componentes interactivos?
7. ¿Componentes shadcn modificados en su lugar, o duplicados aparte?
8. ¿Dark mode resuelto por tokens, no por `dark:` regado?
9. ¿Componentes con >8 props condicionales? → consolidá con `cva`.
10. ¿Hay `!important` o `style={{}}` que delaten una pelea con la cascada?
