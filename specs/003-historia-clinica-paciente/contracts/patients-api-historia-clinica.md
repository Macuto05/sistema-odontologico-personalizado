# Contrato: Historia Clínica en la API de Pacientes (addendum)

Extiende `specs/001-gestion-pacientes/contracts/patients-api.md` — no agrega endpoints
nuevos (research.md #7). Todo lo no mencionado acá (auth, paginación, errores de
duplicado/archivado/conflicto de versión) sigue igual que en ese contrato.

## `POST /api/patients` — body extendido

Se agregan 4 campos opcionales al body ya documentado en `patients-api.md`:

```json
{
  "...": "...campos de 001 sin cambios...",
  "antecedentesPatologicos": ["DIABETES", "HIPERTENSION_HIPOTENSION"],
  "antecedentesPatologicosOtros": "string | null",
  "antecedentesHeredofamiliares": "string | null",
  "medicamentosActuales": "string | null",
  "alergias": "string | null"
}
```

- `antecedentesPatologicos`: arreglo, puede ser `[]` u omitirse (default `[]`). Valores
  válidos: ver `data-model.md` §Enum `AntecedentePatologico`.
- `antecedentesPatologicosOtros`: si se omite o llega vacío tras `trim()`, se guarda como
  `null` (FR-004).

**201**: el paciente creado incluye estos 4 campos con sus valores (o defaults).

**422**: `antecedentesPatologicos` contiene un valor fuera del enum — validado con Zod,
mismo mecanismo que el resto de los campos de 001.

## `PUT /api/patients/:id` — body extendido

Mismos 4 campos que `POST`, más `baseVersion` (sin cambios respecto a 001). Reemplazan por
completo el valor anterior de cada campo (no hay merge parcial) — consistente con que la
historia clínica es un estado actual editable en el lugar (research.md #1, `spec.md`
§Assumptions).

**200**: paciente actualizado con los nuevos valores de historia clínica.

**409** (paciente archivado): mismo comportamiento que 001 — la historia clínica no tiene
una excepción propia a esta regla (FR-013).
