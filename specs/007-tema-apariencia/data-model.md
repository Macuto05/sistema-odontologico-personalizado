# Data Model: Tema de apariencia (Azul / Morado)

No hay entidades de dominio ni de base de datos: la "Preferencia de tema" (Key Entity de
spec.md) vive enteramente en el navegador, como estado de UI. Este documento describe su
forma en vez de un modelo relacional.

## Tipo `Tema`

```ts
type Tema = "azul" | "morado";
const TEMA_PREDETERMINADO: Tema = "azul";
```

- `"azul"` es el valor implícito cuando no hay nada guardado (FR-003) o cuando lo guardado no
  es un valor reconocido (Edge Case de spec.md: dato corrupto → se trata como ausente).
- No existe un tercer valor ni un modo "según el sistema operativo" — fuera de alcance
  (Assumptions de spec.md).

## Almacenamiento: `localStorage`

| Clave | Valores válidos | Valor por defecto si falta/inválido |
|---|---|---|
| `"tema"` | `"azul"` \| `"morado"` | `"azul"` |

Mismo mecanismo y misma clave de almacenamiento (`localStorage`, no `sessionStorage` ni
cookie) que `"sidebar-colapsada"` en `src/app/(shell)/layout.tsx` — persiste indefinidamente
por navegador, no por sesión (FR-004, FR-005).

## Contrato del hook `useTema`

```ts
function useTema(): {
  tema: Tema;
  setTema: (tema: Tema) => void;
};
```

- **Estado inicial** (antes del primer render en cliente): siempre `"azul"` — evita mismatch
  de hidratación SSR/cliente, igual que `colapsadaManual` en `ShellLayout`.
- **Efecto de montaje**: lee `localStorage.getItem("tema")`; si es `"azul"` o `"morado"`,
  actualiza el estado; en cualquier otro caso (ausente, corrupto, `localStorage`
  inaccesible) deja `"azul"` sin lanzar error (FR-008).
- **`setTema(nuevoTema)`**: actualiza el estado en memoria y escribe
  `localStorage.setItem("tema", nuevoTema)` en el mismo tick — no hay estado "pendiente de
  guardar" ni botón de confirmación (FR-002). Si `localStorage.setItem` falla (cuota,
  bloqueo del navegador), el estado en memoria igual se actualiza: el tema se aplica para la
  sesión actual aunque no persista (degradación acorde a FR-008).
- **No aplica el atributo `data-theme` por sí mismo** — quien llama al hook decide qué hacer
  con `tema` (separación entre "leer/guardar la preferencia" y "aplicarla al DOM", ver
  `TemaBootstrap` en research.md §2). Esto permite que el mismo hook se use tanto en
  `TemaBootstrap` (aplica el efecto global) como en la sección "Apariencia" de Configuración
  (lee `tema` para marcar el swatch activo y llama a `setTema` al hacer clic), sin duplicar
  lógica de lectura/escritura.

## Transiciones de estado

```
(sin preferencia guardada) ──primer render cliente──> "azul"
"azul" ──setTema("morado")──> "morado" ──setTema("azul")──> "azul"
```

No hay estados intermedios ("cargando", "error de guardado" visible al usuario): la
operación es síncrona y local, sin llamada de red (a diferencia de "Tus datos" o "Cambiar
contraseña" en la misma página, que sí modelan `EstadoEnvio`).
