# Quickstart: Atención de Paciente (Cita Clínica)

Guía de validación manual/e2e de que la feature funciona de punta a punta. No repite los
contratos (`contracts/`) ni el modelo de datos (`data-model.md`) — los referencia.

## Prerrequisitos

- Los mismos de `001-gestion-pacientes`/`003-historia-clinica-paciente`/`004-consultorios`
  (Node.js 20+, PostgreSQL, `.env`, dependencias instaladas, cuenta de odontólogo sembrada).
- Migración de Prisma aplicada con los modelos `Cita` y `ArchivoEstudio` (ver
  `data-model.md`).
- Al menos un paciente activo cargado (`001-gestion-pacientes`).

## Puesta en marcha

```bash
npx prisma migrate dev
npx prisma generate
npm run dev
```

Iniciar sesión con la cuenta única del odontólogo.

## Escenario 1 — Iniciar la atención de un paciente (US1, FR-001 a FR-004, FR-027)

> **Revisión posterior**: la Cita recién se crea al presionar "Finalizar atención"
> (Escenario 4) — "Nueva cita" solo abre un borrador en el navegador, sin crear ni guardar
> nada todavía (spec §Assumptions).

1. Abrir la ficha de un paciente activo → debe verse el botón "Nueva cita" / "Atender
   paciente".
2. Presionarlo → debe abrirse de inmediato el panel de Atención en modo borrador, vacío
   (sin ninguna pantalla de configuración intermedia — SC-001), sin crear ningún registro
   todavía.
3. Escribir algo en Diagnóstico y presionar "Volver a la ficha" → debe descartar el
   borrador y volver a la ficha sin haber creado nada; al presionar "Nueva cita" de nuevo,
   el panel debe abrir vacío (no hay nada que retomar).
4. Abrir la ficha de un paciente archivado → el botón no debe estar disponible.

## Escenario 2 — Diagnóstico, receta y estudios en el borrador (US2, US3, US4)

Con el panel de Atención abierto en modo borrador:

1. Completar motivo de consulta, diagnóstico, plan de tratamiento y elegir una categoría
   (ej. "Control") → el borrador debe reflejarlo de inmediato (no hay botón de guardado
   propio en esta pestaña — se guarda recién al finalizar, Escenario 4).
2. Agregar un ítem de receta (medicamento, dosis, frecuencia, duración) → debe aparecer en
   la lista; agregar un segundo y quitar el primero → la lista debe reflejar solo el
   segundo.
3. Agregar un estudio complementario (ej. "Radiografía panorámica") → debe aparecer en la
   lista de estudios solicitados.
4. Dejar todos estos campos vacíos y finalizar la atención de todos modos → no debe haber
   ningún error ni campo obligatorio bloqueando (User Story 2/3/4, escenario 3 de cada
   una).

**Resultado esperado**: SC-002 (diagnóstico + un ítem de receta + un estudio, en menos de 3
minutos, contando la finalización).

## Escenario 3 — Antecedentes durante la atención (US5)

> A diferencia del Escenario 2, Antecedentes se guarda de inmediato con su propio botón —
> es un dato del paciente, no del borrador de la Cita (FR-012).

1. En un paciente con historia clínica ya cargada (`003-historia-clinica-paciente`), abrir
   la sección de Antecedentes del panel de Atención → debe mostrar los mismos datos que la
   ficha del paciente.
2. Editar un antecedente (ej. agregar una alergia) desde ahí → guardar, salir del panel de
   Atención (por ejemplo con "Volver a la ficha", sin finalizar nada) y abrir la ficha del
   paciente directamente → el cambio debe verse reflejado ahí también (FR-011: es el mismo
   dato, no una copia), pese a que la atención en sí nunca se finalizó.
3. Volver al panel de Atención (un borrador nuevo), entrar a Antecedentes y luego volver a
   Diagnóstico → los datos que se hayan vuelto a cargar en el borrador del Escenario 2
   deben seguir intactos (SC-005).

## Escenario 4 — Finalizar la atención (US6)

