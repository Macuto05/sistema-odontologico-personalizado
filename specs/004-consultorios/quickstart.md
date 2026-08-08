# Quickstart: Consultorios (clasificación de pacientes por sede)

Guía de validación manual/e2e de que la feature funciona de punta a punta, incluida la
sincronización entre dispositivos que motivó la extensión del motor de sync (research.md
#1). No repite los contratos (`contracts/`) ni el modelo de datos (`data-model.md`) — los
referencia.

## Prerrequisitos

- Los mismos de `001-gestion-pacientes`/`002-pantalla-inicio` (Node.js 20+, PostgreSQL,
  `.env`, dependencias instaladas, cuenta de odontólogo sembrada).
- Migración de Prisma aplicada con el modelo `Consultorio` y la columna
  `Paciente.consultorioId` (ver `data-model.md`).

## Puesta en marcha

```bash
npx prisma migrate dev
npx prisma generate
npm run dev
```

Iniciar sesión con la cuenta única del odontólogo.

## Escenario 1 — Administrar la lista de consultorios (US1, FR-001 a FR-004)

1. En Configuración, agregar un consultorio con un nombre válido (ej. "Sede Norte") → debe
   aparecer de inmediato en la lista.
2. Intentar agregar otro consultorio con el mismo nombre, en minúsculas (ej.
   "sede norte") → debe rechazarse, indicando que ya existe.
3. Eliminar un consultorio existente → debe desaparecer de la lista.

**Resultado esperado**: SC-001 (disponible para asignar de inmediato, sin recargar).

## Escenario 2 — Asignar un consultorio a un paciente (US2, FR-006 a FR-009)

1. Con al menos un consultorio creado, dar de alta un paciente seleccionándole ese
   consultorio → la ficha debe guardarse con la asignación.
2. Editar ese paciente y cambiarle el consultorio a otro existente, o quitárselo (dejarlo
   sin ninguno) → el cambio debe persistir.
3. (Con una cuenta sin consultorios creados) Dar de alta o editar un paciente sin tocar el
   selector de consultorio → debe guardarse igual, sin exigir ninguno.

## Escenario 3 — Ver el consultorio en el listado, y qué pasa si se elimina (US3, FR-005, FR-010)

1. Con pacientes que tienen distintos consultorios asignados (y alguno sin ninguno), abrir
   el listado de pacientes → cada fila debe mostrar el nombre del consultorio
   correspondiente, o una indicación explícita de "sin consultorio" para el que no tiene.
2. Eliminar, desde Configuración, un consultorio que tiene pacientes asignados → volver al
   listado y verificar que esos pacientes ahora muestran "sin consultorio", sin que
   ningún otro dato de su ficha se haya modificado (FR-005, SC-002).

## Escenario 4 — Funcionamiento sin conexión y sincronización entre dispositivos (FR-011 a FR-013)

Este es el escenario que valida la extensión del motor de sync (research.md #1, #5, #6).

1. Con la app cargada, desconectar la red (DevTools → Network → Offline, o modo avión).
2. Crear un consultorio nuevo y asignárselo a un paciente — **todo sin conexión**. Ambas
   acciones deben reflejarse de inmediato en la UI (research.md #1: misma cola de outbox
   que `Paciente`).
3. Reconectar la red y verificar (ej. con `npx prisma studio` o una consulta directa) que
   el consultorio y la asignación llegaron a PostgreSQL.
4. Abrir la app en un **segundo navegador/perfil** con la misma cuenta, sin haber creado
   ese consultorio ahí → tras sincronizar, el consultorio nuevo debe aparecer disponible
   para asignar (SC-005).
5. Desde ese segundo dispositivo, eliminar el consultorio recién sincronizado. Reconectar
   el primer dispositivo (si estaba offline) → el paciente que tenía ese consultorio
   asignado en el primer dispositivo debe quedar mostrando "sin consultorio" tras
   sincronizar (research.md #6).
6. (Opcional, conflicto) En dos dispositivos offline, crear un consultorio con el mismo
   nombre en ambos y reconectar ambos — solo uno debe prevalecer; el otro debe quedar
   marcado como no sincronizado (`NOMBRE_DUPLICADO`) en vez de duplicar la lista o
   perderse en silencio (research.md #3).

**Resultado esperado**: ninguna operación de Consultorio requiere conexión para
completarse desde la perspectiva de la odontóloga; ningún dato de paciente se corrompe al
eliminar un consultorio, con o sin conflicto de nombre.

## Tests automatizados equivalentes

- `tests/unit/`: casos de uso y repositorios de `Consultorio` (crear, listar, eliminar,
  unicidad de nombre), y la generalización de `outboxQueue`/`syncEngine`.
- `tests/integration/`: `GET /api/consultorios` y `POST /api/sync` con lotes mixtos
  (`Paciente` + `Consultorio`), incluido `NOMBRE_DUPLICADO`.
- `tests/e2e/`: los 4 escenarios anteriores con Playwright, incluyendo el Escenario 4 con
  dos contextos de navegador distintos para simular dos dispositivos.
