# Contrato: API de Consultorios

Todas las rutas requieren sesión válida (Auth.js) — sin sesión, `401`. Los tipos siguen
`data-model.md` (`Consultorio`). No hay `POST`/`DELETE` directos: las mutaciones (crear,
eliminar) viajan siempre a través de `POST /api/sync` (ver más abajo), igual que
`Paciente` — la UI nunca llama a este endpoint para escribir, solo para leer.

## `GET /api/consultorios`

Usado por el motor de sync del cliente para el pull completo (research.md #5) — también
serviría para cualquier lectura server-side futura, pero hoy solo lo consume el pull.

**200**:
```json
{ "consultorios": [ { "id": "...", "nombre": "Sede Norte", "createdAt": "..." } ] }
```

Sin consultorios creados → `{ "consultorios": [] }`.

---

# Extensión del contrato: API de Sincronización (Outbox)

Ver `specs/001-gestion-pacientes/contracts/sync-api.md` para el contrato original
(específico de `Paciente`). Esta feature generaliza `POST /api/sync` para aceptar también
operaciones de `Consultorio` en el mismo lote (research.md #1) — el resto del contrato
(idempotencia por `id`, orden de aplicación, tamaño máximo de lote) no cambia.

## `POST /api/sync` (body extendido)

```json
{
  "operaciones": [
    {
      "id": "uuid-idempotencia-de-la-operacion",
      "entidad": "PACIENTE",
      "entidadId": "uuid-del-paciente",
      "tipo": "CREAR | EDITAR | ARCHIVAR | REACTIVAR",
      "payload": { "...": "forma de Paciente, según el tipo" },
      "baseVersion": 1
    },
    {
      "id": "uuid-idempotencia-de-la-operacion",
      "entidad": "CONSULTORIO",
      "entidadId": "uuid-del-consultorio",
      "tipo": "CREAR | ELIMINAR",
      "payload": { "id": "...", "nombre": "Sede Norte" }
    }
  ]
}
```

`baseVersion` es obligatorio para `entidad: "PACIENTE"` y no aplica (se ignora si viene)
para `entidad: "CONSULTORIO"` — `Consultorio` no tiene edición ni detección de conflicto
por versión (research.md #2).

**200**: resultado por operación, en el mismo orden que se enviaron.

```json
{
  "resultados": [
    { "id": "uuid-idempotencia", "estado": "SINCRONIZADO", "consultorio": { "id": "...", "nombre": "Sede Norte" } },
    { "id": "uuid-idempotencia", "estado": "RECHAZADO", "error": "NOMBRE_DUPLICADO", "consultorioExistente": { "id": "...", "nombre": "Sede Norte" } },
    { "id": "uuid-idempotencia", "estado": "SINCRONIZADO", "consultorioEliminadoId": "..." }
  ]
}
```

- **`CREAR` (Consultorio)** — `409`/`RECHAZADO` lógico dentro del lote si ya existe un
  consultorio con el mismo `nombre` sin distinguir mayúsculas/minúsculas
  (`NOMBRE_DUPLICADO`, research.md #3, #4) — no se aplica la creación, la operación queda
  marcada `CONFLICTO` en el outbox local para que la odontóloga la revise.
- **`ELIMINAR` (Consultorio)** — idempotente: si el `entidadId` ya no existe (por ejemplo,
  otro dispositivo ya lo eliminó), el servidor responde `SINCRONIZADO` igual, sin error —
  mismo criterio que "archivar un paciente ya archivado" en `001-gestion-pacientes`. Al
  aplicarse, la base de datos deja `consultorioId = null` en cualquier `Paciente` que lo
  tuviera asignado (`onDelete: SetNull`, research.md #6) — el cliente no necesita calcular
  eso: lo hace el propio pull de `Paciente` (los pacientes afectados llegan con
  `consultorioId: null` en la próxima sincronización) y, para el espejo local, la
  reconciliación de `Consultorio` (ver abajo).

## `GET /api/patients` (sin cambios de forma, campo nuevo)

Cada `Paciente` de la respuesta ahora incluye `consultorioId` (string o `null`) — el
contrato de `001-gestion-pacientes/contracts/patients-api.md` no cambia en ningún otro
aspecto.

## Reconciliación del pull de Consultorio (cliente)

No es un endpoint nuevo — es el comportamiento del motor de sync al leer
`GET /api/consultorios` (research.md #5, #6): para cada `Consultorio` local cuyo `id` no
aparece en la respuesta, el cliente lo elimina de Dexie y pone `consultorioId = null` en
cualquier `Paciente` local que lo tuviera asignado, antes de continuar.
