# Contrato: API de Archivos de Estudio

Ambas rutas requieren sesión válida (Auth.js) — sin sesión, `401`. **Únicas dos
operaciones de esta feature que no pasan por `POST /api/sync`** (research.md #5): son
online-only por decisión explícita del spec (FR-019) — la UI las llama directo, sin
encolar nada en el outbox, y las deshabilita en el cliente si `navigator.onLine === false`
antes de intentarlo.

## `POST /api/citas/:citaId/estudios/:estudioItemId/archivos`

Sube un archivo de resultado y lo asocia a un `EstudioItem` existente dentro de la Cita
indicada. Funciona tanto si la Cita está `EN_CURSO` como `FINALIZADA` (FR-017) — es la
única escritura de esta feature que ignora el bloqueo de `Cita.estado`.

**Body**: `multipart/form-data`, un único campo `archivo`.

**Validaciones**, en orden:

1. La Cita (`citaId`) existe → si no, `404`.
2. El `estudioItemId` existe dentro de `Cita.estudioItems` de esa Cita → si no, `404`
   (`error: "ESTUDIO_NO_ENCONTRADO"`).
3. El tipo MIME del archivo recibido es una imagen (`image/*`) o `application/pdf` → si no,
   `422` (`error: "TIPO_NO_SOPORTADO"`, FR-018).

**201**:

```json
{
  "archivo": { "id": "...", "estudioItemId": "...", "nombreArchivo": "radiografia.jpg", "tipo": "IMAGEN", "createdAt": "..." },
  "cita": { "...": "Cita completa actualizada, con la metadata de archivos ya incluida en estudioItems" }
}
```

La respuesta incluye la `Cita` completa actualizada (no solo el archivo) para que el
cliente pueda hacer `db.citas.put(cita)` directamente y reflejar de inmediato el nuevo
archivo en el historial, sin un segundo round-trip (Principio VIII: evita una llamada
adicional que el propio flujo ya puede evitarse).

**Errores de conexión**: si el `fetch` falla a mitad de camino (se corta la conexión
subiendo el archivo), el cliente no reintenta automáticamente ni deja un archivo parcial —
informa el fallo y el odontólogo puede volver a intentar manualmente cuando la conexión se
restablezca (spec Edge Cases). El servidor nunca crea un `ArchivoEstudio` a partir de una
subida incompleta (Prisma no confirma la fila hasta tener el contenido completo).

## `GET /api/citas/:citaId/estudios/:estudioItemId/archivos/:archivoId`

Descarga/muestra el contenido de un archivo ya adjunto. Requiere conexión igual que subirlo
(research.md #14) — el contenido nunca se guarda en IndexedDB, a diferencia de su metadata
(que sí viaja con la Cita, ver `contracts/citas-api.md`).

**200**: el archivo binario, con `Content-Type` (`image/*` o `application/pdf`) y
`Content-Disposition` con `nombreArchivo`.

**404** si la Cita, el `EstudioItem` o el archivo no existen, o si el archivo no pertenece
al `estudioItemId`/`citaId` indicados en la URL (evita acceder a un archivo de otra Cita
adivinando su `archivoId` — Principio VII, control de acceso a nivel de registro).
