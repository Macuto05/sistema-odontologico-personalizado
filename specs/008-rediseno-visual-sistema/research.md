# Research: Rediseño visual del sistema (estilo mockup DentalPro)

## Decisión 1: Cómo sincronizar `TopAppBar` (fixed) con el colapso de la sidebar

**Decisión**: Crear `SidebarContext` (React Context + hook `useSidebarColapsada()`) provisto
por `ShellLayout`, que expone el mismo booleano `colapsada` que ya calcula ese layout
(colapso manual vía `localStorage` + colapso forzado por ruta). `TopAppBar` lo consume para
alternar entre `margin-left: 256px` y `margin-left: 64px`.

**Rationale**: `TopAppBar` usa `position: fixed`, por lo que escapa por completo al flujo
normal del DOM — el `margin-left` de `.content` (el `<div>` no-fixed que ya compensa el ancho
de la sidebar) no lo afecta. Necesita su propia fuente del mismo booleano. `ShellLayout` ya es
el único lugar que calcula `colapsada` (combinando el toggle manual guardado en
`localStorage` y el colapso forzado por ruta para el panel de Atención) — exponerlo por
contexto evita que `TopAppBar` (o cualquier otro elemento fixed futuro) tenga que
recalcularlo por su cuenta, duplicando la lectura de `localStorage` y la lógica de ruta.

**Alternatives considered**:
- **Mover el montaje de `TopAppBar` al propio `ShellLayout`** (en vez de por página): quedaría
  automáticamente sincronizado porque estaría en el mismo árbol que ya tiene `colapsada`. Se
  descartó para esta ronda porque `TopAppBar` varía su contenido por página (placeholder de
  búsqueda, callback de búsqueda, botón de acción principal con label/href distintos) — eso
  requeriría diseñar ahora una API de configuración por ruta (slots, props inyectadas, etc.)
  para un caso de uso que hoy solo tiene un consumidor (`/pacientes`). Viola Principio V
  (YAGNI): se prefiere la abstracción mínima (un contexto de solo lectura) hasta que un
  segundo consumidor real justifique diseñar esa API. Si en una spec futura 2+ pantallas
  necesitan `TopAppBar`, se reconsidera.
- **Prop drilling manual** (pasar `colapsada` como prop desde cada página): descartado porque
  cada página que use `TopAppBar` tendría que volver a leer el estado desde `ShellLayout`, que
  no expone esa prop hacia sus `children` hoy — requeriría cambiar la firma de
  `ShellLayout` de todos modos, con la misma superficie de cambio que el contexto pero sin la
  ventaja de poder consumirse desde cualquier profundidad del árbol.
- **CSS puro con variable custom property actualizada por JS** (sin contexto de React):
  técnicamente viable, pero menos idiomático en una base ya construida 100% con componentes de
  React con estado — introduciría un patrón de sincronización distinto (mutación directa del
  DOM) que no tiene precedente en el resto del proyecto.

## Decisión 2: Cómo evitar el `margin-left` duplicado a futuro (no solo en Pacientes)

**Decisión**: `docs/design-system.md` documenta explícitamente, en la nueva sección de layout,
que **el offset por sidebar se resuelve una única vez, en `ShellLayout`/`.content`** — ninguna
página ni componente hijo debe volver a aplicar `margin-left` por el ancho de la sidebar. Solo
elementos `position:fixed` (como `TopAppBar`) necesitan su propio mecanismo de sincronización
(ver Decisión 1), precisamente porque escapan al flujo normal donde `.content` ya resuelve el
offset.

**Rationale**: El bug reportado por el usuario fue exactamente esto — `pacientes.module.css`
volvió a aplicar `margin-left: 256px` sobre un `<main>` que ya vivía dentro de `.content`.
Documentar la regla en el design system (no solo arreglar el síntoma puntual) es lo que exige
Principio VI: evitar que la próxima pantalla migrada al nuevo estilo reintroduzca el mismo bug
por desconocimiento.

**Alternatives considered**:
- **Arreglar solo `pacientes.module.css` sin documentar la regla general**: descartado — no
  cumple el pedido explícito del usuario de dejar esto documentado para trabajo futuro (User
  Story 3 de spec.md), y el mismo bug reaparecería en la próxima página migrada.

## Decisión 3: Alcance de la documentación en `docs/design-system.md`

**Decisión**: Se agrega una sección nueva versionada (siguiendo el formato ya establecido del
documento — bump de versión + entrada de changelog) que cubre: paleta de colores (valores hex
concretos ya aplicados en `globals.css`), tipografía (Inter + fallbacks), radios de borde y
sombras ("soft-saas"), y los 4 patrones de componente construidos (`TopAppBar`, tarjeta de
métrica/bento, switch-tabs animado, tabla de datos moderna) con sus clases CSS de referencia.
Incluye una tabla explícita de qué pantallas ya usan el estilo nuevo (`/pacientes`) y cuáles
siguen con el estilo anterior (Inicio, Insumos, ficha de paciente, Odontograma, Citas,
Configuración), para que trabajo futuro sepa dónde aplicar qué.

**Rationale**: Es literalmente FR-006/FR-007 de spec.md y el pedido explícito del usuario
("documenta todos esos cambios... de manera que los próximos cambios tengan este nuevo diseño
por defecto"). El formato de versión + changelog ya es el patrón establecido en el documento
(visto en las secciones §6.16 del Odontograma en rondas anteriores) — se reutiliza sin
inventar un formato nuevo.

**Alternatives considered**:
- **Documento nuevo separado** (p. ej. `docs/rediseno-visual.md`): descartado — Principio VI
  es explícito en que `docs/design-system.md` es la *única* fuente canónica; crear un segundo
  documento de estilos fragmentaría esa fuente de verdad, exactamente lo que el principio
  busca evitar.
