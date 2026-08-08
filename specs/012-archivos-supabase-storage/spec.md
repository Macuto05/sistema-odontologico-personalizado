# Feature Specification: Migrar almacenamiento de archivos a Supabase Storage

**Feature Branch**: `012-archivos-supabase-storage`

**Created**: 2026-08-07

**Status**: Draft

**Input**: User description: "Migrar el almacenamiento binario de ArchivoPaciente y ArchivoEstudio (hoy columna Bytes/BYTEA en Postgres) a Supabase Storage. Mantener el mismo contrato de API existente — el cambio es de dónde vive el contenido binario, no de cómo el resto del sistema lo consume: sigue siendo online-only, sin espejo en Dexie/outbox, con contenido servido bajo demanda. Los archivos son PDFs e imágenes (radiografías, documentos de odontología), solo visibles para el odontólogo (cuenta única del sistema). Acceso a Supabase Storage exclusivamente server-side vía service-role key, nunca expuesto al cliente."

## Contexto

Esta feature ya existe y está en producción de facto: la pestaña "Archivos" de la ficha del
paciente (`ArchivoPaciente`) y los archivos adjuntos a un estudio dentro de una atención
(`ArchivoEstudio`, feature `005-atencion-paciente`) permiten subir, listar, ver y borrar PDFs
e imágenes. Hoy el contenido binario vive en una columna `Bytes` de PostgreSQL.
`specs/005-atencion-paciente/research.md` (decisión #4) documentó explícitamente que esa
columna "puede reemplazarse por una URL sin cambiar el contrato hacia el resto del sistema"
cuando el volumen lo justifique — este spec ejecuta esa migración ya anticipada, ahora que el
proyecto además mueve el hosting de Postgres a Supabase.

No es una feature de cara al usuario con comportamiento nuevo: el odontólogo sigue subiendo,
viendo y borrando archivos exactamente igual que hoy. Lo que cambia es dónde vive el binario y
qué proveedor lo sirve.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Subir un archivo sigue funcionando igual (Priority: P1)

El odontólogo sube una radiografía (imagen) o un documento (PDF) desde la ficha del paciente o
desde un estudio dentro de una atención. El archivo queda disponible para ver/descargar
después, sin que el odontólogo perciba ningún cambio de comportamiento respecto a hoy.

**Why this priority**: Es el flujo que ya usa el odontólogo a diario. Si se rompe, se pierde
la capacidad de documentar historias clínicas — es el corazón de la migración.

**Independent Test**: Subir un PDF y una imagen desde la ficha de un paciente de prueba,
confirmar que aparecen en la lista con su nombre, tipo y tamaño correctos.

**Acceptance Scenarios**:

1. **Given** una ficha de paciente sin archivos, **When** el odontólogo sube una imagen
   (`image/*`) o un PDF, **Then** el archivo aparece en la lista de "Archivos" con su nombre,
   tipo y tamaño, igual que con el almacenamiento anterior.
2. **Given** un archivo con un tipo MIME no soportado (ni imagen ni PDF), **When** el
   odontólogo intenta subirlo, **Then** el sistema rechaza la subida con el mismo error de
   validación que usa hoy (tipo no soportado) y no crea ningún registro.
3. **Given** una subida en curso, **When** la conexión se corta a mitad de camino, **Then** no
   queda ni un registro de archivo huérfano ni un archivo huérfano en el almacenamiento — el
   odontólogo puede reintentar manualmente.

---

### User Story 2 - Ver/descargar un archivo ya subido (Priority: P1)

El odontólogo abre un archivo previamente subido (radiografía o documento) para consultarlo
durante una atención o revisión de historia clínica.

**Why this priority**: Subir sin poder ver después no tiene valor — es la otra mitad
inseparable del mismo flujo.

**Independent Test**: Con un archivo ya subido, pedir su contenido y confirmar que se recibe
el binario correcto con el tipo de contenido adecuado.

**Acceptance Scenarios**:

1. **Given** un archivo ya subido, **When** el odontólogo lo abre, **Then** recibe el
   contenido correcto (mismos bytes que se subieron) con el nombre y tipo originales.
2. **Given** un `archivoId` que no pertenece al paciente/estudio indicado en la URL, **When**
   se intenta acceder, **Then** el sistema responde como si no existiera (sin filtrar que
   pertenece a otro registro).
3. **Given** el odontólogo sin sesión iniciada, **When** intenta acceder a un archivo,
   **Then** el sistema lo rechaza — nadie más que el odontólogo autenticado puede ver archivos.

---

### User Story 3 - Borrar un archivo (Priority: P2)

El odontólogo elimina un archivo que subió por error o que ya no necesita conservar (hoy
soportado para `ArchivoPaciente`).

**Why this priority**: Corrige errores de carga, pero no es indispensable para el día a día
como subir/ver — de ahí P2.

**Independent Test**: Borrar un archivo existente y confirmar que desaparece de la lista y ya
no se puede descargar.

**Acceptance Scenarios**:

1. **Given** un archivo existente, **When** el odontólogo lo borra, **Then** desaparece de la
   lista y una descarga posterior responde como si nunca hubiera existido.
2. **Given** el borrado de un archivo, **When** se completa, **Then** no queda contenido
   huérfano en el almacenamiento (el binario se elimina junto con el registro).

---

### Edge Cases

- ¿Qué pasa si el proveedor de almacenamiento no responde (caído/timeout) al subir? El
  sistema no debe dejar un registro de metadata sin contenido asociado — mismo criterio que
  hoy con Postgres (todo o nada).
- ¿Qué pasa si el proveedor de almacenamiento no responde al pedir un archivo ya subido? El
  odontólogo ve un error claro, no una pantalla en blanco ni un archivo corrupto.
- ¿Qué pasa si se sube un archivo del tamaño máximo permitido justo en el límite? Se acepta;
  uno un byte más grande se rechaza con el mismo tipo de error de validación que un tipo no
  soportado.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE seguir aceptando únicamente archivos de tipo imagen (`image/*`)
  o PDF (`application/pdf`) al subir, tanto para `ArchivoPaciente` como `ArchivoEstudio` —
  mismo criterio de validación que hoy.
- **FR-002**: El sistema DEBE almacenar el contenido binario de archivos nuevos en el servicio
  de almacenamiento de objetos (Supabase Storage) en lugar de en la base de datos relacional.
- **FR-003**: El sistema DEBE seguir exponiendo exactamente las mismas rutas y formas de
  respuesta que hoy (subir, listar metadata, obtener contenido, borrar) — ningún cliente
  existente debe requerir cambios para seguir funcionando.
- **FR-004**: El sistema DEBE seguir sirviendo el contenido de un archivo únicamente a
  pedido explícito (bajo demanda), nunca precargado ni espejado en el almacenamiento local del
  dispositivo (IndexedDB/Dexie) — mismo criterio online-only vigente.
- **FR-005**: El sistema DEBE seguir validando que un archivo solicitado pertenezca
  exactamente al paciente o estudio indicado en la URL antes de servirlo (control de acceso a
  nivel de registro).
- **FR-006**: El sistema DEBE seguir requiriendo sesión autenticada del odontólogo para
  cualquier operación sobre archivos (subir, ver, borrar) — sin excepciones.
- **FR-007**: El sistema DEBE impedir que credenciales con acceso de escritura/lectura
  amplio al almacenamiento (equivalentes a la service-role key) sean alcanzables desde código
  que corre en el navegador — el acceso al almacenamiento ocurre exclusivamente en el
  servidor.
- **FR-008**: Al borrar un archivo, el sistema DEBE eliminar tanto su registro de metadata
  como su contenido en el almacenamiento — no debe quedar contenido huérfano.
- **FR-009**: Si la subida de un archivo se interrumpe o falla a mitad de camino, el sistema
  NO DEBE dejar un registro de metadata sin su contenido correspondiente, ni contenido
  huérfano en el almacenamiento sin metadata asociada.
- **FR-010**: El sistema DEBE rechazar archivos que superen el tamaño máximo definido (ver
  Assumptions) con un error de validación equivalente al de tipo no soportado.

### Key Entities

- **ArchivoPaciente**: archivo suelto adjunto directamente a un paciente (pestaña "Archivos"
  de la ficha). Metadata (nombre, tipo, tamaño, fecha) sigue viviendo en Postgres; el
  contenido binario pasa a vivir en Supabase Storage, referenciado desde el registro.
- **ArchivoEstudio**: archivo de resultado adjunto a un `EstudioItem` dentro de una Cita.
  Mismo cambio: metadata en Postgres, contenido en Supabase Storage.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El odontólogo puede subir, ver y borrar archivos (imágenes y PDFs) sin notar
  ninguna diferencia de comportamiento respecto al sistema actual.
- **SC-002**: El 100% de los archivos subidos después de la migración son recuperables byte a
  byte (el contenido descargado es idéntico al subido).
- **SC-003**: Ningún archivo queda accesible para nadie que no sea el odontólogo autenticado
  con sesión válida.
- **SC-004**: Ningún archivo borrado deja rastro recuperable en el almacenamiento (verificado
  por auditoría, no solo por la ausencia en la lista).
- **SC-005**: El tamaño de la base de datos relacional deja de crecer por contenido binario de
  archivos nuevos — solo crece por su metadata.

## Assumptions

- El sistema está en etapa previa a uso real con datos de pacientes (cuentas sembradas por
  `seed.ts`, credenciales placeholder) — esta migración no incluye backfill de archivos
  preexistentes desde Postgres a Supabase Storage. Si en el futuro hay datos reales que migrar,
  es un paso aparte y acotado.
- Tamaño máximo por archivo: se asume un límite de 20 MB por archivo (cubre con margen
  radiografías digitales e imágenes de alta resolución, y cualquier PDF de historia clínica
  razonable) — el usuario no tenía un valor definido; ajustar si en la práctica se necesita
  otro límite.
- El contrato de las rutas de la API (`POST/GET/DELETE` sobre `/api/patients/:id/archivos` y
  `/api/citas/:id/estudios/:estudioItemId/archivos`) no cambia de forma — siguen devolviendo
  el binario directamente en la respuesta de `GET`, nunca una URL firmada ni una redirección,
  para no requerir cambios en los clientes existentes.
- Solo el odontólogo (única cuenta del sistema) tiene acceso a archivos — no hay hoy ni se
  introduce ningún nivel adicional de permisos por archivo.
