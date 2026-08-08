---

description: "Task list for Indicador de Estado de Sincronización (011-indicador-sincronizacion)"
---

# Tasks: Indicador de Estado de Sincronización

**Input**: Design documents from `/specs/011-indicador-sincronizacion/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md,
`.specify/memory/constitution.md`

**Tests**: **Obligatorios**, no opcionales — Principio I de la constitución (Test-First,
NON-NEGOTIABLE). Lo que es lógica pura (`derivarEstadoSync`, `syncStatus`) se cubre con Vitest;
lo que toca IndexedDB real o el navegador (el pill montado, el watermark, las transiciones
offline/online) se cubre con Playwright e2e, mismo patrón que
`tests/e2e/offline-sync.spec.ts` — el proyecto no tiene `fake-indexeddb` instalado.

**Organization**: Las tareas están agrupadas por historia de usuario (spec.md) para poder
implementar y probar cada una de forma independiente.

**Nota de alcance**: no hay tareas de Setup de proyecto desde cero — reutiliza el stack ya
instalado (Next.js, Dexie, Vitest, Playwright). No se agrega ninguna tabla nueva a Dexie ni
ningún endpoint de API.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede ejecutar en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: a qué historia de usuario pertenece (US1, US2, US3)
- Cada tarea incluye la ruta de archivo exacta

## Path Conventions

Mismo proyecto único Next.js del resto del sistema (ver `plan.md` §Project Structure):
`src/infrastructure/sync/`, `src/hooks/`, `src/components/ui/`, `src/app/(shell)/`, `tests/`.

---

## Phase 1: Setup

- [X] T001 Confirmar que no hacen falta dependencias nuevas (research.md) y que `npm run lint`
  / `npx tsc --noEmit` corren limpios sobre el estado actual del repo antes de empezar (línea
  base) — **línea base registrada**: `tsc --noEmit` limpio; `npm run lint` con 1 error + 87
  warnings **preexistentes y todos en archivos generados** (`next-env.d.ts` de Next.js,
  `public/sw.js`, `public/workbox-*.js`, `public/swe-worker-*.js`), ninguno en código fuente.
  Ese es el punto de comparación de T028 — no se "arregla" acá porque implicaría tocar la
  config de lint, fuera del alcance de esta feature

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: la maquinaria compartida que las 3 historias de usuario necesitan — el tipo de
estado derivado, el store de progreso, el hook, el componente base y sus 2 puntos de montaje.
Sin esto ninguna historia es visible en pantalla.

**⚠️ CRITICAL**: Ninguna historia de usuario puede empezar hasta que esta fase esté completa.

- [X] T002 [P] Agregar constante `CLAVE_ULTIMA_SINCRONIZACION_GENERAL` a
  `src/infrastructure/db/dexie/db.ts` (data-model.md — nueva fila en `metaSync`, sin bump de
  versión de esquema)
- [X] T003 [P] Test unitario de `derivarEstadoSync()` en `tests/unit/derivarEstadoSync.test.ts`
  — cubre las 4 transiciones de estado y la prioridad OFFLINE > SINCRONIZANDO > CONFLICTO >
  AL_DIA (FR-009, data-model.md `EstadoSyncUI`); escribir primero, debe fallar (Principio I) —
  12 casos, verificado que fallaban por módulo inexistente antes de T004
- [X] T004 Definir `EstadoSyncUI` y `EntidadEnConflicto` (data-model.md) e implementar
  `derivarEstadoSync()` en `src/infrastructure/sync/derivarEstadoSync.ts` hasta que T003 pase
  (depende de T003). Incluye `porcentajeDe()`, que evita dividir por cero y topea en 100
- [X] T005 [P] Test unitario del store de progreso en `tests/unit/syncStatus.test.ts` —
  `iniciarPush`/`marcarEnviadas`/`pasarAPull`/`finalizarCiclo`/`suscribirProgreso`
  (research.md #4); escribir primero, debe fallar — 8 casos
- [X] T006 Implementar `src/infrastructure/sync/syncStatus.ts` hasta que T005 pase (depende de
  T005). **Refinamiento**: el store expone una `fase` explícita (`INACTIVO`/`PUSH`/`PULL`) —
  `progreso: null` a secas no distinguía "pull activo" de "sin ciclo corriendo"
  (data-model.md, sección refinada)
- [X] T007 Crear hook `useSyncStatus` en `src/hooks/useSyncStatus.ts`: combina
  `navigator.onLine` + listeners `online`/`offline`, `useLiveQuery` sobre
  `db.outboxOperations` (conteo de `PENDIENTE`/`ENVIANDO` y de `CONFLICTO`),
  `useSyncExternalStore` sobre T006, `db.metaSync.get(CLAVE_ULTIMA_SINCRONIZACION_GENERAL)`, y
  `derivarEstadoSync()` de T004 (depende de T004, T006)
- [X] T008 Crear `SyncStatusPill.tsx` + `SyncStatusPill.module.css` en `src/components/ui/`:
  punto de estado + texto corto + panel desplegable al click, usando `useSyncStatus()` (T007),
  tokens de color de research.md #1, colapso a solo-ícono bajo 639px (research.md #8)
  (depende de T007). **Corrección de tokens**: se usa `--color-info`/`--color-info-bg` para
  "sincronizando", no `--color-primary` — los tokens de estado son independientes del tema
  (§3.3) y `--color-primary` sigue el tema activo, lo que dejaría 1 de los 4 estados cambiando
  de color y 3 no (research.md #1, alternativa descartada)
- [X] T009 [P] Montar `<SyncStatusPill />` en `src/components/ui/TopAppBar.tsx`, dentro de
  `.right`, antes del botón de Configuración — mismo lugar validado con el usuario (depende de
  T008)
- [X] T010 [P] Montar `<SyncStatusPill />` de respaldo en `src/app/(shell)/layout.tsx`,
  posición fija esquina superior derecha, solo cuando la ruta actual no tiene `TopAppBar`
  (depende de T008). **Criterio invertido respecto al plan**: se enumeran las rutas que **sí**
  tienen `TopAppBar` y el pill fijo se monta en todo el resto. Con la lista original (rutas sin
  barra), una pantalla nueva quedaría sin indicador — incumplimiento silencioso de FR-010;
  invertida, el olvido produce dos indicadores visibles, un error que se nota al instante
  (research.md #7)

**Checkpoint**: el indicador ya se renderiza en las 10 pantallas del área autenticada,
reaccionando a online/offline con un estado por defecto — listo para que cada historia agregue
su comportamiento específico.

---

## Phase 3: User Story 1 - Saber si estoy trabajando sin conexión (Priority: P1) 🎯 MVP

**Goal**: el indicador muestra "Sin conexión" en cualquier pantalla al perder la conectividad,
y el detalle al hacer click muestra cuántos cambios están guardados localmente pendientes.

**Independent Test**: cortar la conexión (Playwright `context.setOffline(true)`, mismo patrón
que `tests/e2e/offline-sync.spec.ts`) estando en cualquier pantalla, y verificar que el
indicador cambia sin recargar; hacer click y verificar el conteo de pendientes.

### Tests for User Story 1

- [X] T011 [P] [US1] Test e2e en `tests/e2e/sync-status-pill.spec.ts`: al cortar la conexión
  (`context.setOffline(true)`) en una pantalla con `TopAppBar` (`/pacientes`) y en una sin
  él (`/pacientes/archivados`), el indicador pasa a "Sin conexión" sin recargar (FR-002,
  FR-003, FR-010); escribir primero, debe fallar. También verifica `toHaveCount(1)` en ambas —
  que no se monte un indicador duplicado

### Implementation for User Story 1

- [X] T012 [US1] Verificar/ajustar en `useSyncStatus.ts` (T007) que el estado por defecto
  online-sin-pendientes-sin-conflictos ya resuelve a `AL_DIA` ("Con conexión") — confirmado
  por T011. `getServerSnapshot` devuelve `online: true` a propósito: asumir offline en SSR
  produciría un parpadeo de "Sin conexión" falso en la primera pintura
- [X] T013 [US1] Implementar el contenido del panel para el estado `OFFLINE` en
  `SyncStatusPill.tsx` (T008): "Cambios guardados localmente: N" (FR-003) (depende de T008,
  T004)
- [X] T014 [US1] Ejecutar T011 contra la implementación y confirmar que pasa (build de
  producción, per quickstart.md) — **pasa**

**Hallazgo del entorno de pruebas (no es un bug del producto)**: bajo la emulación de red de
Chromium por CDP, `navigator.onLine` vuelve a `true` en el documento nuevo después de un
`page.goto()`, aunque el contexto siga offline (verificado empíricamente en este proyecto; ya
había una nota relacionada en `tests/e2e/offline-sync.spec.ts`). Un `dispatchEvent("offline")`
sintético no alcanza, porque el indicador relee `navigator.onLine`. El helper `cortarConexion`
reaplica la emulación (`setOffline(false)`→`setOffline(true)`) y espera a que la bandera baje.
En un navegador real la bandera sí persiste entre navegaciones.

**⚠️ Corrección de la lista de rutas de research.md #7**: la primera versión del test usaba
`/pacientes/archivados` como "pantalla sin TopAppBar", pero esa ruta es solo un `redirect()` a
`/pacientes?estado=ARCHIVADO` — que **sí** tiene `TopAppBar`. O sea, el test pasaba sin haber
ejercitado nunca la variante fija del pill, que es justo lo que FR-010 necesita cubrir. El test
ahora crea un paciente y abre su ficha (`/pacientes/<id>`), que es una de las tres pantallas
reales sin barra superior (las otras: `/citas/<id>` y `/pacientes/<id>/odontograma`).

**Checkpoint**: User Story 1 funciona de punta a punta, de forma independiente — MVP entregable.

---

## Phase 4: User Story 2 - Ver el progreso de envío de mis cambios pendientes (Priority: P2)

**Goal**: mientras hay cambios pendientes y conexión, el indicador muestra "Sincronizando NN%"
avanzando durante el push, "Sincronizando…" sin % durante el pull, y al terminar pasa a "Con
conexión" con la fecha de la última sincronización exitosa en el panel.

**Independent Test**: generar varios cambios offline, reconectar, y observar en pantalla que
el porcentaje avanza hasta completarse y que el panel de "Con conexión" muestra una fecha
reciente.

### Tests for User Story 2

- [X] T015 [P] [US2] Test e2e en `tests/e2e/sync-status-pill.spec.ts`: crear un cambio offline,
  reconectar, y verificar que el ciclo se completa y el indicador vuelve a "Con conexión"
  (FR-004, FR-005); escribir primero, debe fallar. **Alcance ajustado**: observar el
  porcentaje intermedio del push no es determinista con pocos cambios (el envío se completa en
  milisegundos), así que el cálculo del % se cubre en el unit test de `porcentajeDe()` y en
  `derivarEstadoSync`, y el e2e verifica el resultado observable del ciclo
- [X] T016 [P] [US2] Test e2e: al completar un ciclo de sync exitoso, el panel del estado "Con
  conexión" muestra una fecha de última sincronización reciente (FR-006); escribir primero,
  debe fallar

### Implementation for User Story 2

- [X] T017 [US2] Extender `ejecutarCicloDeSync()` en `src/infrastructure/sync/syncEngine.ts`:
  contar el total de pendientes al iniciar el push y llamar a `iniciarPush`/`marcarEnviadas`/
  `pasarAPull`/`finalizarCiclo` (T006) a medida que `sincronizarLote` vacía la cola
  (research.md #4) (depende de T006). `sincronizarLote` pasa a devolver cuántas operaciones
  resolvió (antes `Promise<void>`); su único otro llamador
  (`src/components/pacientes/subirArchivoPaciente.ts`) ignora el retorno, así que no cambia
- [X] T018 [US2] Escribir `CLAVE_ULTIMA_SINCRONIZACION_GENERAL` (T002) al final de
  `ejecutarCicloDeSync()` en `syncEngine.ts` (research.md #5 — simplificación aceptada: no
  rastrea éxito por sub-paso) (depende de T002). **Ajuste**: se rechequea `navigator.onLine`
  antes de escribir — si la conexión se corta a mitad del ciclo, los 7 pulls salen en seco por
  su propio guard y escribir el timestamp afirmaría una sincronización que no ocurrió
- [X] T019 [US2] Implementar el contenido del panel para el estado `SINCRONIZANDO` (con y sin
  `progreso`) y para el detalle de `AL_DIA` ("Última sincronización: hace N min/hs") en
  `SyncStatusPill.tsx` (depende de T008, T017, T018)
- [X] T020 [US2] Ejecutar T015 y T016 contra la implementación y confirmar que pasan — **pasan**

**Dos bugs preexistentes encontrados y corregidos en `syncEngine.ts`** (código que esta tarea
modifica, y cuyos síntomas serían visibles justamente a través del indicador nuevo):

1. **Bucle infinito en el push**: `while (hayPendientes) { await sincronizarLote(); ... }` —
   si el servidor rechazaba el lote, `revertirAPendiente` lo devolvía a `PENDIENTE` y el bucle
   reintentaba el mismo lote para siempre. El comentario de `sincronizarLote` ya afirmaba que
   "se reintenta en el próximo ciclo", pero el bucle no lo respetaba. Ahora corta cuando un
   lote no resuelve ninguna operación. Sin esto, el indicador quedaría clavado en el mismo
   porcentaje indefinidamente.
2. **Ciclos superpuestos**: el intervalo dispara cada 30s sin verificar si el ciclo anterior
   terminó; dos ciclos simultáneos se pelearían por el store de progreso. Se agregó un guard
   `cicloEnCurso` **con coalescing** (`cicloPendiente`): un disparo que llega durante un ciclo
   no se descarta, se atiende al terminar. La primera versión del guard simplemente descartaba
   el disparo, lo que retrasaba hasta 30s el envío de un cambio recién hecho — lo detectó el
   test e2e de US3, que falló hasta que se agregó el coalescing.

**Checkpoint**: User Stories 1 y 2 funcionan juntas e independientemente.

---

## Phase 5: User Story 3 - Enterarme si algún cambio quedó en conflicto (Priority: P3)

**Goal**: cuando no hay envíos en curso pero quedan operaciones en `CONFLICTO`/`RECHAZADO`, el
indicador muestra un estado de alerta que persiste entre pantallas, y el panel lista los
registros afectados.

**Independent Test**: forzar un conflicto (editar el mismo registro desde dos sesiones antes de
reconectar una) y verificar que el indicador cambia a alerta y el panel lista el registro.

### Tests for User Story 3

- [X] T021 [P] [US3] Test e2e en `tests/e2e/sync-status-pill.spec.ts`: forzar un conflicto
  (dos contextos de navegador editando el mismo paciente, patrón ya usado en
  `consultorio-sync.spec.ts`) y verificar que, una vez terminado el ciclo de sync, el
  indicador muestra el estado de alerta y persiste al navegar a otra pantalla (FR-007);
  escribir primero, debe fallar

### Implementation for User Story 3

- [X] T022 [US3] Resolver la `etiqueta` legible de cada `EntidadEnConflicto` a partir de
  `OutboxOperation.payload` (data-model.md — `nombreCompleto` para Paciente, `nombre` para
  Consultorio e Insumo, `entidadId` como respaldo para el resto y para payloads con forma
  inesperada) en `src/infrastructure/sync/derivarEstadoSync.ts` (depende de T004)
- [X] T023 [US3] Implementar el contenido del panel para el estado `CONFLICTO` en
  `SyncStatusPill.tsx`: lista "Registro — tipo de operación" por cada entidad afectada (FR-008)
  (depende de T008, T022)
- [X] T024 [US3] Ejecutar T021 contra la implementación y confirmar que pasa — **pasa** (fue
  el test que destapó el bug de coalescing descrito en la Fase 4)

**Checkpoint**: las 3 historias de usuario funcionan de forma independiente y en conjunto.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T025 [P] Verificar accesibilidad del panel desplegable (foco visible, `aria-expanded` en
  el botón del pill, contraste de los 4 estados) contra `docs/design-system.md` §4.1.
  **Corregido**: el panel se anuncia como `role="dialog"` pero no recibía el foco al abrirse —
  su contenido quedaba fuera del alcance del teclado y del lector de pantalla. Ahora enfoca al
  abrir (`tabIndex={-1}`) y devuelve el foco al pill al cerrar con Escape (no al cerrar con
  click fuera: ahí se lo robaría a lo que el usuario acaba de tocar). `aria-expanded` /
  `aria-controls` ya estaban; los contrastes salen de pares de tokens ya validados en §3.3
- [X] T026 [P] Verificar responsive: el colapso a solo-punto bajo 639px (research.md #8) en
  phone/tablet/desktop, mismo criterio que `TopAppBar.module.css`. **Violación encontrada y
  corregida**: el pill medía 32px de alto (32×32 colapsado en mobile), pero §4.1 exige un área
  táctil mínima de **44×44px en los tres rangos**, explícitamente sin achicarse en pantallas
  chicas (Principio VI, no negociable). Ahora mide 44px de alto —el mismo que el `Button`
  default que convive en esa barra— y 44×44 colapsado. Verificado midiendo el `boundingBox`
  real en escritorio (128×44) y mobile (44×44), no solo leyendo el CSS
- [X] T027 Ejecutar los 3 escenarios de `quickstart.md` de punta a punta contra un build de
  producción — cubiertos por `tests/e2e/sync-status-pill.spec.ts` (3 tests, uno por escenario),
  ejecutados 3 veces seguidas contra `npm run build && npm run start` sin flakiness. Además se
  verificó visualmente con capturas la ficha de paciente (pantalla sin `TopAppBar`) en
  escritorio y mobile: el pill fijo no se solapa con el contenido de la página
- [X] T028 `npm run lint` y `npx tsc --noEmit` limpios sobre el estado final del branch —
  `tsc --noEmit`: **limpio**. `npx eslint src tests`: **limpio** (0 problemas). `npm run lint`
  completo: 88 problemas, **idénticos a la línea base de T001** (1 error + 87 warnings, todos
  en archivos generados: `next-env.d.ts`, `public/sw.js`, `public/workbox-*.js`,
  `public/swe-worker-*.js`) — sin regresión introducida por esta feature

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias — puede empezar de inmediato
- **Foundational (Phase 2)**: depende de Setup — bloquea las 3 historias de usuario
- **User Stories (Phase 3-5)**: todas dependen de Foundational; US1 es el MVP, US2 y US3 se
  pueden implementar en cualquier orden después de US1 (comparten el mismo componente, pero no
  dependen del contenido que agrega la otra)
- **Polish (Phase 6)**: depende de que las historias que se vayan a entregar estén completas

### Within Each User Story

- Tests (T011, T015-T016, T021) se escriben y deben fallar antes de la implementación
  correspondiente (Principio I)
- El detalle del panel de cada estado se implementa después de que la lógica que lo alimenta
  (`derivarEstadoSync`, `syncEngine`) esté lista

### Parallel Opportunities

- T002, T003, T005 (Foundational, archivos distintos) en paralelo
- T009, T010 (dos puntos de montaje, archivos distintos) en paralelo una vez T008 está listo
- T011 (US1), T015-T016 (US2), T021 (US3) se pueden escribir en paralelo si se trabaja en
  varias historias a la vez — aunque comparten `sync-status-pill.spec.ts`, son bloques de test
  independientes dentro del mismo archivo
- T025, T026 (Polish) en paralelo

---

## Parallel Example: Foundational

```bash
Task: "Test unitario de derivarEstadoSync() en tests/unit/derivarEstadoSync.test.ts"
Task: "Test unitario del store de progreso en tests/unit/syncStatus.test.ts"
Task: "Agregar constante CLAVE_ULTIMA_SINCRONIZACION_GENERAL a src/infrastructure/db/dexie/db.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar Phase 1: Setup
2. Completar Phase 2: Foundational (bloquea todo lo demás)
3. Completar Phase 3: User Story 1
4. **Parar y validar**: probar US1 de forma independiente (offline/online en cualquier
   pantalla)
