---
name: forms-rhf-zod
description: Buenas prácticas para formularios en React con react-hook-form y zod. Usala cuando estés escribiendo o revisando formularios — schemas de validación, useForm, register, Controller, FormProvider, integración con shadcn/Radix, arrays de campos, formularios multi-step, manejo de errores, o decidiendo si un form se queda con useState o pasa a RHF. Cubre los errores típicos (controlled vs uncontrolled, schemas que no infieren tipos, submit sin handleSubmit).
---

# Forms con react-hook-form + zod — buenas prácticas

Stack moderno para formularios en React: **react-hook-form** (RHF) para estado y rendimiento, **zod** para schema + validación + tipos en una sola pieza.

## 1. Cuándo usar RHF y cuándo no

| Form | Solución |
|---|---|
| 1-2 campos sin validación compleja | `useState` |
| Login simple | `useState` o RHF (preferencia) |
| Form con 3+ campos y validaciones | RHF + zod |
| Multi-step / wizard | RHF + zod (con un schema por paso o uno general) |
| Arrays de campos dinámicos | RHF + zod (`useFieldArray`) |
| Form de búsqueda con URL params | `useState` o `useSearchParams` |

**Regla**: si te ves escribiendo `useState` por cada input + un `validate()` a mano → RHF.

## 2. Schema zod = type + validación

```ts
import { z } from 'zod';

const courseSchema = z.object({
  name: z.string().min(1, 'Nombre requerido').max(80, 'Máximo 80 caracteres'),
  area_id: z.number().int().positive('Seleccioná un área'),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD'),
  description: z.string().optional(),
});

type CourseFormValues = z.infer<typeof courseSchema>;
```

- **`z.infer<typeof schema>`** te da el tipo gratis. Una sola fuente de verdad.
- **Mensajes en el schema**, no en el componente. Reusables.
- **No dupliques** el tipo a mano (`interface CourseFormValues { ... }` aparte del schema).

## 3. useForm — patrón base

```ts
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

function CourseForm({ defaultValues, onSubmit }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    reset,
  } = useForm<CourseFormValues>({
    resolver: zodResolver(courseSchema),
    defaultValues,
    mode: 'onBlur', // valida al perder foco — UX común
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Input {...register('name')} aria-invalid={!!errors.name} />
      {errors.name && <p role='alert'>{errors.name.message}</p>}

      <Button type='submit' disabled={isSubmitting || !isDirty}>
        Guardar
      </Button>
    </form>
  );
}
```

- **`zodResolver(schema)`** conecta zod con RHF.
- **`mode: 'onBlur'`** o `'onTouched'` — `'onChange'` es agresivo y rerendea mucho.
- **`isSubmitting`** desactiva el botón durante la mutation.
- **`isDirty`** evita submits sin cambios.
- **`reset(newValues)`** después de mutar (ej. cambio de defaults).

## 4. Inputs no nativos — Controller

`register` funciona con inputs HTML estándar. Para componentes custom (Radix Select, react-day-picker, shadcn DatePicker), usá `Controller`:

```tsx
import { Controller } from 'react-hook-form';

<Controller
  control={control}
  name='area_id'
  render={({ field, fieldState }) => (
    <Select value={String(field.value)} onValueChange={(v) => field.onChange(Number(v))}>
      <SelectTrigger aria-invalid={!!fieldState.error}>
        <SelectValue placeholder='Seleccioná un área' />
      </SelectTrigger>
      <SelectContent>
        {areas.map((a) => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}
      </SelectContent>
    </Select>
  )}
/>
```

- **`field.value` / `field.onChange`** — el componente custom debe llamar `onChange` con el valor.
- **`fieldState.error`** para mostrar el estado.
- **Coerción de tipo** acá si el componente trabaja con strings y el schema con números.

## 5. defaultValues — siempre

```ts
useForm<CourseFormValues>({
  resolver: zodResolver(courseSchema),
  defaultValues: {
    name: '',
    area_id: 0,
    start_date: '',
    description: '',
  },
});
```

- **Sin `defaultValues`**, los inputs son uncontrolled hasta el primer cambio → warnings y bugs sutiles (ej. `reset()` no funciona para campos sin default).
- **Para edición**, `defaultValues` viene del backend. Usá `useEffect(() => reset(data), [data])` cuando cargue async.

## 6. Errores — UI consistente

```tsx
<div>
  <Label htmlFor='name'>Nombre</Label>
  <Input id='name' {...register('name')} aria-invalid={!!errors.name} aria-describedby='name-error' />
  {errors.name && (
    <p id='name-error' role='alert' className='text-destructive text-sm'>
      {errors.name.message}
    </p>
  )}
</div>
```

