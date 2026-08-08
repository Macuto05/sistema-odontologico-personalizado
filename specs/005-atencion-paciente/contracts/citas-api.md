# Contrato: API de Citas

Todas las rutas requieren sesión válida (Auth.js) — sin sesión, `401`. Los tipos siguen
`data-model.md` (`Cita`, `ItemReceta`, `EstudioItem`). Igual que `Paciente`/`Consultorio`,
las mutaciones sobre los campos de texto/receta/estudios de una `Cita` viajan a través de
`POST /api/sync` (ver extensión del contrato de sync más abajo) — la UI escribe primero en
Dexie y encola la operación, nunca llama directo a un endpoint de escritura para estos
campos. La única excepción son los archivos adjuntos (`contracts/archivos-estudio-api.md`),
que sí son una llamada directa online-only (research.md #5).

## `GET /api/patients/:id/citas`

Usado por la UI (User Story 7, historial de citas anteriores) — lista las citas de **un**
paciente.

## `GET /api/citas` (implementación — no estaba en la versión original de este contrato)

Pull incremental **global** (todos los pacientes) del motor de sync — el endpoint de
arriba está scoped a un paciente y no sirve para el pull en segundo plano, que necesita
"todo lo que cambió desde la última sincronización" sin importar de quién. Mismos query
params (`desde`, `pagina`, `limite`) y misma forma de respuesta (`{ "citas": [...] }`) que
el endpoint de arriba, sin el filtro `estado` (siempre trae `EN_CURSO` y `FINALIZADA`).
Ninguna pantalla lo llama directo — ver `syncEngine.ts#pullCitasDesdeServidor`
(research.md #13).

Ambos endpoints usan el pull incremental de `Cita` (mismo criterio que el pull de
`Paciente`, `specs/003-historia-clinica-paciente/research.md #12`).

**Query params**:

| Param | Notas |
|---|---|
| `estado` | `EN_CURSO` \| `FINALIZADA` \| `TODOS`. Sin este param, el historial de la UI siempre pide `FINALIZADA` (FR-021, FR-022 — la cita en curso nunca aparece en su propio historial). |
| `desde` | Timestamp ISO — solo devuelve citas con `updatedAt > desde` (pull incremental). |
| `pagina`, `limite` | Igual convención que `GET /api/patients` (`specs/001-gestion-pacientes/contracts/patients-api.md`). |

**200**:

```json
{
  "citas": [
    {
      "id": "...",
      "pacienteId": "...",
      "estado": "FINALIZADA",
      "categoria": "CONTROL",
      "motivoConsulta": "...",
      "diagnostico": "...",
      "planTratamiento": "...",
      "recetaItems": [
        { "id": "...", "medicamento": "Amoxicilina", "dosis": "500mg", "frecuencia": "cada 8 horas", "duracion": "7 días", "indicaciones": null }
      ],
      "estudioItems": [
        {
          "id": "...",
          "nombre": "Radiografía panorámica",
          "archivos": [
            { "id": "...", "nombreArchivo": "radiografia.jpg", "tipo": "IMAGEN", "createdAt": "..." }
          ]
        }
      ],
      "version": 2,
      "conflictoPendiente": null,
      "finalizadaEn": "...",
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

Sin citas que coincidan con el filtro → `{ "citas": [] }` (FR-024: la UI es responsable de
mostrar el mensaje de "sin citas anteriores", no este endpoint).

## `GET /api/citas/:id`

Detalle completo de una Cita — usado al reabrir una cita en curso y al abrir una del
historial en solo lectura (User Story 7, escenario 2). Misma forma que cada elemento de
`citas` arriba.

**404** si no existe.

---

# Extensión del contrato: API de Sincronización (Outbox)

Ver `specs/001-gestion-pacientes/contracts/sync-api.md` y
`specs/004-consultorios/contracts/consultorios-api.md` para el contrato original. Esta
feature generaliza `POST /api/sync` para aceptar también operaciones de `Cita` en el mismo
lote (research.md #8) — idempotencia por `id`, orden de aplicación y tamaño máximo de lote
no cambian.

## `POST /api/sync` (body extendido)

```json
{
  "operaciones": [
    {
      "id": "uuid-idempotencia-de-la-operacion",
      "entidad": "CITA",
      "entidadId": "uuid-de-la-cita",
      "tipo": "CREAR",
      "payload": { "id": "...", "pacienteId": "..." }
    },
    {
      "id": "uuid-idempotencia-de-la-operacion",
      "entidad": "CITA",
      "entidadId": "uuid-de-la-cita",
      "tipo": "EDITAR",
      "payload": {
        "categoria": "URGENCIA",
        "motivoConsulta": "...",
        "diagnostico": "...",
        "planTratamiento": "...",
        "recetaItems": [ "..." ],
        "estudioItems": [ { "id": "...", "nombre": "..." } ]
      },
      "baseVersion": 1
    },
    {
      "id": "uuid-idempotencia-de-la-operacion",
      "entidad": "CITA",
      "entidadId": "uuid-de-la-cita",
      "tipo": "FINALIZAR",
      "payload": {},
      "baseVersion": 2
    }
  ]
}
```

- **`CREAR` (Cita)** — idempotente por `id`, igual que `Paciente`/`Consultorio`: si ya
  existe una Cita con ese `id`, el servidor la devuelve sin duplicar. Antes de crear, el
  servidor aplica la misma regla de "una cita en curso a la vez" que el cliente
  (research.md #6): si el `pacienteId` del payload ya tiene una Cita `EN_CURSO` con **otro**
  `id`, el servidor devuelve esa Cita existente en la respuesta (con `estado: "SINCRONIZADO"`,
  `cita` apuntando a la ya existente) en vez de crear una segunda — resuelve el caso de dos
  dispositivos offline que intentaron iniciar una atención al mismo paciente casi
  simultáneamente, sin perder ninguna de las dos intenciones silenciosamente.
- **`EDITAR` (Cita)** — mismo mecanismo de `baseVersion`/conflicto que `Paciente`
  (research.md #7). Se **rechaza** (`RECHAZADO`, `error: "CITA_FINALIZADA"`) si la Cita ya
  está `FINALIZADA` en el servidor (research.md #10) — puede pasar si el mismo dispositivo
  encoló la edición offline antes de que otro dispositivo la finalizara.
- **`FINALIZAR` (Cita)** — pasa `estado` a `FINALIZADA` y completa `finalizadaEn`. Mismo
  `baseVersion`/conflicto que `EDITAR`. Idempotente: finalizar una Cita ya `FINALIZADA`
  devuelve `SINCRONIZADO` sin error (mismo criterio que "archivar un paciente ya
  archivado").

`baseVersion` no aplica a `CREAR` (se ignora si viene), igual que `Paciente`.

**200**: resultado por operación, en el mismo orden que se enviaron.

```json
{
  "resultados": [
    { "id": "uuid-idempotencia", "estado": "SINCRONIZADO", "cita": { "...": "Cita completa" } },
    { "id": "uuid-idempotencia", "estado": "RECHAZADO", "error": "CITA_FINALIZADA" },
    { "id": "uuid-idempotencia", "estado": "RECHAZADO", "error": "PACIENTE_ARCHIVADO" }
  ]
}
```

- `PACIENTE_ARCHIVADO` — se intentó `CREAR` una Cita para un paciente que está archivado
  (FR-001), por ejemplo si se archivó desde otro dispositivo entre que el botón se habilitó
  localmente y la operación se sincronizó.