5. Entregable: el odontólogo ya sabe, en cualquier pantalla, si está trabajando sin conexión

### Incremental Delivery

1. Setup + Foundational → base lista
2. US1 → validar → entregar (MVP)
3. US2 → validar → entregar (progreso de sincronización)
4. US3 → validar → entregar (alerta de conflictos)

---

## Notes

- [P] = archivos distintos, sin dependencias pendientes
- [Story] mapea la tarea a su historia de usuario para trazabilidad
- Verificar que los tests fallan antes de implementar (Principio I)
- Detenerse en cada checkpoint para validar la historia de forma independiente

---

## Resumen de la implementación

**Estado**: 32/32 tareas completadas (28 del plan + 4 de la corrección posterior, Fase 7).

### Archivos nuevos

| Archivo | Qué es |
|---|---|
| `src/infrastructure/sync/syncStatus.ts` | Store en memoria del progreso del ciclo (fase PUSH/PULL/INACTIVO) |
| `src/infrastructure/sync/derivarEstadoSync.ts` | Función pura: prioridad entre los 4 estados + `porcentajeDe()` |
| `src/hooks/useSyncStatus.ts` | Junta conectividad, outbox (`useLiveQuery`), progreso y watermark |
| `src/components/ui/SyncStatusPill.tsx` / `.module.css` | El pill y su panel desplegable |
| `tests/unit/derivarEstadoSync.test.ts` | 26 casos: estados, prioridades, agrupación de conflictos e identificación por paciente |
| `tests/unit/syncStatus.test.ts` | 8 casos: fases y suscripción |
| `tests/e2e/sync-status-pill.spec.ts` | 3 tests: un escenario de quickstart.md cada uno |

### Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/infrastructure/db/dexie/db.ts` | + `CLAVE_ULTIMA_SINCRONIZACION_GENERAL` (sin bump de esquema) |
| `src/infrastructure/sync/outboxQueue.ts` | + `contarOperacionesPendientes()` |
| `src/infrastructure/sync/syncEngine.ts` | Progreso, watermark, listener `offline`, y 2 bugs preexistentes corregidos |
| `src/components/ui/TopAppBar.tsx` | Monta el pill antes del engranaje |
| `src/app/(shell)/layout.tsx` | Monta el pill fijo en rutas sin `TopAppBar` |

### Desvíos del plan original, todos documentados arriba

1. `--color-info` en vez de `--color-primary` para "sincronizando" (T008)
2. Fase explícita en el store; `progreso: null` era ambiguo (T006)
3. Lista de rutas invertida: se enumeran las que **sí** tienen `TopAppBar` (T010)
4. `/pacientes/archivados` no era una pantalla sin barra, es un redirect (US1)
5. Alto de 44px por el mínimo táctil de §4.1, no 32px (T026)
6. Foco al panel al abrirse (T025)
7. Dos bugs preexistentes de `syncEngine.ts` corregidos (Fase 4)
8. Conflictos agrupados por registro y identificados por paciente (T029, abajo)