> Revisión posterior: este es el único paso que crea y guarda la Cita — antes de
> presionarlo no existe ningún registro.

1. Con el panel de Atención en modo borrador con algo cargado (Escenario 2), presionar
   "Finalizar atención" y confirmar.
2. Verificar que se crea una Cita nueva con exactamente esos datos, ya en estado
   finalizado/solo lectura, y que el panel vuelve a la ficha del paciente.
3. Intentar editar cualquiera de esos campos desde afuera (ej. por API directa,
   operación de sync `EDITAR`) → debe rechazarse con `CITA_FINALIZADA`
   (`contracts/citas-api.md`, research.md #10).
4. Verificar que no existe ninguna acción de "reabrir" ni "editar" disponible en la UI para
   esa Cita, ni siquiera desde el Historial (SC-003).

## Escenario 5 — Historial de citas anteriores (US7)

1. Con al menos una Cita finalizada de un paciente (Escenario 4), iniciar una atención
   **nueva** para ese mismo paciente (Escenario 1) — un borrador vacío.
2. Desplegar el panel de Historial de citas anteriores → debe listar la cita finalizada
   (fecha, categoría, diagnóstico resumido), y el **borrador actual no debe aparecer** en
   esa lista, porque todavía no existe como registro (FR-022).
3. Abrir la cita listada → debe mostrarse completa en modo solo lectura (diagnóstico,
   receta, estudios).
4. Con un paciente que nunca tuvo una cita finalizada, desplegar el panel → debe indicar
   claramente que no hay citas anteriores, no una lista vacía sin explicación (FR-024).

**Resultado esperado**: SC-004 (revisar cualquier cita anterior sin salir del panel de
Atención).

## Escenario 6 — Adjuntar resultado a un estudio, incluida una cita ya finalizada (US8)

Este es el escenario que valida la única excepción online-only de esta feature
(research.md #5, `contracts/archivos-estudio-api.md`). Como la Cita no existe hasta
finalizar, adjuntar un archivo se hace siempre desde el detalle de solo lectura del
Historial de citas anteriores (Escenario 5), no desde el borrador de Estudios.

1. Con conexión activa, abrir desde el Historial una Cita finalizada que tiene un estudio
   solicitado (Escenario 2/4/5) y adjuntar un archivo de imagen (ej. `.jpg`) a ese estudio
   → debe guardarse y aparecer listado junto al estudio, sin necesidad de "reabrir" la
   Cita.
2. Adjuntar un segundo archivo (ej. un `.pdf`) al mismo estudio → ambos deben quedar
   asociados (no se reemplaza el primero).
3. Intentar adjuntar un archivo de un tipo no soportado (ej. `.docx`) → debe rechazarse
   indicando los formatos aceptados (FR-018).
4. Desconectar la red (DevTools → Network → Offline) e intentar adjuntar un archivo → debe
   informarse que la acción requiere conexión, sin perder ni corromper el resto de la Cita
   (FR-019).
5. Reconectar y volver a intentar el mismo archivo del paso 4 → debe completarse
   normalmente (SC-006).

## Tests automatizados equivalentes

- `tests/unit/`: entidad `Cita` (transiciones de estado, `puedeEditarse`), casos de uso
  (`crearOAbrirCita`, `editarCita`, `finalizarCita`, `agregarArchivoEstudio`), validación
  Zod de `recetaItems`/`estudioItems`, y la generalización de `outboxQueue` a `CITA`.
- `tests/integration/`: `GET /api/patients/:id/citas`, `GET /api/citas/:id`, `POST
  /api/sync` con operaciones `CITA` (incluido el rechazo `CITA_FINALIZADA` y la
  reconciliación de "una cita en curso" descrita en `contracts/citas-api.md`), y
  `POST`/`GET` de `contracts/archivos-estudio-api.md` (incluido el rechazo por tipo no
  soportado).
- `tests/e2e/`: los 6 escenarios anteriores con Playwright, incluido el Escenario 6 con la
  red deshabilitada/rehabilitada a mitad de flujo.
