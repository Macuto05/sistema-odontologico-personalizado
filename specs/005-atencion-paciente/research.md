# Research: Atención de Paciente (Cita Clínica)

Decisiones técnicas no triviales de la Fase 0, en el mismo formato que
`003-historia-clinica-paciente` y `004-consultorios`: Decisión / Racional / Alternativas
consideradas.

## #1 — `Cita` es una entidad propia, no una extensión de `Paciente`

**Decisión**: Se modela `Cita` como una tabla/entidad nueva, con relación muchos-a-uno hacia
`Paciente`, en vez de agregar campos a `Paciente` como se hizo con la historia clínica en
003.

**Racional**: La historia clínica (003) es un estado *actual* 1:1 con el paciente, sin
historial propio — cada edición reemplaza el valor anterior (research.md #1 de 003). Una
Cita es lo opuesto: un registro de un encuentro puntual en el tiempo, del que puede haber
muchos por paciente, con su propio ciclo de vida (en curso → finalizada) y que una vez
finalizado es inmutable (spec FR-016). Forzarlo dentro de `Paciente` rompería esa
inmutabilidad y necesitaría una tabla de historial de todos modos.

**Alternativas consideradas**: Extender `Paciente` con un array de citas embebido — se
descartó porque el volumen (una cita por consulta, potencialmente cientos por paciente a lo
largo de los años) y la necesidad de listar/paginar el historial (spec FR-021, User Story 7)
piden una tabla indexable propia, no un array que crece sin límite dentro del documento del
paciente.

## #2 — Ítems de receta y nombres de estudios: arrays JSON embebidos en `Cita`, no tablas relacionales

**Decisión**: `recetaItems` (medicamento, dosis, frecuencia, duración, indicaciones) y
`estudioItems` (id, nombre) viven como columnas `Json` dentro del propio registro `Cita`, no
como tablas `ItemReceta`/`EstudioComplementario` con FK.

**Racional**: Ninguno de los dos necesita una consulta independiente de la Cita a la que
pertenece — siempre se leen y escriben como parte del mismo "documento" de atención (mismo
criterio de Principio V/YAGNI que ya usó 003 para no crear una tabla `HistoriaClinica`
separada, research.md #1 y #2 de esa feature). Mantenerlos embebidos también simplifica la
sincronización local-first: una edición de la Cita en curso (agregar un ítem de receta o un
estudio) es una única operación `EDITAR` en el outbox, igual que ya ocurre con
`antecedentesPatologicos` sobre `Paciente`, en vez de necesitar operaciones de outbox por
ítem.

**Alternativas consideradas**: Tablas `ItemReceta`/`EstudioComplementario` con FK a `Cita` —
se descartó por agregar joins y una segunda capa de sincronización (¿cada ítem es su propia
operación de outbox, o viaja siempre completo con la Cita?) sin un caso de uso que lo
requiera; no hay ningún requisito de listar ítems de receta o estudios *fuera* del contexto
de su Cita.

## #3 — Los archivos adjuntos de un estudio SÍ son una tabla propia (`ArchivoEstudio`), fuera del documento `Cita`

**Decisión**: A diferencia de `estudioItems` (#2), los archivos adjuntos de resultado viven
en una tabla `ArchivoEstudio` separada (id, citaId, estudioItemId, nombreArchivo, tipo,
contenido, createdAt), referenciando por `estudioItemId` al `id` del ítem dentro del array
`estudioItems` (sin FK de base de datos hacia un JSON — se valida en la capa de aplicación
que ese `estudioItemId` exista dentro de `estudioItems` de esa Cita).

**Racional**: El contenido binario de una imagen o PDF es pesado y de tamaño variable —
incluirlo en la misma columna `Json` que el resto de la Cita obligaría a cargar todos los
archivos cada vez que se lee cualquier dato de la atención (viola Principio VIII: no cargar
datos que la pantalla no necesita). Separarlo en su propia tabla permite traer los datos
livianos de la Cita (diagnóstico, receta, nombres de estudios) sin tocar los archivos, y
traer/mostrar un archivo puntual solo cuando el odontólogo lo pide.

**Alternativas consideradas**: Guardar los archivos embebidos en `estudioItems` como
base64 — descartado por la razón de rendimiento de arriba, agravada porque base64 infla
~33% el tamaño del payload.

## #4 — Almacenamiento del contenido binario: columna `Bytes` en PostgreSQL, no un servicio de almacenamiento de objetos externo

**Decisión**: `ArchivoEstudio.contenido` es una columna `Bytes` (bytea) de PostgreSQL,
accedida vía Prisma — no un bucket S3-compatible ni ningún servicio externo nuevo.

**Racional**: El stack ratificado (constitution.md, Technology & Architecture Constraints)
no incluye ningún servicio de almacenamiento de objetos; agregar uno implicaría nuevas
credenciales, un nuevo proveedor y un nuevo punto de fallo para una feature cuyo volumen
esperado es bajo (un consultorio de un solo odontólogo, no miles de estudios por día).
Postgres ya es la base de datos ratificada del proyecto — reutilizarla evita infraestructura
nueva (Principio V, YAGNI) mientras el volumen se mantenga en ese orden.

**Alternativas consideradas**: Almacenamiento de objetos externo (S3-compatible) — se
descarta *por ahora*; si el volumen de archivos crece lo suficiente como para que el tamaño
de la base de datos se vuelva un problema real, es una migración futura acotada (la columna
`Bytes` puede reemplazarse por una URL sin cambiar el contrato hacia el resto del sistema),
no algo que haya que resolver especulativamente en esta feature.

## #5 — Adjuntar un archivo es una operación online-only, fuera del outbox — mismo patrón que `Configuración`/`IUsuarioRepository`

**Decisión**: Subir un archivo a un estudio (`POST /api/citas/:citaId/estudios/:estudioItemId/archivos`)
se invoca directamente contra el servidor (multipart/form-data), sin pasar por
`outboxQueue`/Dexie. No existe `ArchivoEstudioRepositoryDexie` — solo
`ArchivoEstudioRepositoryPrisma`.

**Racional**: Es exactamente el mismo caso ya resuelto para `Usuario`
(`IUsuarioRepository`, research.md de la feature de cuenta): una operación que la spec
decidió explícitamente que requiere conexión (FR-019, Assumptions) no necesita fingir que es
local-first. Reutilizar el patrón ya existente evita inventar un mecanismo nuevo.

**Alternativas consideradas**: Meter la subida en el outbox con un intento de sincronizar
archivos en segundo plano — se descartó explícitamente en el spec (Assumptions): sincronizar
binarios pesados offline es una complejidad no resuelta y fuera de alcance; forzarlo acá
contradiría la decisión ya tomada con el odontólogo.

## #6 — "Una cita en curso a la vez" se resuelve localmente, sin round-trip de red

**Decisión**: El caso de uso `crearOAbrirCita(pacienteId)` primero busca en Dexie
(`db.citas`, filtrando por `pacienteId` + `estado = "EN_CURSO"`); si encuentra una, la
devuelve; si no, crea una Cita nueva localmente (id generado en el cliente, igual que
`Paciente`/`Consultorio`) y encola `CREAR` en el outbox.

**Racional**: Debe funcionar sin conexión (spec FR-020) — depender de una consulta al
servidor para decidir "crear vs. reabrir" bloquearía el botón "Nueva cita" sin internet. La
misma lógica corre en `CitaRepositoryPrisma.crearOAbrir` del lado servidor por consistencia
(usada al aplicar la operación `CREAR` en `/api/sync`, y como fuente de verdad si dos
dispositivos offline intentan iniciar una atención al mismo paciente casi al mismo tiempo:
el servidor decide cuál de las dos operaciones `CREAR` gana y cuál se resuelve como
"reapertura" de la que ya ganó, mismo criterio de resolución en el servidor que ya usa
`ConsultorioRepositoryPrisma.crear` para nombres duplicados).

## #7 — `Cita` reutiliza el mecanismo `version` / `conflictoPendiente` de `Paciente`, tal cual

**Decisión**: `Cita` tiene `version` (default 1) y `conflictoPendiente`, con el mismo
contrato que `Paciente`: cada `EDITAR` manda `baseVersion`; si no coincide con la versión del
servidor, la operación se marca `CONFLICTO` y ambas versiones se conservan (Principio III).

**Racional**: Una Cita en curso se edita repetidamente durante la atención (diagnóstico,
receta, estudios) — el mismo escenario de conflicto multi-dispositivo que ya resolvió
`Paciente` (research.md #5 de 001-gestion-pacientes) aplica sin cambios. No hay razón para
diseñar un mecanismo nuevo.

**Alternativas consideradas**: Ninguna — es la reutilización directa de un mecanismo ya
validado, no una decisión de diseño nueva.

## #8 — El outbox se generaliza a una tercera entidad, `CITA`

**Decisión**: `EntidadOutbox` pasa de `"PACIENTE" | "CONSULTORIO"` a
`"PACIENTE" | "CONSULTORIO" | "CITA"`. La mecánica de cola (`outboxQueue.ts`) no cambia — ya
es genérica desde 004-consultorios (research.md #1 de esa feature). Solo se agrega
`aplicarOperacionCita` en `/api/sync/route.ts`, análogo a `aplicarOperacionPaciente`.

**Racional**: Es la extensión prevista por el propio diseño de 004: la cola ya no sabe ni le
importa qué entidad transporta cada operación. Agregar una tercera entidad no requiere
generalizar nada más.

## #9 — Antecedentes (pestaña del panel de Atención) reutiliza 100% la infraestructura de `Paciente`/003 — cero cambios en esa capa

**Decisión**: La sección "Antecedentes" del panel de Atención llama exactamente a
`editarPaciente`/`IPacienteRepository` ya existentes, pasando solo los campos de historia
clínica. No se crea ningún adaptador ni copia de esos datos en `Cita`.

**Racional**: Spec FR-011/FR-012: son los mismos datos del paciente, no un modelo nuevo. Es
la aplicación directa de Principio V — cualquier capa nueva acá sería una duplicación
especulativa sin caso de uso.

## #10 — Bloqueo de edición de una cita finalizada: UI deshabilitada + rechazo en el backend (defensa en profundidad)

**Decisión**: El formulario de Diagnóstico/Receta/Estudios pasa a solo lectura en la UI
cuando `cita.estado === "FINALIZADA"`, **y** `editarCita`/`CitaRepositoryPrisma.editar`
rechazan la operación con `CitaFinalizadaError` si igual llega una edición (ej. una
operación de outbox encolada offline *antes* de finalizar, que recién se sincroniza
*después*).

**Racional**: Principio VII ("un chequeo de rol que pasa en el cliente modificado sigue
siendo un bug") aplicado al estado del recurso, no solo al rol: la UI deshabilitada es
UX, no el control real. El caso concreto que lo justifica es local-first: el odontólogo
puede escribir un cambio offline en una Cita que en ese momento estaba en curso, finalizarla
desde *otro* dispositivo mientras el primero sigue offline, y recién ahí sincronizar la
edición vieja — el servidor debe rechazarla, no aplicarla silenciosamente.

## #11 — Componentes de UI nuevos: `Accordion` y `FileInput`; el panel lateral en mobile reutiliza `Modal`, no un `Drawer` nuevo

**Decisión**: Se agregan dos primitivas a `src/components/ui/`: `Accordion` (para
Antecedentes/Historial de citas anteriores, con dos secciones independientes) y `FileInput`
(selector de imagen/PDF con validación de tipo, para adjuntar resultado de un estudio). Para
mobile, el panel lateral se abre como `Modal` a pantalla completa (ya es su comportamiento
por debajo de 640px, docs/design-system.md §6.4) en vez de construir un componente `Drawer`
nuevo.

**Racional**: Principio VI exige revisar el inventario existente antes de crear un
componente nuevo — `Modal` ya resuelve "contenido secundario a pantalla completa en mobile,
centrado en desktop", que es exactamente lo que necesita el panel lateral; no hay
justificación para un segundo componente que haga lo mismo con otro nombre. `Accordion` y
`FileInput` sí son genuinamente nuevos (no hay nada parecido en el inventario) y quedan
documentados en `docs/design-system.md` como extensión, reutilizables por features futuras.

**Alternativas consideradas**: Un componente `Drawer` deslizante desde la derecha — se
descartó por ser una segunda solución al mismo problema que `Modal` ya cubre, además de
página costos extra para pasar todos los criterios de accesibilidad/responsive
(sección 4) que `Modal` ya tiene resueltos.

## #12 — Catálogo de categoría de consulta: enum fijo en Prisma, no una tabla configurable

**Decisión**: `CategoriaConsulta` es un enum de Prisma (`CONTROL`, `URGENCIA`,
`LIMPIEZA_PROFILAXIS`, `ENDODONCIA`, `EXTRACCION`, `RESTAURACION_OBTURACION`, `ORTODONCIA`,
`CIRUGIA`, `CONSULTA_GENERAL`, `OTRO`), igual que `AntecedentePatologico` (003).

**Racional**: Spec Assumptions: "no es configurable por el odontólogo en esta feature" — es
exactamente el mismo caso que el checklist de antecedentes patológicos, mismo mecanismo,
sin necesidad de decisión nueva.

## #13 — Historial de citas: consulta indexada por `(pacienteId, estado)`, sin N+1

**Decisión**: `Cita` tiene un índice compuesto `@@index([pacienteId, estado])` en Postgres
y `[pacienteId+estado]` en Dexie. `listarPorPaciente(pacienteId, { estado: "FINALIZADA" })`
trae solo los campos livianos necesarios para la lista (fecha, categoría, diagnóstico) — no
hace un `SELECT *` que arrastre `recetaItems`/`estudioItems` completos si la lista no los
muestra, ni un `include` de `archivosEstudio` (Principio VIII).

**Racional**: Es el mismo criterio ya aplicado al listado de pacientes (`select`/`include`
explícito, nunca la relación completa por defecto) — spec SC-004 exige poder revisar el
historial sin demora perceptible.

## #14 — Ver el contenido de un archivo ya adjunto también requiere conexión; solo su metadata es local-first

**Decisión**: Cuando el cliente sincroniza una Cita, trae la metadata de sus archivos
adjuntos (nombre, tipo, fecha) para poder mostrar "2 archivos adjuntos" en el historial sin
conexión — pero el contenido (bytes) de un archivo solo se obtiene bajo demanda vía
`GET /api/citas/:citaId/estudios/:estudioItemId/archivos/:archivoId`, que requiere conexión
igual que subirlo.

**Racional**: Consecuencia directa de #3/#4: el contenido nunca se guarda en IndexedDB (sería
además un problema de espacio de almacenamiento del navegador si se acumulan radiografías).
Es una extensión natural de la excepción ya documentada en el spec (FR-019), no una excepción
nueva — ver el archivo es la otra mitad de la misma operación que subirlo.
