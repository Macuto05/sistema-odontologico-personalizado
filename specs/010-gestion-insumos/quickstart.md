# Quickstart: Gestión de Insumos

Guía de validación manual/e2e de que la feature funciona de punta a punta. No repite los
contratos (`contracts/`) ni el modelo de datos (`data-model.md`) — los referencia. Sigue el
mismo formato que `001-gestion-pacientes/quickstart.md`.

## Prerrequisitos

- Node.js 20+, PostgreSQL corriendo localmente (o accesible), variables de entorno
  configuradas (`.env`) — mismo entorno que Pacientes, sin setup adicional.
- Dependencias instaladas (`npm install`), Prisma Client regenerado y migración de
  `Insumo`/`OutboxOperation` aplicada.
- Una cuenta de odontólogo ya sembrada para poder iniciar sesión (misma cuenta que Pacientes).

## Puesta en marcha

```bash
npx prisma migrate dev
npx prisma generate
npm run dev
```

Abrir la app, iniciar sesión, ir a la pestaña "Insumos" del Sidebar.

## Escenario 1 — Alta de insumo (US1, FR-001 a FR-003)

1. Crear un insumo con nombre, categoría, stock actual y stock mínimo válidos → debe
   aparecer como activo en el listado.
2. Intentar guardar sin nombre, stock actual o stock mínimo → la UI debe señalar los campos
   faltantes y no permitir guardar (FR-002, respuesta `422`).
3. Intentar guardar con stock actual o stock mínimo negativo → la UI debe rechazar el valor
   (FR-003).

**Resultado esperado**: SC-001 (alta en menos de 1 minuto).

## Escenario 2 — Detección de insumos a reponer (US2, FR-004 a FR-006)

1. Crear (o editar) un insumo con `stockActual <= stockMinimo` → debe aparecer resaltado
   como "a reponer" en el listado.
2. Ir a la pantalla de Inicio → la tarjeta de resumen debe mostrar la cantidad correcta de
   insumos activos a reponer, incluyendo el creado en el paso 1.
3. Editar ese insumo subiendo `stockActual` por encima del mínimo → debe dejar de estar
   resaltado en el listado y el conteo de Inicio debe bajar en 1.
4. Archivar un insumo que está a reponer → debe desaparecer del resaltado y del conteo de
   Inicio (US2-AC4), aunque su stock siga por debajo del mínimo.

**Resultado esperado**: SC-002, SC-003.

## Escenario 3 — Búsqueda y filtro por categoría (US3, FR-008, FR-009)

1. Con varios insumos cargados en distintas categorías, buscar por una parte del nombre en
   minúsculas → deben aparecer todas las coincidencias parciales.
2. Filtrar por una categoría → deben aparecer únicamente los insumos activos de esa
   categoría.
3. Buscar/filtrar un valor que no coincide con nada → la UI debe mostrar "sin resultados".

**Resultado esperado**: SC-004.

## Escenario 4 — Edición y archivado (US4, US5, FR-011 a FR-015)

1. Editar el nombre o la categoría de un insumo activo → los nuevos valores deben persistir
   y reflejarse en el listado.
2. Archivar un insumo activo → debe desaparecer del listado/búsqueda/conteo por defecto.
3. Abrir la vista explícita de archivados → el insumo debe aparecer con todos sus datos
   originales intactos (SC-005).
4. Reactivarlo → debe volver a aparecer en el listado, búsqueda y conteo por defecto, y
   recalcularse si está "a reponer".
5. Intentar editar un insumo archivado directamente → la UI debe exigir reactivarlo primero
   (FR-012).
6. Intentar archivar un insumo ya archivado → no debe producir error, solo informar que ya
   estaba archivado.

## Escenario 5 — Funcionamiento sin internet y sincronización mixta

Valida que la extensión del outbox (research.md #2, `contracts/sync-api-delta.md`) no rompe
la sincronización existente de Pacientes ni la nueva de Insumos.

1. Con la app ya cargada, desconectar la red del dispositivo.
2. Crear un insumo nuevo, editar otro existente, y archivar un tercero — **todo sin
   conexión**. Cada acción debe reflejarse de inmediato en la UI.
3. En la misma sesión offline, crear también un paciente nuevo (para generar operaciones
   mixtas en el mismo outbox).
4. Reconectar la red.
5. Verificar que el motor de sync envía un lote que incluye operaciones de ambas entidades
   (`entidad: "INSUMO"` y `entidad: "PACIENTE"`) y que, tras sincronizar, todos los cambios
   existen en PostgreSQL (verificable con `npx prisma studio`).

**Resultado esperado**: ninguna operación requiere conexión para completarse desde la
perspectiva del usuario; ningún dato se pierde al sincronizar, incluso mezclando entidades en
el mismo lote.

## Tests automatizados equivalentes

- `tests/unit/`: casos de uso de dominio de `Insumo` (validaciones, cálculo de `aReponer`,
  transiciones de estado).
- `tests/integration/`: rutas de `contracts/insumos-api.md` y el delta de
  `contracts/sync-api-delta.md` contra una base de datos de prueba.
- `tests/e2e/`: los 5 escenarios anteriores con Playwright, incluyendo emulación de
  offline/online para el Escenario 5.
