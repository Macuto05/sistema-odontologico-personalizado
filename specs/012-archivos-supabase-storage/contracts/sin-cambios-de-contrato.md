# Contratos: sin cambios

Esta feature no modifica ningún contrato de API externo (spec FR-003, Assumptions). Las
rutas y sus formas de request/response siguen siendo exactamente las documentadas en:

- `specs/005-atencion-paciente/contracts/archivos-estudio-api.md` — `POST`/`GET` sobre
  `/api/citas/:citaId/estudios/:estudioItemId/archivos[/:archivoId]`
- `src/app/api/patients/[id]/archivos/route.ts` y `[archivoId]/route.ts` — `GET`/`POST`/
  `DELETE` sobre `/api/patients/:id/archivos[/:archivoId]`

Único agregado: un archivo que supere el límite de tamaño (20 MB, ver spec FR-010) responde
`422 { "error": "ARCHIVO_DEMASIADO_GRANDE" }` en el `POST` de ambas rutas — mismo status y
misma forma que `TIPO_NO_SOPORTADO`, no un contrato nuevo.

Se documenta esta ausencia de cambio explícitamente (en vez de omitir la carpeta) porque el
punto entero de esta migración es que ningún cliente existente requiera modificarse.
