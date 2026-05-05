---
name: clean-code-refactoring
description: Heurísticas para escribir y refactorear código limpio en TS/JS. Usala cuando estés escribiendo nuevo código, revisando un archivo grande, decidiendo si extraer un componente/función/hook, evaluando duplicación vs abstracción, nombrando variables/funciones, o cuando un archivo supera ~250 líneas. Cubre límites de tamaño, naming, DRY con criterio, cuándo introducir abstracciones, cuándo borrar código, y los "code smells" más comunes en proyectos React/TS.
---

# Clean code y refactoring — heurísticas pragmáticas

Reglas que de verdad mueven la aguja. No teoría — criterios accionables.

## 1. Tamaño — los umbrales que importan

| Unidad | Umbral típico | Acción si lo supera |
|---|---|---|
| Función | 30-50 líneas | Mirá si hay un sub-paso extraíble |
| Componente React | 150-200 líneas | Extraé sub-componentes o hooks |
| Página/screen | 200-300 líneas | Extraé features (formulario, lista, dialog) |
| Archivo (cualquiera) | 400 líneas | Probablemente está haciendo 2+ cosas |
| Hook custom | 80 líneas | Mirá si encadena responsabilidades |

**No son reglas duras** — son señales. Un archivo de 600 líneas con una sola lista enorme y bien estructurada puede estar bien. Uno de 250 con 8 responsabilidades mezcladas, no.

## 2. Cuándo extraer

Extraé cuando:
1. **Reutilizás 2+ veces** el mismo bloque (DRY genuino).
2. El bloque **tiene un nombre obvio** que aclara intención (`const isExpired = ...` → `function isExpired(...)`).
3. Hay **niveles de abstracción mezclados** en la misma función (lógica de negocio + manipulación de DOM + parsing).
4. Querés **testear algo en aislamiento**.

**No extraigas** cuando:
1. Es un wrapper de una sola línea sin agregar nombre/intención.
2. La "abstracción" es más confusa que la duplicación.
3. **Tres líneas similares no son DRY** — tres son tolerables. Cinco-seis empiezan a serlo. Diez ya no.

> **Rule of three**: duplicá una vez sin remordimiento, duplicá dos veces con sospecha, refactoreá la tercera.

## 3. Naming

- **Variables**: sustantivos. `users`, `selectedItem`, `isLoading`.
- **Funciones**: verbos. `fetchUser`, `parseDate`, `getNextPage`.
- **Booleanos**: `is*`, `has*`, `can*`, `should*`. Nunca `flag`, `status` solo (ambiguo).
- **Eventos**: handlers con `handle*` o `on*`. Props que reciben handlers: `on*`. Implementación: `handle*`.
  ```tsx
  <Button onClick={handleSubmit} />
  ```
- **No abrevies** salvo convenciones universales (`id`, `i` en for, `e` para event). `usrCnt` no, `userCount` sí.
- **Evitá nombres genéricos**: `data`, `result`, `info`, `helper`, `manager`, `processor`. Suelen ser señal de que no entendés bien lo que hace.
- **El nombre debe contar la intención, no la implementación**: `cleanInput` > `removeWhitespaceAndLowercase`.

### Naming + tipos

Si un nombre necesita un comentario para entenderse, mejoralo. Si un type necesita docstring para entender el shape, los nombres de campos están mal.

## 4. Funciones

- **Una responsabilidad** por función. Si describirla requiere "y", probablemente sean dos.
- **Argumentos**: 0-3 está bien. 4+ → considerá un objeto:
  ```ts
  // ❌
  createUser(name, email, role, orgId, sendEmail);
  // ✅
  createUser({ name, email, role, orgId, sendEmail });
  ```
- **Booleanos en argumentos** son code smell — el caller no sabe qué significa `true`:
  ```ts
  toggle(true);              // ❌ ¿qué hace true?
  toggle({ open: true });    // ✅
  open(); close();           // ✅✅ mejor: dos funciones
  ```
- **Salí temprano** (early return) en vez de anidar:
  ```ts
  // ❌
  function process(user) {
    if (user) {
      if (user.active) {
        if (user.email) {
          // ...
        }
      }
    }
  }
  // ✅
  function process(user) {
    if (!user) return;
    if (!user.active) return;
    if (!user.email) return;
    // ...
  }
  ```
- **Funciones puras > impuras** cuando se puede. Predecibles, testables, sin sorpresas.

## 5. Componentes React

- **Un componente, una pantalla mental**. Si para entenderlo tenés que scrollear y mantener 3 cosas en la cabeza, partilo.
- **Sub-componentes privados** OK en el mismo archivo si son chicos y solo lo usa el padre. Si crece o lo querés reusar, archivo aparte.
- **Custom hooks** para encapsular lógica con estado. La regla: si tu componente tiene 4+ `useState` y 2+ `useEffect` relacionados, hay un hook escondido.
  ```ts
  // Antes: lógica regada en el componente
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  useEffect(() => { /* fetch + filter */ }, [filter]);

  // Después: hook con la responsabilidad clara
  const { items, filter, setFilter, isLoading } = useFilteredItems();
  ```
- **Props drilling 3+ niveles** → context o store. Pero no antes.

## 6. Comentarios

