# Quickstart: Gestión de Pacientes

Guía de validación manual/e2e de que la feature funciona de punta a punta, incluido el
escenario offline→sync que motivó la arquitectura (ver `research.md` #2 y #4). No repite
los contratos (`contracts/`) ni el modelo de datos (`data-model.md`) — los referencia.

## Prerrequisitos

- Node.js 20+, PostgreSQL corriendo localmente (o accesible), variables de entorno
  `DATABASE_URL` y las de Auth.js configuradas (`.env`).
- Dependencias instaladas (`npm install`), Prisma Client generado y migraciones aplicadas.
- Una cuenta de odontólogo ya sembrada (seed) para poder iniciar sesión.

## Puesta en marcha

```bash
npx prisma migrate dev
npx prisma generate
npm run dev
```

Abrir la app, iniciar sesión con la cuenta única del odontólogo.

## Escenario 1 — Alta y detección de duplicado (US1, FR-001 a FR-004)

1. Crear un paciente con nombre, documento y fecha de nacimiento válidos → debe aparecer
   como activo en el listado.
2. Intentar crear otro paciente con el **mismo** documento → la UI debe mostrar el aviso de
   duplicado (ver `contracts/patients-api.md`, respuesta `409 DOCUMENTO_DUPLICADO`),
   indicando de qué paciente se trata, y no debe crearse un segundo registro.
3. Intentar guardar sin nombre, documento o fecha de nacimiento → la UI debe señalar los
   campos faltantes y no permitir guardar (FR-002, respuesta `422`).

**Resultado esperado**: SC-001 (alta en menos de 1 minuto), SC-002 (100% de duplicados
detectados antes de guardar).

## Escenario 2 — Búsqueda (US2, FR-005)

1. Con varios pacientes cargados, buscar por una parte del nombre en minúsculas aunque el
   nombre real tenga mayúsculas → deben aparecer todas las coincidencias parciales.
2. Buscar por el número de documento exacto de un paciente → debe aparecer únicamente ese
   paciente.
3. Buscar un texto que no coincide con nada → la UI debe mostrar "sin resultados", no una
   lista vacía sin explicación.

**Resultado esperado**: SC-003.

## Escenario 3 — Edición y conflicto de documento (US3, FR-007, FR-008)

1. Editar el teléfono/email/dirección de un paciente activo → los nuevos valores deben
   persistir y reflejarse en una búsqueda posterior.
2. Intentar cambiar el documento de un paciente a uno que ya usa otro paciente (activo o
   archivado) → debe rechazarse (mismo `409 DOCUMENTO_DUPLICADO`), sin modificar la ficha.
3. Archivar un paciente y luego intentar editarlo directamente → la UI debe exigir
   reactivarlo primero (FR-008), no permitir el guardado.

## Escenario 4 — Archivado y reactivación (US4, FR-009 a FR-011)

1. Archivar un paciente activo → debe desaparecer del listado/búsqueda por defecto.
2. Abrir la vista explícita de archivados → el paciente debe aparecer ahí con todos sus
   datos originales intactos (SC-004).
3. Reactivarlo → debe volver a aparecer en el listado/búsqueda por defecto.
4. Intentar archivar un paciente ya archivado → no debe producir error, solo informar que
   ya estaba archivado.

**Resultado esperado**: SC-004, SC-005 (activo vs. archivado siempre distinguible, ver
badge en `docs/design-system.md` §6.6).

## Escenario 5 — Funcionamiento sin internet y sincronización por lotes

Este es el escenario que valida la decisión central de arquitectura (research.md #2, #4).

1. Con la app ya cargada, desconectar la red del dispositivo (modo avión, o desconectar
   DevTools → Network → Offline en el navegador).
2. Crear un paciente nuevo, editar otro existente, y archivar un tercero — **todo sin
   conexión**. Cada acción debe reflejarse de inmediato en la UI (lee/escribe contra Dexie
   local, no espera red).
3. Reconectar la red.
4. Verificar que el motor de sync envía las operaciones pendientes en lotes (ver
   `contracts/sync-api.md`) y que, tras sincronizar, los tres cambios existen en
   PostgreSQL (verificable con `npx prisma studio` o una consulta directa).
5. (Opcional, conflicto) Repetir el paso 2 en **dos pestañas/dispositivos distintos**,
   ambos offline, editando el **mismo** paciente con valores distintos, y reconectar ambos
   — ninguna edición debe perderse silenciosamente; el paciente debe quedar marcado con
   `conflictoPendiente` para revisión manual.

**Resultado esperado**: ninguna operación requiere conexión para completarse desde la
perspectiva del usuario; ningún dato se pierde al sincronizar, con o sin conflicto.

## Tests automatizados equivalentes

- `tests/unit/`: casos de uso de dominio (validaciones, unicidad, transiciones de estado).
- `tests/integration/`: rutas de `contracts/patients-api.md` y `contracts/sync-api.md`
  contra una base de datos de prueba.
- `tests/e2e/`: los 5 escenarios anteriores con Playwright, incluyendo emulación de
  offline/online para el Escenario 5.
