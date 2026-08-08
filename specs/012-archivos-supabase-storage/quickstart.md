# Quickstart: validar la migración a Supabase Storage

## Prerrequisitos

- `.env` con `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (ya configurados) y `DATABASE_URL`
  apuntando a Supabase (ya configurado).
- Bucket `archivos-clinicos` creado en el dashboard de Supabase (Storage → New bucket),
  marcado **privado** (no público) — verificación manual de FR-007/Principio VII.
- Migración de Prisma aplicada (`DROP COLUMN contenido` en ambas tablas) — ver research.md #5
  para el gate antes de aplicarla si hubiera datos reales.

## Escenario 1 — Subir y ver un archivo de paciente

1. `npm run dev`, iniciar sesión como el odontólogo.
2. Ir a la ficha de un paciente de prueba → pestaña "Archivos" → subir una imagen y un PDF.
3. **Esperado**: ambos aparecen en la lista con nombre/tipo/tamaño correctos.
4. Abrir cada uno → **esperado**: se ve/descarga el contenido correcto.
5. En el dashboard de Supabase → Storage → `archivos-clinicos` → `pacientes/<pacienteId>/`:
   **esperado**: dos objetos, uno por archivo subido.
6. En el dashboard de Supabase → Table Editor → `ArchivoPaciente`: **esperado**: la columna
   `contenido` ya no existe; `tamanoBytes` sigue teniendo el valor correcto.

## Escenario 2 — Borrar un archivo de paciente

1. Borrar uno de los archivos subidos en el Escenario 1.
2. **Esperado**: desaparece de la lista; un `GET` posterior a su URL responde `404`.
3. En el dashboard de Supabase → Storage: **esperado**: el objeto correspondiente ya no está
   en el bucket (sin huérfanos, FR-008).

## Escenario 3 — Archivo de estudio dentro de una atención

1. Iniciar/abrir una Cita, agregar un `EstudioItem`, subir un archivo de resultado.
2. **Esperado**: mismo comportamiento que hoy — aparece en `estudioItems[].archivos` de la
   Cita devuelta por el `POST`.
3. Verificar en Storage: objeto en `estudios/<citaId>/<estudioItemId>/`.

## Escenario 4 — Rechazo por tamaño y por tipo

1. Intentar subir un archivo mayor a 20 MB. **Esperado**: `422 ARCHIVO_DEMASIADO_GRANDE`, sin
   objeto en Storage ni fila nueva.
2. Intentar subir un `.docx` u otro tipo no soportado. **Esperado**: `422 TIPO_NO_SOPORTADO`
   (comportamiento sin cambios).

## Escenario 5 — Control de acceso

1. Sin sesión iniciada, intentar `GET` de un archivo existente. **Esperado**: rechazado
   (sesión requerida, sin cambios).
2. Con sesión, pedir un `archivoId` real pero con un `pacienteId`/`citaId` que no le
   corresponde en la URL. **Esperado**: `404` (no revela que el archivo existe en otro
   registro — sin cambios respecto al comportamiento actual con Postgres).
