# Quickstart: Historia Clínica del Paciente

Valida end-to-end los tres user stories del spec. Requiere la app corriendo (`npm run dev`)
y base de datos con la migración de esta feature aplicada (`npx prisma migrate dev`).

## Prerrequisitos

- Migración de Prisma aplicada (enum `AntecedentePatologico` + 4 columnas nuevas en
  `Paciente`, ver `data-model.md`).
- Sesión iniciada (Auth.js, cuenta única del odontólogo).
- Al menos un paciente ya existente **antes** de esta migración, para validar US2/SC-005
  (historia clínica vacía sin errores).

## Escenario 1 — Alta con historia clínica completa (US1)

1. Ir a `/pacientes/nuevo`.
2. Completar "Datos personales" e "Información de contacto" como en 001.
3. En la nueva sección "Historia clínica" (después de "Información de contacto"):
   - Marcar 2–3 antecedentes del checklist (ej. Diabetes, Hipertensión/Hipotensión).
   - Marcar "Otros" → verificar que aparece el campo de texto → escribir una descripción.
   - Completar antecedentes heredofamiliares, medicamentos actuales y alergias.
4. Guardar.

**Resultado esperado**: el paciente se crea (201); al abrir su ficha (`/pacientes/[id]`),
la sección de historia clínica muestra exactamente los antecedentes marcados, la
descripción de "Otros", y los tres campos de texto libre (US1-AC1..3, SC-002).

## Escenario 2 — Alta sin completar historia clínica (US1, edge case)

1. Ir a `/pacientes/nuevo`, completar solo los campos obligatorios de 001.
2. No tocar ningún campo de la sección "Historia clínica".
3. Guardar.

**Resultado esperado**: el alta se completa igual (US1-AC4); la ficha muestra la sección de
historia clínica vacía, sin ocultarla ni producir error (US2-AC3, FR-012).

## Escenario 3 — "Otros" marcado y luego desmarcado antes de guardar (edge case)

1. En el formulario de alta o edición, marcar "Otros" y escribir una descripción.
2. Desmarcar "Otros" (el campo de texto debe ocultarse).
3. Guardar.

**Resultado esperado**: la ficha resultante no muestra ningún antecedente "Otros" ni
conserva el texto escrito (FR-004). Si se vuelve a marcar "Otros" en una edición posterior,
el campo aparece vacío.

## Escenario 4 — Editar historia clínica de un paciente existente (US3)

1. Abrir la ficha de un paciente activo con historia clínica ya cargada (Escenario 1).
2. Ir a editar, desmarcar un antecedente y marcar otro distinto, cambiar el texto de
   "Alergias".
3. Guardar.

**Resultado esperado**: la ficha refleja el nuevo conjunto de antecedentes y el nuevo texto
de alergias, reemplazando por completo los valores anteriores (US3-AC1, AC3).

## Escenario 5 — Paciente creado antes de esta feature (US2, SC-005)

1. Abrir la ficha de un paciente creado antes de aplicar la migración de esta feature.

**Resultado esperado**: la sección de historia clínica se muestra vacía (sin antecedentes
marcados, campos de texto vacíos), sin error ni pantalla en blanco (US2-AC3, SC-005).

## Escenario 6 — Paciente archivado (FR-013)

1. Archivar un paciente activo con historia clínica cargada.
2. Intentar editar su historia clínica directamente desde la ficha.

**Resultado esperado**: el sistema exige reactivar al paciente primero, igual que para
cualquier otro campo de la ficha (consistente con `001-gestion-pacientes` FR-008).
