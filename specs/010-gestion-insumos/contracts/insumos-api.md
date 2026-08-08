# Contrato: API de Insumos

Todas las rutas requieren sesión válida (Auth.js) — sin sesión, `401`. Todas devuelven y
reciben JSON. Los tipos siguen `data-model.md` (`Insumo`). Mismo estilo de contrato que
`001-gestion-pacientes/contracts/patients-api.md`.

## `GET /api/insumos`

Lista/busca/filtra insumos activos por defecto.

**Query params**:
- `q` (opcional): texto de búsqueda. Filtra por `nombre` (coincidencia parcial, insensible a
  mayúsculas) — FR-008.
- `categoria` (opcional): filtra por categoría exacta, entre los valores ya usados por
  insumos activos (FR-009).
- `aReponer` (opcional, boolean): si es `true`, devuelve únicamente insumos activos con
  `stockActual <= stockMinimo` (data-model.md, campo derivado). Usado por la tarjeta de
  Inicio para obtener el conteo (FR-006) sin traer todos los insumos.
- `estado` (opcional): `ACTIVO` (default) | `ARCHIVADO` | `TODOS` — FR-010.
- `pagina` (opcional, default `1`): número de página, base 1.
- `limite` (opcional, default `10`): tamaño de página (FR-007). Igual que en Pacientes, un
  valor más alto lo usa internamente el motor de sync, no la pantalla.
- `desde` (opcional, timestamp ISO 8601): pull incremental para el motor de sync — solo
  devuelve insumos con `updatedAt > desde`, igual que en `patients-api.md`.

**200**:
```json
{
  "insumos": [ { "id": "...", "nombre": "...", "categoria": "...", "stockActual": 0, "stockMinimo": 0, "aReponer": true, "estado": "ACTIVO", "...": "..." } ],
  "total": 42
}
```
`total` es la cantidad de registros que matchean los filtros, **sin paginar**.

Sin resultados → `{ "insumos": [], "total": 0 }` (la UI muestra el estado vacío, no un
error).

## `POST /api/insumos`

Crea un insumo. El `id` lo genera el cliente (UUID v4) y viaja en el body — el servidor no
genera uno propio.

**Body**:
```json
{
  "id": "uuid-generado-en-cliente",
  "nombre": "string",
  "categoria": "string | null",
  "stockActual": 0,
  "stockMinimo": 0
}
```

**201**: el insumo creado (incluye `estado: "ACTIVO"`, `version: 1`, `aReponer` calculado,
timestamps).

**422**: falta un campo obligatorio (`nombre`, `stockActual`, `stockMinimo`) o `stockActual`
/`stockMinimo` es negativo o no entero — FR-002, FR-003, validado con Zod.

## `PUT /api/insumos/:id`

Edita un insumo **activo**, incluida su `stockActual` (reposición/consumo, FR-011). Incluye
`baseVersion` para detección de conflicto, igual que Pacientes.

**Body**: mismos campos que `POST`, más `baseVersion: integer`.

**200**: insumo actualizado, `version` incrementado, `aReponer` recalculado.

**409** (insumo archivado): el insumo está en estado `ARCHIVADO`, debe reactivarse primero —
FR-012.
```json
{ "error": "INSUMO_ARCHIVADO" }
```

**409** (conflicto de versión): mismo mecanismo que `patients-api.md` — ninguna edición se
descarta silenciosamente, se marca `conflictoPendiente`:
```json
{ "error": "CONFLICTO_VERSION", "insumo": { "...": "con conflictoPendiente lleno" } }
```

**422**: mismos casos de validación que `POST`.

## `POST /api/insumos/:id/archive`

Archiva un insumo activo (FR-013). Si ya está archivado, no es un error (spec §Edge Cases):

**200**: `{ "insumo": { "...": "estado: ARCHIVADO" }, "yaEstabaArchivado": false }`

## `POST /api/insumos/:id/reactivate`

Reactiva un insumo archivado (FR-014).

**200**: `{ "insumo": { "...": "estado: ACTIVO" } }`

**409**: el insumo ya estaba activo (nada que reactivar).
