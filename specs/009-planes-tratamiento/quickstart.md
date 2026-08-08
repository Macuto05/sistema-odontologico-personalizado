# Quickstart: Planes de tratamiento

Guía de validación manual/e2e de que la feature funciona de punta a punta. No repite el
modelo de datos (`data-model.md`) — lo referencia.

## Prerrequisitos

- Los mismos de 006-odontograma (Node.js 20+, PostgreSQL, `.env`, dependencias instaladas,
  cuenta de odontólogo sembrada).
- Migración de Prisma aplicada con las columnas `fechaRealizado`/`nota` en
  `ItemPlanTratamiento` (ver `data-model.md` §Migración de datos).
- Al menos un paciente activo con el tab Odontograma accesible (001, 006).

## Puesta en marcha

```bash
npx prisma migrate dev
npx prisma generate
npm run dev
```

Iniciar sesión con la cuenta única del odontólogo.

## Escenario 1 — Consultar el registro consolidado (US1, FR-001 a FR-003)

1. Abrir la ficha de un paciente sin ningún plan de tratamiento cargado → pestaña "Planes"
   (ya no debe verse deshabilitada/"Próximamente") → debe indicar claramente que no hay
   planes registrados.
2. Ir al tab "Odontograma" de ese paciente → cargar una línea en "Plan de tratamiento"
   (fecha, diente, tratamiento) → **sin apretar "Guardar cambios" todavía**.
3. Volver a la pestaña "Planes" → la línea recién cargada NO debe aparecer (sigue en
   borrador, sin guardar — FR-003).
4. Volver a Odontograma → apretar "Guardar cambios".
5. Volver a la pestaña "Planes" → la línea debe aparecer ahora en "Todos los planes", con
   fecha de creación, diente y tratamiento coincidiendo con lo cargado.

**Resultado esperado**: SC-001 (todo el registro visible en una sola pestaña).

## Escenario 2 — Marcar un plan como realizado (US2, FR-004 a FR-007)

1. Sobre la línea del Escenario 1, tildar el checkbox "Realizado" → la columna "Fecha en que
   se realizó" debe completarse de inmediato con la fecha de hoy, sin ningún botón de guardar
   aparte.
2. Recargar la página → el checkbox debe seguir tildado y la fecha debe seguir presente
   (persistencia inmediata, no depende de "Guardar cambios").
3. Destildar el checkbox → la fecha de realización debe volver a quedar vacía, también de
   inmediato.

**Resultado esperado**: SC-002 (un solo clic, reflejado al instante).

## Escenario 3 — Consultar solo los planes realizados (US3, FR-009)

1. Cargar y guardar (desde Odontograma) una segunda línea de plan de tratamiento para el
   mismo paciente. Dejarla sin marcar.
2. Marcar como realizada solo la primera línea (Escenario 2).
3. En la pestaña Planes, abrir/mirar "Planes Realizados" → debe listar únicamente la primera
   línea, con su fecha de realización.
4. Destildar el checkbox de esa línea desde "Todos los planes" → debe desaparecer de "Planes
   Realizados" de inmediato.
5. Eliminar la segunda línea desde el tab Odontograma (y guardar cambios) → debe desaparecer
   también de "Todos los planes" en la pestaña Planes, sin ninguna acción manual ahí.

**Resultado esperado**: SC-003, SC-004 (distinguir pendientes/realizados sin revisar la lista
completa a mano), SC-005 (eliminar desde el origen se refleja solo, sin desincronización).

## Escenario 4 — Agregar una nota (US4, FR-008)

1. Sobre cualquier línea de la pestaña Planes, escribir un texto en el campo Nota y sacar el
   foco del campo (clic afuera o Tab).
2. Recargar la página → la nota debe seguir presente.
3. Editar la nota existente y volver a sacar el foco → el texto nuevo debe reemplazar al
   anterior.

**Resultado esperado**: SC-002 (guardado inmediato, sin botón aparte), consistente con el
checkbox del Escenario 2.

## Verificación de los límites de edición (FR-010, FR-011)

1. Confirmar que, en la pestaña Planes, no hay ningún control para cambiar fecha de
   creación, diente, tratamiento, ni para eliminar una línea — solo el checkbox y la nota.
2. Confirmar que el tab Odontograma y su tabla "Plan de tratamiento" se ven y funcionan
   exactamente igual que antes de esta feature (mismas columnas, mismo Editar/Eliminar).

## Paciente archivado (FR-012)

1. Archivar el paciente usado arriba.
2. Abrir su pestaña Planes → el checkbox y la nota deben verse pero no ser editables (mismo
   criterio de solo-lectura que el resto del sistema para pacientes archivados).
