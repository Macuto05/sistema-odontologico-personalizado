# Data Model: Historia Clínica del Paciente

Extiende la entidad `Paciente` ya definida en
`specs/001-gestion-pacientes/data-model.md` — no introduce una entidad ni tabla nueva (ver
`research.md` #1). Los campos siguientes se agregan a `src/domain/entities/Paciente.ts` y al
modelo `Paciente` de `prisma/schema.prisma`.

## Campos nuevos de `Paciente`

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `antecedentesPatologicos` | `AntecedentePatologico[]` | sí (puede ser `[]`) | Default `[]`. Subconjunto del catálogo fijo de FR-002 — ver enum abajo. Sin límite de cantidad ni exclusiones entre valores (FR-005). |
| `antecedentesPatologicosOtros` | string \| null | no | Solo tiene sentido si el odontólogo marcó "Otros" en la UI; es la única fuente de verdad de ese estado (research.md #3) — no existe un booleano `otrosMarcado` separado. `null`/ausente si "Otros" no está marcado o si se marcó sin texto. |
| `antecedentesHeredofamiliares` | string \| null | no | Texto libre (FR-006). |
| `medicamentosActuales` | string \| null | no | Texto libre (FR-007). |
| `alergias` | string \| null | no | Texto libre (FR-008). |

### Enum `AntecedentePatologico` (FR-002 — catálogo fijo, 21 valores)

```
DIABETES
HEPATITIS
ARTRITIS
ASMA_EPOC
ANEMIA
INFARTO
ENFERMEDADES_PULMONARES
HIPERTIROIDISMO
HIPOTIROIDISMO
CONVULSIONES_DESMAYOS
HIPERTENSION_HIPOTENSION
SINUSITIS
ANGINA_PECHO
FIEBRE_REUMATICA
GASTRITIS
ULCERA_GASTRICA
ENFERMEDADES_TRANSMISION_SEXUAL
ARTERIOSCLEROSIS
ALTERACIONES_METABOLICAS
ENFERMEDADES_ENDOCRINAS
OSTEOPOROSIS
```

"Otros" **no** es un valor de este enum — es un campo de texto aparte
(`antecedentesPatologicosOtros`), controlado en la UI por una casilla que solo determina si
el textarea se muestra (research.md #3).

### Validaciones (derivadas de los Functional Requirements)

- `antecedentesPatologicos` solo puede contener valores del enum `AntecedentePatologico`
  (validado con Zod en la capa de aplicación, Principio III) — FR-002.
- `antecedentesPatologicosOtros`, si se envía, se normaliza con `trim()`; una cadena vacía
  tras el `trim()` se guarda como `null`, nunca como `""` (FR-004, Edge Cases del spec).
- Ninguno de los 4 campos es obligatorio para crear o editar un paciente (FR-009).
- La historia clínica de un paciente `ARCHIVADO` no admite edición directa — misma regla
  que el resto de la ficha (FR-013, `puedeEditarse()` en `Paciente.ts`, sin cambios: ya
  cubre estos campos por ser parte de la misma entidad).

## Relaciones

- Ninguna nueva. `antecedentesPatologicos` y los tres campos de texto libre son atributos
  directos de `Paciente`, no relaciones hacia otra entidad (research.md #1, #2).

## Impacto en el modelo existente

- **Prisma** (`prisma/schema.prisma`): se agrega el enum `AntecedentePatologico` y las 4
  columnas al modelo `Paciente`. Migración aditiva, sin backfill (research.md #4).
- **Dexie** (`src/infrastructure/db/dexie/db.ts`): `this.version(3)` — no se agregan índices
  nuevos (estos campos no se buscan/filtran en esta feature, FR-005 de 001 sigue acotado a
  nombre/documento).
- **DTOs** (`src/application/dto/pacienteDto.ts`): `crearPacienteInputSchema` y
  `editarPacienteInputSchema` se extienden con los 4 campos nuevos, todos opcionales.
- **`DatosNuevoPaciente`, `DatosEdicionPaciente`**: se extienden con los mismos 4 campos
  opcionales; `crearPacienteDesdeDatos()` en `Paciente.ts` aplica los defaults (`[]` / `null`).
