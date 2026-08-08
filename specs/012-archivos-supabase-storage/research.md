# Research: Migrar almacenamiento de archivos a Supabase Storage

## #1 — Un solo bucket privado con prefijos, no un bucket por entidad

**Decisión**: Un único bucket `archivos-clinicos` (privado), con dos prefijos de objeto:
`pacientes/{pacienteId}/{archivoId}` y `estudios/{citaId}/{estudioItemId}/{archivoId}`.

**Racional**: Ambas entidades tienen el mismo perfil (PDF/imagen, mismo dueño único —el
odontólogo—, mismas reglas de acceso). Un bucket por entidad duplicaría configuración de
políticas sin ningún beneficio de aislamiento real (Principio V, YAGNI). El prefijo alcanza
para navegar/auditar el contenido desde el dashboard de Supabase si hace falta.

**Alternativas consideradas**: Bucket por entidad (`archivos-paciente`, `archivos-estudio`) —
descartado, complejidad sin beneficio. Un bucket público con URLs firmadas de corta duración —
descartado porque cambia el contrato de la API (spec, Assumptions: la respuesta sigue siendo
el binario directo, no una URL) y porque un bucket privado accedido solo server-side es
estrictamente más simple de razonar para Principio VII.

## #2 — Clave del objeto derivada del `id` existente, sin columna nueva

**Decisión**: La clave del objeto en Storage se construye a partir de campos que el registro
Prisma ya tiene (`id`, y `pacienteId` o `citaId`/`estudioItemId` según la entidad) — no se
agrega ninguna columna `storagePath`/`storageKey`.

**Racional**: El `id` de cada archivo ya es único (UUID). Derivar la clave de datos que ya
existen evita una columna redundante y evita que datos inconsistentes entre la columna y el
id real puedan desincronizarse (Principio V). Requiere generar el UUID en la aplicación
(`crypto.randomUUID()`) antes de subir el objeto, en vez de dejar que Prisma lo genere con
`@default(uuid())`, para poder usar el mismo id como clave del objeto y como PK en la misma
operación — cambio menor a `agregar()` en ambos repositorios.

**Alternativas consideradas**: Guardar la clave completa en una columna nueva — más flexible
en teoría (permitiría mover archivos de bucket sin recalcular claves), pero es flexibilidad
no pedida por ningún requisito actual (Principio V); si algún día hace falta, es un cambio
acotado y reversible.

## #3 — Orden de operaciones para subir/borrar sin dejar huérfanos (FR-008, FR-009)

**Decisión**: Al subir: (1) generar el `id`, (2) subir el objeto a Storage, (3) recién si el
upload confirma éxito, insertar la fila en Postgres con ese `id`. Si el insert en Postgres
falla después de un upload exitoso, se borra el objeto recién subido antes de propagar el
error (acción compensatoria). Al borrar: (1) borrar el objeto en Storage, (2) recién si el
borrado confirma éxito (o si el objeto ya no existía), borrar la fila en Postgres.

**Racional**: Ni Postgres ni Supabase Storage participan de una transacción distribuida real
— hay que elegir un orden que, ante una falla a mitad de camino, deje el estado más fácil de
auditar/corregir. Subir primero y confirmar antes de escribir metadata evita que quede una
fila "fantasma" apuntando a un objeto que nunca llegó (el caso que rompería la lectura, FR-009
edge case). Borrar el objeto antes que la fila evita el caso opuesto en el borrado: un objeto
huérfano sin fila que lo referencie sería invisible para siempre (nadie volvería a intentar
borrarlo), mientras que una fila sin objeto (si el borrado de Storage falla y se aborta antes
del paso 2) sigue siendo visible y se puede reintentar.

**Alternativas consideradas**: Insertar primero en Postgres y subir después — descartado
porque el caso de falla (upload falla después del insert) deja exactamente el archivo
"fantasma" que FR-009 prohíbe, y es el caso más disruptivo para el odontólogo (ve el archivo
en la lista pero no puede abrirlo).

## #4 — Mapeo de errores de Storage a los tipos de error de dominio existentes

**Decisión**: Un fallo de red/timeout al subir o leer de Storage se traduce a un error nuevo
de infraestructura (no un tipo de dominio nuevo por cada caso) que la ruta API mapea a `502`
con un mensaje genérico — mismo nivel de manejo que un fallo de conexión a Postgres hoy (no
hay retry automático, el odontólogo reintenta manualmente, igual que documenta
`specs/005-atencion-paciente/contracts/archivos-estudio-api.md` para errores de conexión en
la subida). Un archivo que supera el tamaño máximo (spec FR-010) usa un error de dominio
nuevo, `ArchivoDemasiadoGrandeError`, mapeado a `422` — mismo status que
`TipoArchivoNoSoportadoError`, tratado como la misma clase de error de validación por el
cliente.

**Racional**: Los errores de dominio existentes (`PacienteNoEncontradoError`,
`TipoArchivoNoSoportadoError`, etc.) representan violaciones de reglas de negocio, no fallos
de infraestructura — mezclar "el proveedor de Storage no respondió" con esos tipos
confundiría la capa de dominio con detalles de infraestructura (Principio II). El límite de
tamaño sí es una regla de negocio (spec FR-010), por eso sí amerita su propio tipo de error de
dominio, igual que el tipo de archivo no soportado.

**Alternativas consideradas**: Reintentar automáticamente en el servidor ante un fallo de
Storage — descartado, mismo criterio que ya aplica research.md #5 de `005-atencion-paciente`
para fallos de red en la subida: el odontólogo reintenta manualmente, no hay cola de reintento
para estas operaciones online-only.

## #5 — Plan de rollback documentado para la migración de schema (Principio III)

**Decisión**: La migración de Prisma que quita la columna `contenido` de `ArchivoPaciente` y
`ArchivoEstudio` se aplica solo después de confirmar (vía `SELECT count(*)`) que ambas tablas
están vacías o que cualquier fila existente ya tiene su contenido copiado a Storage. Plan de
rollback manual si algo sale mal: restaurar la columna `contenido` desde el backup de Supabase
más reciente anterior a la migración (Supabase mantiene backups automáticos) antes de que se
purgue cualquier fila; no hay rollback automático de un `DROP COLUMN` una vez aplicado y
purgado.

**Racional**: Principio III exige que las migraciones sean reversibles o tengan un plan de
rollback manual documentado antes de aplicarse fuera de un entorno local. Un `DROP COLUMN`
sobre una columna con datos reales es intrínsecamente destructivo; documentar el plan (backup
previo + ventana de confirmación) es lo que exige el principio, no evitar la migración.

**Alternativas consideradas**: Mantener la columna `contenido` como nullable en vez de
borrarla (para poder volver atrás sin backup) — descartado por Principio V: mantener una
columna muerta indefinidamente es la complejidad que YAGNI pide evitar, y el plan de backup ya
cubre el caso de rollback real sin ese costo permanente.
