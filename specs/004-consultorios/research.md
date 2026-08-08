# Research: Consultorios (clasificación de pacientes por sede)

## 1. ¿Generalizar el motor de sync, o duplicarlo para Consultorio?

**Decision**: Se generaliza únicamente la **cola del outbox** (la mecánica de "encolar,
tomar un lote, marcar enviando/sincronizado/conflicto, reintentar") agregando un
discriminador `entidad: "PACIENTE" | "CONSULTORIO"` a `OutboxOperation` (y renombrando
`pacienteId` a `entidadId`, genérico). La lógica de **cómo aplicar** cada operación —
tanto en el cliente (`PacienteRepositoryDexie` vs. `ConsultorioRepositoryDexie`) como en el
servidor (`/api/sync`) — se mantiene completamente separada por entidad, sin una interfaz
o clase base compartida.

**Rationale**: La mecánica de cola (listar pendientes, marcar estados, reintentar en
lotes) es 100% idéntica para cualquier entidad — copiarla tal cual para `Consultorio`
sería duplicación pura, sin ninguna variación real. En cambio, "aplicar una operación"
difiere sustancialmente entre las dos entidades (`Paciente` tiene `version`/conflicto por
edición; `Consultorio` no tiene edición en absoluto, ver research.md #2) — forzar una
abstracción común ahí sería una interfaz artificial con ramas condicionales por tipo,
exactamente lo que el Principio V (YAGNI) desaconseja con solo dos casos concretos. Un
tercer tipo de dato sincronizable (si llegara a existir) sería la señal real para evaluar
una generalización más profunda.

**Alternatives considered**:
- *Generalizar todo (cola + aplicación) en un motor de sync genérico "por tipo"*:
  descartado — con 2 entidades de forma y reglas muy distintas, la abstracción resultante
  sería más compleja que el código que reemplaza.
- *Duplicar también la cola (una tabla `outboxConsultorios` separada, con sus propias
  funciones de listar/marcar/reintentar)*: descartado — es lógica idéntica línea por línea
  a la ya existente; duplicarla no gana nada y crea dos lugares para mantener el mismo
  comportamiento (ej. el tamaño de lote o el criterio de reintento).

## 2. ¿`Consultorio` necesita `version`/`conflictoPendiente` como `Paciente`?

**Decision**: No. `Consultorio` solo admite `CREAR` y `ELIMINAR` (el pedido original no
incluye renombrar — ver spec §Assumptions). Ambas operaciones son naturalmente idempotentes
por `id`: crear el mismo id dos veces no tiene efecto adicional, y eliminar un id que ya no
existe tampoco (mismo criterio que "archivar un paciente ya archivado" en
`001-gestion-pacientes`). Sin una operación `EDITAR`, no existe el escenario que
`version`/`baseVersion` resuelve (dos ediciones concurrentes al mismo campo).

**Rationale**: Agregar campos que ninguna operación real usa sería especular sobre una
futura edición no pedida (Principio V). Si en el futuro se agrega renombrar consultorios,
ese es el momento de evaluar si necesita detección de conflicto — no antes.

**Alternatives considered**:
- *Copiar `version`/`conflictoPendiente` "por si acaso"*: descartado por lo anterior.

## 3. Nombre duplicado: ¿qué pasa si dos dispositivos, ambos offline, crean el mismo nombre?

**Decision**: Se resuelve con el mismo mecanismo ya establecido para
`DOCUMENTO_DUPLICADO` de `Paciente`: el nombre se valida localmente al crear (contra la
copia local en Dexie, para feedback instantáneo), y el servidor vuelve a validar la
unicidad al aplicar la operación durante la sincronización. Si dos dispositivos offline
crean el mismo nombre (con distinto `id`, generado en cada cliente) y ambos intentan
sincronizar, el primero en llegar se aplica; el segundo recibe `RECHAZADO` con
`error: "NOMBRE_DUPLICADO"` — la operación no se pierde en silencio (Principio III): queda
marcada `CONFLICTO` en el outbox local (nunca se limpia como una sincronización exitosa), y
la sección Consultorios de Configuración muestra una advertencia inline en el consultorio
afectado (busca, vía `useLiveQuery`, operaciones `CONFLICTO` de tipo `CREAR` para
`CONSULTORIO` y las cruza por `entidadId`) para que la odontóloga la vea y decida — ej.
eliminar el duplicado local y crearlo de nuevo con otro nombre, ya que no hay fusión
automática de ids.

**Rationale**: Reutiliza un mecanismo ya probado (`RECHAZADO` con error específico) en vez
de inventar una fusión automática de dos consultorios con `id` distinto — fusionar
requeriría reescribir el `consultorioId` de cualquier paciente que ya apunte al `id`
"perdedor" en ambos dispositivos, una complejidad no justificada por lo infrecuente del
caso (una sola odontóloga, normalmente usando un dispositivo a la vez).

**Alternatives considered**:
- *Fusionar automáticamente por nombre al detectar el duplicado*: descartado por la
  complejidad de reescribir referencias cruzadas, desproporcionada para un caso raro.
- *Permitir nombres duplicados*: descartado — contradice FR-003 del spec, ya confirmado
  como necesario para que la lista sea legible.

## 4. Unicidad de nombre sin distinguir mayúsculas, en PostgreSQL

**Decision**: Se agrega una columna `nombreNormalizado` (el nombre recortado y en
minúsculas, calculado en la capa de aplicación antes de guardar) con una restricción
`@unique` en Prisma. La comparación de unicidad la hace Postgres de forma nativa sobre esa
columna ya normalizada — el resultado es case-insensitive sin necesitar la extensión
`citext` ni comparaciones `mode: "insensitive"` en cada consulta de unicidad.

**Rationale**: `citext` requiere habilitar una extensión de Postgres (privilegios de
superusuario en algunos entornos gestionados); una columna normalizada calculada en
aplicación logra el mismo resultado con una migración simple y portable, consistente con
cómo ya se resuelve la comparación de documento de identidad (comparación exacta, sin
necesitar mayúsculas/minúsculas en ese caso).

**Alternatives considered**:
- *Extensión `citext`*: descartada por el requisito de privilegios/extensión adicional
  para un beneficio marginal frente a la columna normalizada.
- *Solo validar unicidad en la capa de aplicación, sin constraint en la base*: descartada
  — no protege contra una carrera real (dos requests concurrentes), y el Principio III
  pide integridad garantizada, no solo "normalmente correcta".

## 5. Pull de Consultorio: lista completa, no incremental/paginado

**Decision**: A diferencia de `Paciente` (pull incremental paginado, `research.md #12` de
`002-pantalla-inicio`/`003-historia-clinica-paciente`), el pull de `Consultorio` trae
siempre la lista completa vigente del servidor (`GET /api/consultorios`) y reconcilia
contra Dexie: upsert de lo que existe, y **borrado local** de cualquier consultorio que ya
no esté en la respuesta del servidor (ver research.md #6 para el efecto en cascada sobre
`Paciente.consultorioId`).

**Rationale**: El volumen esperado es de unidades de consultorios por odontóloga (plan.md
§Scale/Scope) — traer la lista completa en cada ciclo de sync es barato y evita construir
un mecanismo de "borrado incremental" (que Paciente no necesita, porque nunca se borra de
verdad, solo se archiva). Construir esa maquinaria para una lista que nunca va a ser grande
sería sobre-ingeniería (Principio V).

**Alternatives considered**:
- *Pull incremental con marca de tiempo, igual que Paciente*: descartado — Paciente
  necesita evitar traer miles de fichas en cada ciclo; Consultorio nunca llega a ese
  volumen, así que el costo de "traer todo siempre" es despreciable y evita tener que
  representar borrados en un esquema incremental (requeriría, por ejemplo, tumbstones).

## 6. Reconciliación del borrado en cascada (`consultorioId` → `null`) fuera de Postgres

**Decision**: En PostgreSQL, la relación `Paciente.consultorioId → Consultorio.id` usa
`onDelete: SetNull` — la base de datos aplica el `null` automáticamente cuando se elimina
un consultorio server-side. En Dexie (sin soporte de FKs), la misma regla se aplica
explícitamente en dos lugares: (a) cuando la propia odontóloga elimina un consultorio
localmente (`ConsultorioRepositoryDexie.eliminar`, optimista), y (b) cuando el pull
(research.md #5) detecta que un consultorio que existía localmente ya no está en la
respuesta del servidor (fue eliminado desde otro dispositivo) — en ambos casos se recorren
los pacientes locales con ese `consultorioId` y se les pone `null`, antes de borrar el
registro de `consultorios`.

**Rationale**: Es la traducción directa de FR-005 a un entorno sin integridad referencial
nativa en el cliente — sin este paso, un paciente local quedaría apuntando a un
`consultorioId` que ya no existe, mostrando un valor roto en el listado (research.md #7).

**Alternatives considered**: Ninguna — es la aplicación directa del requisito ya
confirmado con el usuario, no hay una decisión de diseño alternativa razonable.

## 7. Resolución del nombre de consultorio en el listado de pacientes

**Decision**: `Paciente` guarda únicamente `consultorioId` (normalizado, sin duplicar el
nombre). La pantalla de listado (`pacientes/page.tsx`) carga la lista completa de
consultorios en paralelo (vía `useLiveQuery` sobre Dexie, igual que Configuración) y
resuelve `consultorioId → nombre` en memoria al renderizar cada fila — un solo mapa
`id → nombre` construido una vez por render de la tabla, no una consulta por fila.

**Rationale**: Evita denormalizar el nombre del consultorio dentro de cada `Paciente`
(que exigiría propagar cualquier cambio de nombre a todos los pacientes que lo usan — y
aunque esta feature no permite renombrar, aceptar esa limitación con datos normalizados es
más simple que desnormalizar "por si acaso"). Como la lista de consultorios es corta
(research.md #5), cargarla completa para el mapeo no viola el Principio VIII (no es un
N+1 — es una sola consulta adicional para toda la tabla, no una por fila).

**Alternatives considered**:
- *Guardar `consultorioNombre` desnormalizado en `Paciente`*: descartado por la
  complejidad de mantenerlo sincronizado ante cualquier cambio futuro (aunque hoy no hay
  renombrar, esta feature no debería cerrarle la puerta a agregarlo después sin una
  migración de datos).
- *Un `include`/join por fila*: ya evitado por diseño — el mapeo en memoria contra una
  lista corta ya cargada es estrictamente más barato.