- **`role='alert'`** o `aria-live` para que screen readers anuncien el error.
- **`aria-invalid`** + `aria-describedby` apuntando al mensaje.
- **Componente reusable**: `<FormField name='...' label='...' />` que envuelve label/input/error en un patrón único. shadcn ya provee `Form`, `FormField`, `FormItem`, `FormControl`, `FormMessage` — usalos si estás en shadcn.

## 7. Arrays dinámicos — useFieldArray

```ts
const { fields, append, remove } = useFieldArray({
  control,
  name: 'subjects',
});

// schema:
const schema = z.object({
  subjects: z.array(z.object({
    subject_id: z.number(),
    class_count: z.number().min(1),
  })).min(1, 'Agregá al menos un curso'),
});
```

- **Cada `field` tiene un `id`** generado por RHF — usalo como `key`, no como índice.
- **`append`/`remove`/`move`/`insert`** — no mutes `fields` directo.

## 8. Multi-step / wizard

Dos enfoques:

**A. Un schema general con campos opcionales por paso:**
```ts
const schema = z.object({
  step1Name: z.string().min(1),
  step2Email: z.string().email(),
  // ...
});
```
Usás `trigger(['step1Name'])` para validar solo el paso actual antes de avanzar.

**B. Schemas separados por paso, merge al final:**
```ts
const step1 = z.object({ name: z.string() });
const step2 = z.object({ email: z.string().email() });
const full = step1.merge(step2);
```
Útil cuando los pasos son lógicamente independientes.

- **Persistí el estado entre pasos** con un store (Zustand) o el form raíz si todos los pasos están en el mismo `useForm`.

## 9. Integración con mutations

```ts
const mutation = useMutation({
  mutationFn: (data: CourseFormValues) => coursesApi.create(data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: courseKeys.lists() });
    toastSuccess('Curso creado');
    onClose();
  },
  onError: (err) => showApiError(err),
});

const onSubmit = (values: CourseFormValues) => mutation.mutate(values);

// En el botón:
<Button type='submit' disabled={mutation.isPending}>Guardar</Button>
```

- **`mutation.isPending`** > `isSubmitting` cuando el submit dispara una mutation TanStack — `isSubmitting` se resetea apenas `onSubmit` retorna.
- **Errores del server** → `setError('root.serverError', { message })` o un toast separado. Errores de campo (ej. 422 con `details`) podés mapearlos a `setError('email', { message: 'ya en uso' })`.

## 10. Anti-patrones

- ❌ `useState` para 8 campos con validación a mano.
- ❌ `interface FormValues` paralelo al schema (se desincronizan).
- ❌ `register` en componentes custom de Radix → no funciona, usá `Controller`.
- ❌ Mezclar `value` controlado con `defaultValue` en el mismo input.
- ❌ Validar en el `onChange` del componente cuando zod ya lo hace.
- ❌ Botón de submit sin `type='submit'` (default es `submit` pero algunos componentes lo cambian).
- ❌ `mode: 'onChange'` en formularios largos → renders innecesarios.
- ❌ `defaultValues` faltantes → input uncontrolled → `reset()` no resetea.
- ❌ Index como `key` en `useFieldArray` (usá `field.id`).
- ❌ Submit que no llama `handleSubmit(onSubmit)` — sin eso no se valida.

## 11. Testing forms con RHF

```ts
it('muestra error si el nombre está vacío', async () => {
  const user = userEvent.setup();
  render(<CourseForm onSubmit={vi.fn()} />);

  await user.click(screen.getByRole('button', { name: /guardar/i }));

  expect(await screen.findByText(/nombre requerido/i)).toBeInTheDocument();
});

it('llama onSubmit con los valores válidos', async () => {
  const user = userEvent.setup();
  const onSubmit = vi.fn();
  render(<CourseForm onSubmit={onSubmit} />);

  await user.type(screen.getByLabelText(/nombre/i), '1A');
  await user.click(screen.getByRole('button', { name: /guardar/i }));

  await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(
    expect.objectContaining({ name: '1A' }),
    expect.anything(),
  ));
});
```

- **`findBy*`** porque la validación es async.
- **`expect.objectContaining`** porque RHF pasa el evento como segundo arg.

## Checklist al revisar un form

1. ¿Hay schema zod con `z.infer` para el tipo, sin tipo paralelo?
2. ¿`zodResolver` conectado en `useForm`?
3. ¿`defaultValues` declarados para todos los campos?
4. ¿Inputs custom usan `Controller`, no `register`?
5. ¿Errores con `role='alert'` y `aria-invalid`?
6. ¿`isSubmitting` / `isPending` deshabilita el submit?
7. ¿`useFieldArray` con `field.id` como key?
8. ¿`mode` apropiado (`onBlur` por default)?
9. ¿El submit llama `handleSubmit(onSubmit)`?
10. ¿Errores del server se mapean a campos cuando aplica?
