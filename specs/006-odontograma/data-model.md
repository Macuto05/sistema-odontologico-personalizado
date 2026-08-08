# Data Model: Odontograma

## Odontograma

Entidad nueva (`src/domain/entities/Odontograma.ts`). Existe en PostgreSQL (servidor) e
IndexedDB (cliente, vía Dexie), local-first igual que `Paciente`/`Cita` (research.md #2).

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `id` | UUID (string) | sí | Generado en el cliente (research.md #10 — se crea de forma transparente, sin acción explícita del usuario). |
| `pacienteId` | UUID (string) | sí | Referencia a `Paciente.id`. |
| `denticion` | `"ADULTO"` \| `"NIÑO"` | sí | Determina qué numeración FDI y qué subconjunto del catálogo aplica (FR-002, FR-012). |
| `hallazgos` | `HallazgoDental[]` (JSON) | no (`[]` por defecto) | Estado bucal vigente — ver abajo (research.md #2). |
| `version` | int | sí (default 1) | Detección de conflicto de sync, mismo mecanismo que `Paciente.version`/`Cita.version`. |
| `conflictoPendiente` | JSON \| `null` | no | Mismo formato que en `Paciente`/`Cita`. |
| `createdAt` | datetime | sí | |
| `updatedAt` | datetime | sí | Watermark del pull incremental, igual que el resto de entidades local-first. |

Restricción única: `(pacienteId, denticion)` — como máximo un `Odontograma` por paciente y
dentición (research.md #2).

### HallazgoDental (objeto embebido, dentro de `Odontograma.hallazgos`)

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `id` | UUID (string) | sí | Generado en el cliente al agregar el hallazgo. |
| `condicionId` | string | sí | Referencia al catálogo estático (`CondicionOdontograma`, ver abajo) — no es una FK de base de datos. |
| `dientes` | string[] (números FDI) | sí (mínimo 1) | Más de un elemento solo para condiciones multi-diente (Puente fijo, Prótesis removible, Edentulismo, Fusión — FR-013). |
| `superficie` | `Superficie` \| `null` | no | `MESIAL` \| `DISTAL` \| `VESTIBULAR` \| `PALATINO_LINGUAL` \| `OCLUSAL_INCISAL` \| `null` (diente completo). Solo aplica si la condición referenciada admite superficie. |
| `variante` | string \| `null` | no | Ej. `"PURULENTO"`/`"HEMORRAGICO"` para Exudado (FR-014), `"DEFINITIVA"`/`"TEMPORAL"` para Corona (FR-015). `null` si la condición no tiene variantes. |
| `estadoColor` | `"PENDIENTE"` \| `"REALIZADO"` \| `null` | no | Solo para condiciones que admiten la convención rojo/azul (FR-005); `null` para hallazgos de color fijo (ej. Caries). |
| `nota` | string \| `null` | no | Texto libre opcional (FR-007). |
| `registradoEn` | datetime | sí | Fecha del hallazgo — no necesariamente igual a `updatedAt` del Odontograma si se editan otros hallazgos después. |

### Validaciones (derivadas de los Functional Requirements)

- `condicionId` debe existir en el catálogo estático y, si `denticion = "ADULTO"`, no puede
  ser `PULPOTOMIA` ni `PULPECTOMIA` (FR-012, exclusivas de `"NIÑO"`).
- `superficie` solo puede tener valor si la condición referenciada admite superficie
  (`aplicaA` incluye `"SUPERFICIE"` en el catálogo); condiciones de diente completo lo
  exigen `null`.
- `dientes.length > 1` solo permitido para las condiciones marcadas `multiDiente: true` en el
  catálogo (FR-013); el resto exige exactamente un diente.
- `variante` es obligatoria si la condición referenciada declara `variantes` en el catálogo
  (Exudado, Corona) y debe ser uno de los valores declarados; `null`/omitida en cualquier otro
  caso.
- Dos o más `HallazgoDental` pueden coexistir sobre el mismo diente/superficie sin
  restricción — no hay deduplicación ni reemplazo automático (FR-020).

## CambioOdontograma

Entidad nueva, tabla propia (research.md #3, #4) — registro de auditoría append-only.

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `id` | UUID (string) | sí | |
| `odontogramaId` | UUID (string) | sí | Referencia a `Odontograma.id`. |
| `pacienteId` | UUID (string) | sí | Desnormalizado desde `Odontograma` para poder listar/indexar sin join (Principio VIII). |
| `denticion` | `"ADULTO"` \| `"NIÑO"` | sí | Desnormalizado, mismo motivo. |
| `tipoCambio` | `"AGREGADO"` \| `"EDITADO"` \| `"ELIMINADO"` | sí | FR-009, FR-010. |
| `hallazgoId` | UUID (string) | sí | El `id` del `HallazgoDental` afectado (puede ya no existir en `hallazgos` si `tipoCambio = "ELIMINADO"`). |
| `dientes` | string[] | sí | Copia del `dientes` del hallazgo en el momento del cambio. |
| `superficie` | `Superficie` \| `null` | no | Copia del `superficie` del hallazgo en el momento del cambio. |
| `descripcion` | string | sí | Texto legible generado al registrar el cambio (ej. "Caries agregada en superficie oclusal del diente 16"). |
| `registradoEn` | datetime | sí | |

Sin `version` ni `conflictoPendiente` — nunca se edita (research.md #4). Índice compuesto
`[odontogramaId+registradoEn]` para listar el historial de una dentición ordenado sin traer
las demás.

## ItemPlanTratamiento

Entidad nueva, tabla propia, independiente de `Odontograma` (research.md #5).

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `id` | UUID (string) | sí | |
| `pacienteId` | UUID (string) | sí | Referencia directa a `Paciente.id` — no a un `Odontograma` (research.md #5). |
| `fecha` | date | sí | |
| `diente` | string \| `null` | no | Número FDI en texto libre; `null` si el tratamiento no corresponde a una pieza específica (spec Edge Cases). |
| `tratamiento` | string | sí | Descripción del tratamiento ejecutado. |
| `version` | int | sí (default 1) | Mismo mecanismo de conflicto que el resto de entidades editables. |
| `conflictoPendiente` | JSON \| `null` | no | |
| `createdAt` | datetime | sí | |
| `updatedAt` | datetime | sí | |

### Validaciones

- `tratamiento` no puede estar vacío al guardar una línea.
- `fecha` es obligatoria; no se restringe a fechas pasadas (el odontólogo puede cargar un
  tratamiento planificado a futuro).

## CondicionOdontograma (catálogo estático, no persistido — research.md #1)

Constante de dominio, no una tabla. Forma de cada entrada:

| Campo | Tipo | Notas |
|---|---|---|
| `id` | string | Slug estable (ej. `"CARIES"`, `"OBTURACION_TEMPORAL"`). |
| `nombre` | string | Nombre visible (ej. "Caries"). |
| `categoria` | `CategoriaCondicion` | Una de las 8: `AUSENCIA_EXTRACCION`, `PATOLOGIA`, `RESTAURACIONES`, `DESGASTE_SUPERFICIE`, `ENDODONCIA`, `PROTESIS`, `POSICION_ANOMALIAS`, `ORTODONCIA`. |
| `simbolo` | `SimboloCondicion` | Describe cómo se renderiza — ver abajo. |
| `admiteEstadoColor` | boolean | Si `true`, el hallazgo puede llevar `estadoColor` (rojo/azul). |
| `aplicaA` | `"DIENTE"` \| `"SUPERFICIE"` \| `"AMBAS"` | Determina si el hallazgo exige `superficie = null` o no. |
| `multiDiente` | boolean | `true` solo para Puente fijo, Prótesis removible, Edentulismo, Fusión (FR-013). |
| `exclusivoNino` | boolean | `true` solo para Pulpotomía, Pulpectomía (FR-012). |
| `variantes` | string[] \| `null` | Ej. `["PURULENTO", "HEMORRAGICO"]` para Exudado. |

`SimboloCondicion` es una unión discriminada: `{ tipo: "BADGE", texto: string, color: "ROJO" |
"AZUL" | "FIJO" }` para las ~30 condiciones de texto+color (research.md #8), o `{ tipo:
"GRAFICO", variante: "X" | "FLECHA_RECTA" | "FLECHA_CURVA" | "FLECHAS_CRUZADAS" | "ZIGZAG" |
"LINEA_DOBLE" | "LINEA_SOLIDA" | "LINEA_PUNTEADA" | "CIRCULO" | ... }` para el resto —
enumeración cerrada de los símbolos gráficos identificados en el spec.

Las 44 entradas concretas del catálogo (nombre, categoría, símbolo y color exactos por
condición) están documentadas en el spec (`spec.md` §Key Entities y el detalle acordado en
conversación) y se transcriben literalmente al archivo de dominio durante la implementación —
no se re-derivan ni se resumen aquí para evitar que ambos documentos queden desincronizados.

## Numeración FDI (dato estático — research.md #7)

Dos arrays fijos en el dominio: `DIENTES_ADULTO` (32 números, 11–18, 21–28, 31–38, 41–48) y
`DIENTES_NINO` (20 números, 51–55, 61–65, 71–75, 81–85).

## Modificación a `Cita` (005-atencion-paciente)

El campo `planTratamiento` (string \| `null`) se **elimina** de la entidad `Cita` y de su
columna en Prisma/Dexie (FR-017) — su función se traslada por completo a
`ItemPlanTratamiento`.

**Migración de datos**: cualquier `Cita` ya finalizada con `planTratamiento` no vacío
**MUST** migrarse a una fila nueva de `ItemPlanTratamiento` antes de eliminar la columna —
`pacienteId` de la Cita, `fecha = finalizadaEn` (o `createdAt` si `finalizadaEn` es `null`),
`diente = null`, `tratamiento = planTratamiento` — para no violar el Principio III
(no descartar silenciosamente estado previo con significancia clínica) sobre citas ya
finalizadas e inmutables. Si no existe ninguna Cita con `planTratamiento` no vacío en el
momento de implementar (sistema en uso reciente/de prueba), la migración no tiene filas que
mover y el paso es un no-op seguro de todos modos.
