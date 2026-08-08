# Research: Indicador de Estado de Sincronización

## 1. Colores de estado: reutilizar tokens existentes, no crear nuevos

**Decision**: los 4 estados del indicador se mapean a tokens semánticos ya ratificados en
`docs/design-system.md` §3.3, sin agregar ningún color nuevo:

| Estado del indicador | Token reutilizado |
|---|---|
| Sin conexión | `--color-muted-foreground` (neutro, ya usado en `TopAppBar.module.css`) |
| Sincronizando | `--color-info` / `--color-info-bg` (§3.3, "reutiliza la familia del primario, no es un color nuevo") |
| Con conflicto | `--color-warning` / `--color-warning-bg` (mismo par que `Badge` variant `warning`, 010-gestion-insumos) |
| Con conexión (al día) | `--color-success` / `--color-success-bg` (mismo par que `Badge` variant `success`) |

**Rationale**: Principio VI prohíbe introducir paleta ad hoc por feature. Los 4 estados
mapean 1:1 a los 4 significados que el sistema de diseño ya reserva para "neutro/inactivo",
"acción en curso", "requiere atención" y "éxito" — no hace falta ampliar
`docs/design-system.md`.

**Alternatives considered**: `--color-primary` para "sincronizando" — descartado durante la
implementación al releer §3.3: los tokens de estado son deliberadamente independientes del
tema ("una alerta de error es roja sin importar qué tema esté activo"), mientras que
`--color-primary` sigue el tema activo (cian o morado, §3.2.1). Usarlo dejaría uno de los 4
estados cambiando de color con el tema y los otros tres no. `--color-info` es el token de
estado que el sistema de diseño ya reserva para exactamente este caso.

## 2. Componente nuevo vs. reutilizar `Badge`

**Decision**: `Badge` (`src/components/ui/Badge.tsx`) no alcanza — es texto estático sin
interacción, sin punto de estado animado y sin panel desplegable. Se crea un componente nuevo,
`SyncStatusPill`, que reutiliza los tokens de color de `Badge`/design-system pero tiene su
propio marcado (punto + texto + panel al click).

**Rationale**: Principio VI exige revisar componentes existentes antes de crear uno nuevo,
pero no exige forzar un componente a un caso de uso que no cubre. El indicador es clickeable
y con estado en vivo — una responsabilidad distinta a un `Badge` de solo lectura.

## 3. Dónde vive el estado derivado (offline / sincronizando / conflicto / al día)

**Decision**: una función pura, `derivarEstadoSync(input): EstadoSyncUI`, sin dependencias de
React ni del DOM, que recibe `{ online, pendientes, conflictos, progreso }` y devuelve el
estado + texto a mostrar según la prioridad ya definida en el spec (FR-009). Vive junto a la
lógica de sync existente (`src/infrastructure/sync/`), no en el componente.

**Rationale**: Principio I exige tests-first; una función pura sin mocks de red/IndexedDB ni
render de React es la forma más barata de cubrir las 4 transiciones de estado y sus
prioridades con Vitest.

## 4. Progreso del push (%): almacenamiento efímero, no persistido

**Decision**: un store mínimo en memoria (`src/infrastructure/sync/syncStatus.ts`, patrón
pub/sub simple — `suscribir`/`obtenerProgreso`/`iniciarProgreso`/`actualizarProgreso`/
`limpiarProgreso`), consumido desde React vía `useSyncExternalStore`. `ejecutarCicloDeSync`
(en `syncEngine.ts`) lo actualiza: cuenta el total de pendientes al iniciar el ciclo de push,
y lo va actualizando a medida que `sincronizarLote` vacía la cola.

**Rationale**: el spec (Assumptions) ya establece que el progreso es efímero y se resetea al
recargar la página — no amerita una tabla nueva en Dexie ni un bump de versión de esquema
(Principio V, YAGNI). No se usa React Context: el valor cambia varias veces por segundo
mientras el push está activo, y un Context re-renderiza todo su árbol de suscriptores;
`useSyncExternalStore` limita el re-render al único componente que lo lee.

**Alternatives considered**: Context Provider en `ShellLayout` — descartado por el costo de
re-render innecesario y porque ningún otro componente del árbol necesita este valor.

## 5. Última sincronización exitosa: nuevo watermark en `metaSync`

**Decision**: nueva clave `CLAVE_ULTIMA_SINCRONIZACION_GENERAL` en la tabla `metaSync` ya
existente (mismo patrón que las 6 claves `CLAVE_ULTIMA_SINCRONIZACION_*` que ya usa
`syncEngine.ts` — no requiere nueva tabla ni bump de versión de Dexie). Se escribe al final de
`ejecutarCicloDeSync()`.