- **Default: no escribas comentarios.** Bien-named identifiers ya cuentan qué hace el código.
- **Sí escribí comentarios cuando**:
  - El **POR QUÉ** no es obvio (workaround para un bug, restricción de negocio, decisión deliberada que parece rara).
  - Hay un **invariante oculto** que un futuro lector podría romper sin saber.
  - Hay un **link a contexto externo** (issue, RFC, ticket).
- **No comentes**:
  - Lo que el código ya dice (`// incrementa i` arriba de `i++`).
  - Historia (`// added by Juan in 2024`) — para eso está git blame.
  - Referencias al ticket/PR actual — viven en el commit message.
  - Código comentado "por las dudas" — borralo, está en git.

## 7. Code smells frecuentes

### "Dios component"
Componente con 600 líneas, 12 useState, 5 useEffect. → partir en hooks + sub-componentes.

### Boolean explosion
```ts
function Button({ primary, secondary, danger, large, small, disabled, loading })
```
→ `variant: 'primary' | 'secondary' | 'danger'`, `size: 'sm' | 'md' | 'lg'`. Discriminated unions o variants (CVA).

### Estado redundante
```ts
const [items, setItems] = useState([]);
const [count, setCount] = useState(0);
useEffect(() => setCount(items.length), [items]);  // ❌ count es derivable
```
→ `const count = items.length;`

### Loop con efectos secundarios mezclados
```ts
items.forEach(item => {
  if (item.x) total += item.x;
  if (item.y) saveSomewhere(item);
  log(item);
});
```
→ separá: `total = items.reduce(...)`, `items.filter(...).forEach(saveSomewhere)`.

### Prop drilling
Pasar la misma prop por 4 niveles. → context, composition, o store según el caso.

### `useEffect` para derivar de props
```ts
useEffect(() => setFullName(`${first} ${last}`), [first, last]);
```
→ `const fullName = `${first} ${last}`;`. No es estado, es derivación.

### Error swallowing
```ts
try { await api(); } catch {}
```
→ al menos `console.error` + decisión consciente. Comentario por qué se ignora.

### Magic numbers/strings
```ts
if (status === 3) ...   // ❌
if (status === 'PUBLISHED') ...  // mejor
if (status === Status.PUBLISHED) ...  // mejor aún si tenés enum/const
```

### Largas chains de `if/else if`
→ table lookup, polymorphism, o pattern matching con discriminated union.

## 8. DRY con criterio

DRY = **Don't Repeat Yourself**. Pero más importante:
- **No abstraigas hasta que veas el patrón claro** (3 usos).
- **Duplicación correcta > abstracción incorrecta**. Es más fácil de-duplicar más tarde que des-abstraer una abstracción mala.
- **Acoplamiento por abstracción es real**: si extraés un componente "para no repetir" pero los 3 callers necesitan props diferentes y el componente termina con 12 props condicionales, deshacelo.

## 9. Borrar código

- **El mejor código es el que no existe.** Si una feature/flag/función no se usa, borrala.
- **Comentar código** "por si acaso" es ruido. Git lo recuerda.
- **Código muerto detectado** (`noUnusedLocals`, lint) → borralo, no lo desactives.
- **Helper/wrapper sin uso real** → borralo.

## 10. Refactoring — cuándo y cómo

- **Antes** de agregar una feature nueva sobre código viejo: refactoreá lo mínimo necesario para que la feature quepa limpia.
- **Después** de hacer pasar un test: limpiá (rojo → verde → refactor).
- **Pasos chicos, commits chicos**. "Refactor del módulo X completo" en un solo commit es invision-imposible de revisar.
- **No mezcles** refactor con cambio de comportamiento en el mismo commit/PR. Es un infierno para revisar y revertir.
- **Tests cubren el refactor**: si no hay tests, escribí uno antes (caracterización), refactoreá, mantené el test verde.

## 11. Anti-patrones específicos React/TS

- ❌ `useEffect` para derivar estado de props.
- ❌ `useMemo` / `useCallback` preventivo sin medir.
- ❌ `any` "temporal".
- ❌ Componente con `if (loading) ... else if (error) ... else ...` para 3 estados → `<DataState>` reusable.
- ❌ Booleans para variants (`primary`, `secondary`, etc.).
- ❌ "Helper" llamado `utils.ts` con 40 funciones no relacionadas.
- ❌ Función que toma un objeto enorme para usar 2 campos:
  ```ts
  function f(user: User) { return user.name + user.email; }  // ❌ acopla a User entero
  function f(name: string, email: string) { ... }            // ✅ desacoplado
  ```

## Checklist al revisar/refactorear

1. ¿El archivo hace una sola cosa o varias mezcladas?
2. ¿Hay funciones de >50 líneas? ¿Componentes de >200?
3. ¿Los nombres explican intención sin necesidad de leer la implementación?
4. ¿Hay estado redundante (derivable de props/otro estado)?
5. ¿Hay `useEffect` que sería una variable derivada o un event handler?
6. ¿Hay duplicación 3+ veces que ya merece extracción?
7. ¿Hay abstracciones con 8+ props condicionales que tal vez deshacer?
8. ¿Hay comentarios que explican qué (en vez de por qué)?
9. ¿Hay `any`, código comentado, helpers sin uso?
10. ¿El refactor es un solo paso seguro o mezcla cambios de comportamiento?