---

## Fase 7: Corrección posterior a la entrega — panel de conflictos

Reportado por el usuario al usar la app: `Encountered two children with the same key,
ODONTOGRAMA-<uuid>` (dos veces, con dos odontogramas distintos).

**Causa**: el panel emitía una fila por *operación* en conflicto, con
`key={entidad-entidadId}`. Un mismo registro puede acumular varias operaciones fallidas
(`CREAR` + `EDITAR` del mismo odontograma), así que la clave se repetía y React abortaba el
render del panel. Los tests no lo detectaron porque ninguno cubría dos operaciones en
conflicto sobre el mismo registro — un hueco real de cobertura, no mala suerte.

- [X] T029 Agrupar los conflictos por `entidad|entidadId` en
  `src/infrastructure/sync/derivarEstadoSync.ts` — la clave vuelve a ser única por
  construcción y el panel deja de repetir el mismo registro. `tipo` pasa a `tipos[]` (todas
  las operaciones fallidas de ese registro, sin repetir): ninguna se descarta (Principio III)
- [X] T030 Identificar los registros sin nombre propio por su paciente (decisión consultada
  con el usuario): `Odontograma — Ana González`. `useSyncStatus` resuelve los nombres con un
  `bulkGet` sobre `db.pacientes` acotado a los ids que aparecen en la lista de conflictos;
  `derivarEstadoSync` los recibe ya resueltos y sigue siendo una función pura (Principio II).
  `CAMBIO_ODONTOGRAMA` queda sin identificar: su payload referencia `odontogramaId`, no el
  paciente
- [X] T031 Nunca mostrar el `entidadId` como etiqueta — un uuid crudo no le dice nada al
  odontólogo. Sin nombre propio ni paciente resoluble, se muestra solo el tipo de registro
- [X] T032 Cubrir el hueco de tests: 14 casos nuevos en `tests/unit/derivarEstadoSync.test.ts`
  (agrupación, unicidad de la clave de React, resolución por paciente, payloads con forma
  inesperada). Verificado además en navegador real inyectando conflictos en el outbox:
  4 operaciones → 3 filas, cero errores de clave duplicada en consola

### Verificación

- `npx tsc --noEmit`: limpio
- `npx eslint src tests`: limpio
- `npm run lint`: 88 problemas, idénticos a la línea base (solo archivos generados)
- Vitest: 328/328 (51 archivos)
- Playwright, spec nuevo: 3/3, corridas repetidas sin flakiness
- Playwright, suite completa: sin regresiones
- Verificación visual con capturas: pill en barra, panel de conflictos, ficha de paciente
  (pantalla sin `TopAppBar`) en escritorio y mobile, y medición real del área táctil