**Simplificación aceptada**: hoy cada `pull*DesdeServidor()` atrapa sus propios errores de red
y retorna en silencio (no propaga el fallo a quien lo llama) — así que `ejecutarCicloDeSync`
no puede hoy distinguir "todos los pulls terminaron bien" de "uno falló a mitad de camino y
el siguiente igual se ejecutó". Encadenar un booleano de éxito a través de las 6 funciones de
pull para que este timestamp sea 100% preciso es una complejidad no justificada por el
requisito (FR-006 solo pide un indicador aproximado, "hace N min", no una garantía
transaccional) — Principio V. Si el dispositivo está offline, el guard existente
(`if (!navigator.onLine) return`) ya impide que se llegue a esta línea, así que el caso más
importante (no mentir "sincronizado" estando offline) sí queda cubierto.

## 6. Evento `offline`: falta en `syncEngine.ts`

**Decision**: se agrega un listener de `window.addEventListener("offline", ...)` — hoy
`iniciarSyncEngine()` solo escucha `"online"` (para reintentar). El nuevo listener no dispara
ningún reintento (no hay nada que reintentar sin conexión); solo existe para que el hook de UI
pueda reaccionar de inmediato al perder la conexión, en vez de depender de que algún otro
efecto lo note.

**Rationale**: sin este evento, la única forma de detectar "se acaba de perder la conexión" es
sondear `navigator.onLine` con un intervalo (polling) — Principio VIII prohíbe llamadas o
chequeos redundantes cuando existe un evento nativo del navegador para lo mismo.

## 7. Cobertura en pantallas sin `TopAppBar`

**Decision**: `ShellLayout` (`src/app/(shell)/layout.tsx`) ya bifurca por `pathname` para el
colapso de la Sidebar (`colapsadaPorRuta`). Se extiende el mismo criterio: una lista explícita
de patrones de ruta determina si `ShellLayout` monta el `SyncStatusPill` de respaldo en
posición fija.

**Invertido durante la implementación**: la lista enumera las rutas que **sí** tienen
`TopAppBar` (y el layout monta el pill fijo en todo el resto), no las que no. Con la versión
original, una pantalla nueva que no monte `TopAppBar` quedaría sin indicador — un
incumplimiento silencioso de FR-010. Invertida, el olvido produce dos indicadores visibles a la
vez: un error que se nota al instante y se corrige solo. Se elige el modo de falla ruidoso
sobre el silencioso.

**Corrección de la lista**: `/pacientes/archivados` **no** es una pantalla sin `TopAppBar` —
es solo un `redirect()` a `/pacientes?estado=ARCHIVADO` (la pantalla unificada con pestañas),
que sí la tiene. Las pantallas reales sin barra superior son tres, verificadas contra el
código: `/citas/[id]`, `/pacientes/[id]` y `/pacientes/[id]/odontograma`.

**Rationale**: no existe hoy ningún mecanismo para que `TopAppBar` le "avise" a `ShellLayout`
que ya se montó (ni falta uno para nada más en el proyecto) — introducir Context solo para
esta señal sería una abstracción nueva no justificada por ningún otro caso de uso actual
(Principio V). La lista de rutas es un dato a mantener manualmente, mismo trade-off que ya
acepta `colapsadaPorRuta` hoy.

**Alternatives considered**: registrar un Context "TopAppBar montado" — descartado (YAGNI, un
único consumidor). Poner el pill siempre fijo y nunca dentro de `TopAppBar` — descartado
porque pierde la ubicación validada con el usuario ("antes del engranaje", dentro del flujo
existente) y requeriría offsets manuales para no superponerse con el ancho variable del botón
"+ Nuevo" de cada pantalla.

## 8. Responsive (Principio VI, no negociable)

**Decision**: mismo breakpoint que `TopAppBar.module.css` (`max-width: 639px`, sección
`.right`/`.iconButton`). Bajo ese ancho, el pill colapsa a solo el punto de estado (sin
texto), igual criterio que los `iconButton` existentes que ya se achican en ese breakpoint. El
texto se oculta con la técnica de "solo para lectores de pantalla" (no `display: none`) y el
`aria-label` del botón lo repite, para no romper §4.1 ("ningún estado se comunica solo con
color"). El panel desplegable mantiene el texto completo al tocarlo, sin importar el ancho.

## 9. Accesibilidad del panel desplegable

**Decision**: el panel se anuncia como `role="dialog"` no modal (sin `aria-modal`), recibe el
foco al abrirse (`tabIndex={-1}` + `.focus()`) y lo devuelve al pill al cerrarse con Escape.
El botón lleva `aria-expanded` y `aria-controls`.

**Rationale**: detectado durante el pase de accesibilidad — un `role="dialog"` que nunca recibe
el foco deja su contenido fuera del alcance del teclado y del lector de pantalla. El foco no se
devuelve al cerrar con un click fuera (solo con Escape): hacerlo se lo robaría al elemento que
el usuario acaba de tocar.
