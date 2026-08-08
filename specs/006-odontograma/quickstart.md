# Quickstart: Odontograma

Guía de validación manual/e2e de que la feature funciona de punta a punta. No repite los
contratos (`contracts/`) ni el modelo de datos (`data-model.md`) — los referencia.

## Prerrequisitos

- Los mismos de las specs anteriores (Node.js 20+, PostgreSQL, `.env`, dependencias
  instaladas, cuenta de odontólogo sembrada).
- Migración de Prisma aplicada con los modelos `Odontograma`, `CambioOdontograma`,
  `ItemPlanTratamiento`, y la eliminación de `Cita.planTratamiento` con su migración de datos
  (ver `data-model.md` §Modificación a `Cita`).
- Al menos un paciente activo cargado (`001-gestion-pacientes`).

## Puesta en marcha

```bash
npx prisma migrate dev
npx prisma generate
npm run dev
```

Iniciar sesión con la cuenta única del odontólogo.

## Escenario 1 — Registrar un hallazgo (US1, FR-001 a FR-007)

1. Abrir la ficha de un paciente activo → "Nueva cita" → tab "Odontograma" (ya no debe verse
   como placeholder deshabilitado).
2. Verificar que se ve el diagrama de boca completa (arcada superior e inferior) para la
   dentición seleccionada por defecto.
3. Hacer clic sobre un diente completo → debe abrirse un modal con el catálogo de 44
   condiciones organizado en 8 categorías colapsables.
4. Elegir "Ausente" → confirmar → el diente debe quedar marcado con una X azul de inmediato.
5. Hacer clic sobre una superficie específica de otro diente (ej. la cara oclusal) → elegir
   "Caries" → confirmar → solo esa superficie debe quedar marcada, sin afectar las otras 4.
6. Elegir una condición con variante (ej. "Exudado") → el modal debe pedir elegir
   Purulento/Hemorrágico antes de poder confirmar.
7. Elegir "Puente fijo" → el modal debe permitir seleccionar los dientes pilares → el símbolo
   debe dibujarse abarcando el tramo completo.
8. Al confirmar cualquier hallazgo, verificar que se puede agregar una nota de texto libre
   opcional.
9. Recargar la página → todos los hallazgos marcados deben seguir presentes (persistencia).

**Resultado esperado**: SC-001 (marcar un hallazgo en menos de 15 segundos), SC-002 (catálogo
completo sin scroll excesivo gracias a las categorías colapsables).

## Escenario 2 — Alternar entre dentición Adulto y Niño (US2, FR-002, FR-012)

1. Con hallazgos ya marcados en la vista Adulto (Escenario 1), cambiar a la pestaña "Niño" →
   debe verse el diagrama con numeración 51-85, vacío o con sus propios hallazgos, sin ningún
   dato de la vista Adulto.
2. Marcar un hallazgo distinto en la vista Niño → volver a Adulto → verificar que los
   hallazgos de Adulto siguen intactos.
3. En la vista Adulto, abrir el catálogo → verificar que "Pulpotomía" y "Pulpectomía" no
   aparecen disponibles.
4. En la vista Niño, abrir el catálogo → verificar que sí aparecen.

**Resultado esperado**: SC-005 (cambiar de vista nunca pierde ni mezcla datos).

## Escenario 3 — Corregir un hallazgo (US3, FR-008)

1. Hacer clic sobre un diente/superficie con un hallazgo ya marcado (Escenario 1) → debe
   verse el hallazgo existente con opción de editar o eliminar.
2. Editar un hallazgo con estado "por realizar" (rojo) y cambiarlo a "realizado" (azul) → debe
   actualizarse sin necesidad de eliminar y crear uno nuevo.
3. Eliminar un hallazgo → debe desaparecer del diagrama de inmediato.

## Escenario 4 — Historial de cambios (US4, FR-009, FR-010)

1. Con varios hallazgos agregados, editados y eliminados (Escenarios 1 y 3), abrir el panel de
   "Historial de cambios" → debe listar cada evento ordenado del más reciente al más antiguo,
   con diente, superficie (si aplica) y qué cambió.
2. Abrir el historial de un paciente sin ningún cambio todavía → debe indicar claramente que
   no hay cambios, no una lista vacía sin explicación.

**Resultado esperado**: SC-004 (ubicar cuándo se registró un hallazgo sin salir del tab).

## Escenario 5 — Plan de tratamiento (US5, FR-016, FR-017)

1. En el tab Odontograma, agregar una línea a la tabla de plan de tratamiento con fecha,
   diente y tratamiento ejecutado → debe guardarse y aparecer listada de inmediato.
2. Agregar una línea sin diente (tratamiento general) → debe permitirse.
3. Editar y luego eliminar una línea → ambas acciones deben reflejarse de inmediato.
4. Abrir la pestaña "Diagnóstico" de la Atención del mismo paciente → verificar que el campo
   de texto libre "Plan de tratamiento" ya no existe ahí.

**Resultado esperado**: SC-006 (cargar una línea en menos de 30 segundos).

## Escenario 6 — Leyenda de símbolos (US6, FR-011)

1. Desde el panel de herramientas del Odontograma, abrir la leyenda → debe listar las 8
   categorías, cada una desplegable, con sus condiciones, símbolo y color.

## Escenario 7 — Solo lectura para paciente archivado (FR-019)

1. Archivar un paciente con hallazgos ya marcados (`001-gestion-pacientes`) → abrir su tab
   Odontograma → debe verse en modo solo lectura, sin poder agregar, editar ni eliminar
   hallazgos ni líneas del plan de tratamiento.

## Escenario 8 — Funcionamiento 100% offline (FR-018)

1. Desconectar la red (DevTools → Network → Offline).
2. Repetir el Escenario 1 completo (marcar hallazgos, variantes, multi-diente, notas) → todo
   debe funcionar con normalidad, sin ningún mensaje de "requiere conexión" (a diferencia de
   los adjuntos de estudios en 005-atencion-paciente).
3. Reconectar → verificar que los cambios se sincronizan al servidor.

**Resultado esperado**: SC-007.

## Tests automatizados equivalentes

- `tests/unit/`: entidad `Odontograma`/`HallazgoDental` (validaciones de superficie, variante,
  multi-diente, exclusividad de dentición Niño), el catálogo estático `CondicionOdontograma`
  (44 entradas, 8 categorías), casos de uso (`obtenerOCrearOdontograma`, `registrarHallazgo`,
  `editarHallazgo`, `eliminarHallazgo`, `listarHistorialOdontograma`,
  `crearItemPlanTratamiento`, `editarItemPlanTratamiento`, `eliminarItemPlanTratamiento`).
- `tests/integration/`: `GET /api/patients/:id/odontogramas`, historial paginado, `POST
  /api/sync` con operaciones `ODONTOGRAMA`/`CAMBIO_ODONTOGRAMA`/`ITEM_PLAN_TRATAMIENTO`
  (incluido el rechazo de `EDITAR`/`ELIMINAR` sobre `CAMBIO_ODONTOGRAMA`), y la migración de
  `Cita.planTratamiento` hacia `ItemPlanTratamiento`.
- `tests/e2e/`: los 8 escenarios anteriores con Playwright, incluido el Escenario 8 con la red
  deshabilitada/rehabilitada a mitad de flujo.
