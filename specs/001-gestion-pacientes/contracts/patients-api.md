# Contrato: API de Pacientes

Todas las rutas requieren sesión válida (Auth.js) — sin sesión, `401`. Todas devuelven y
reciben JSON. Los tipos siguen `data-model.md` (`Paciente`).

## `GET /api/patients`

Lista/busca pacientes activos por defecto.

**Query params**:
- `q` (opcional): texto de búsqueda. Si se envía, filtra por `nombreCompleto` (coincidencia
  parcial, insensible a mayúsculas) **o** `documentoIdentidad` — se compara solo la parte
  numérica de `q` (se ignora cualquier carácter no numérico) contra cualquier parte del
  `documentoIdentidad` guardado (coincidencia parcial, igual que por nombre — filtra a
  medida que se escribe cada dígito), así que buscar por la cédula sin el prefijo `V`/`E`
  encuentra el paciente igual (el prefijo es un detalle de guardado, no algo que el
  odontólogo tipea) — FR-005.
- `estado` (opcional): `ACTIVO` (default) | `ARCHIVADO` | `TODOS` — FR-006.
- `pagina` (opcional, default `1`): número de página, base 1.
- `limite` (opcional, default `10`): tamaño de página. Usado tanto por la pantalla
  (paginación en lotes de 10, research.md #11) como por el motor de sync (lotes más
  grandes durante la primera sincronización de un dispositivo, research.md #12).
- `desde` (opcional, timestamp ISO 8601): cuando está presente, además de los filtros
  anteriores, solo devuelve pacientes con `updatedAt > desde`. Pensado para el motor de
  sync (pull incremental, research.md #12), no para la búsqueda de la pantalla.

**200**:
```json
{
  "pacientes": [ { "id": "...", "nombreCompleto": "...", "documentoIdentidad": "...", "estado": "ACTIVO", "...": "..." } ],
  "total": 1284
}
```
`total` es la cantidad de registros que matchean los filtros (`q`/`estado`/`desde`), **sin
paginar** — es lo que la UI usa para "Mostrando X–Y de {total}".

Sin resultados → `{ "pacientes": [], "total": 0 }` (la UI muestra el estado vacío, no un
error).

## `POST /api/patients`

Crea un paciente. El `id` lo genera el cliente (UUID v4, ver research.md #3) y viaja en el
body — el servidor no genera uno propio.

**Body**:
```json
{
  "id": "uuid-generado-en-cliente",
  "nombreCompleto": "string",
  "documentoIdentidad": "string",
  "fechaNacimiento": "YYYY-MM-DD",
  "telefono": "string | null",
  "email": "string | null",
  "direccion": "string | null",
  "genero": "MASCULINO | FEMENINO | OTRO | null",
  "estadoCivil": "SOLTERO | CASADO | DIVORCIADO | VIUDO | UNION_LIBRE | null",
  "ocupacion": "string | null"
}
```

**201**: el paciente creado (incluye `estado: "ACTIVO"`, `version: 1`, timestamps).

**409**: `documentoIdentidad` ya pertenece a otro paciente (activo o archivado) — FR-004.
```json
{ "error": "DOCUMENTO_DUPLICADO", "pacienteExistente": { "id": "...", "nombreCompleto": "..." } }
```

**422**: falta un campo obligatorio (`nombreCompleto`, `documentoIdentidad`,
`fechaNacimiento`) — FR-002, validado con Zod.

## `PUT /api/patients/:id`

Edita un paciente **activo**. Incluye `baseVersion` (el `version` que tenía el cliente
cuando empezó a editar) para detección de conflicto.

**Body**: mismos campos que `POST`, más `baseVersion: integer`.

**200**: paciente actualizado, `version` incrementado.

**409** (documento duplicado): mismo formato que en `POST` — FR-007.

**409** (paciente archivado): el paciente está en estado `ARCHIVADO`, debe reactivarse
primero — FR-008.
```json
{ "error": "PACIENTE_ARCHIVADO" }
```

**409** (conflicto de versión): `baseVersion` no coincide con el `version` actual en el
servidor — implica que otro dispositivo sincronizó una edición de este mismo paciente
primero. El servidor **no descarta ninguna de las dos ediciones** (Principio III): aplica
esta también, marca `conflictoPendiente` en el registro, y responde:
```json
{ "error": "CONFLICTO_VERSION", "paciente": { "...": "con conflictoPendiente lleno" } }
```

## `POST /api/patients/:id/archive`

Archiva un paciente activo (FR-009). Si ya está archivado, no es un error (Edge Cases del
spec):

**200**: `{ "paciente": { "...": "estado: ARCHIVADO" }, "yaEstabaArchivado": false }`

## `POST /api/patients/:id/reactivate`

Reactiva un paciente archivado (FR-010).

**200**: `{ "paciente": { "...": "estado: ACTIVO" } }`

**409**: el paciente ya estaba activo (nada que reactivar).
