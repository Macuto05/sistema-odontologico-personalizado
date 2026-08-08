# Research: Odontograma

Decisiones técnicas no triviales de la Fase 0, mismo formato que las specs anteriores:
Decisión / Racional / Alternativas consideradas.

## #1 — El catálogo de 44 condiciones es un dato estático del dominio, no una tabla de base de datos

**Decisión**: El catálogo (nombre, categoría, símbolo, color, si aplica a diente
completo/superficie/multi-diente, si es exclusivo de dentición Niño, variantes) vive como una
constante TypeScript en `src/domain/entities/CondicionOdontograma.ts`, no como una tabla
`CondicionCatalogo` en Prisma/Dexie.

**Racional**: El spec (Assumptions) es explícito: "no editable por el usuario en esta
versión". No hay ningún caso de uso que liste, filtre o pagine condiciones desde una base de
datos — el catálogo completo siempre se necesita entero y de inmediato (poblar el panel de
herramientas y la leyenda), igual en cada sesión. Una tabla de base de datos agregaría un
round-trip de red/IndexedDB y un mecanismo de sync para un dato que no cambia sin una
migración de código. Consistente con Principio V (YAGNI).

**Alternativas consideradas**: Tabla `CondicionCatalogo` sembrada por seed/migración — se
descartó porque "ampliar el catálogo" (Assumptions) ya está documentado como una iteración
futura, momento en el que sí se evaluaría si conviene moverlo a base de datos; hacerlo ahora
es una abstracción especulativa sin caso de uso presente.

## #2 — `Odontograma`: una fila por (paciente, dentición), hallazgos embebidos como JSON

**Decisión**: `Odontograma` es una entidad con relación muchos-a-uno hacia `Paciente`, con una
fila por combinación `(pacienteId, denticion)` — como máximo 2 por paciente (`ADULTO`,
`NIÑO`), creadas la primera vez que se marca un hallazgo en esa vista (research.md #10). El
array `hallazgos` (condición, diente(s), superficie, variante, estado de color, nota) vive
como columna `Json`, igual que `recetaItems`/`estudioItems` en `Cita` (005, research.md #2).

**Racional**: El spec exige "una sola foto que se actualiza" por dentición (FR-002, FR-018),
no un historial de estados — encaja con el mismo criterio ya usado para `antecedentesPatologicos`
(003) y `recetaItems`/`estudioItems` (005): el array siempre se lee/escribe completo junto con
su documento padre, sin necesidad de consultar un hallazgo individual fuera del contexto de su
Odontograma. Mantenerlo embebido simplifica la sincronización: editar (agregar/editar/eliminar
un hallazgo) es una única operación `EDITAR` de outbox sobre el `Odontograma`, no una operación
por hallazgo.

**Alternativas consideradas**: Tabla `HallazgoDental` con FK a `Odontograma` — se descartó por
el mismo motivo que se descartó para `ItemReceta`/`EstudioComplementario` en 005 (research.md
#2 de esa feature): ningún requisito necesita consultar hallazgos fuera del contexto de su
Odontograma, y una tabla separada exigiría decidir si cada hallazgo es su propia operación de
outbox (complejidad de sync sin caso de uso que la pida).

## #3 — El historial de cambios (`CambioOdontograma`) SÍ es una tabla propia, fuera del documento `Odontograma`

**Decisión**: A diferencia de los hallazgos (#2), cada entrada del historial de auditoría vive
en una tabla `CambioOdontograma` separada (id, odontogramaId, pacienteId, denticion,
tipoCambio, dientes, superficie, descripcion, fecha), no embebida dentro de `Odontograma`.

**Racional**: El historial es un registro que **crece sin límite** a lo largo de los años
(cada marca, edición o eliminación de un hallazgo agrega una entrada) — el mismo criterio ya
usado para separar `Cita` de `Paciente` en 005 (research.md #1 de esa feature: "un registro
puntual en el tiempo, del que puede haber muchos, no un estado 1:1"). Embeberlo dentro de
`Odontograma.hallazgos` obligaría a cargar todo el historial completo cada vez que se abre el
tab (viola Principio VIII) solo para mostrar el diagrama, que únicamente necesita el estado
vigente. Separarlo permite que el panel de "Historial de cambios" (FR-010, User Story 4) lo
consulte solo cuando el odontólogo lo abre, indexado por `odontogramaId` + `fecha`.

**Alternativas consideradas**: Derivar el historial en el servidor a partir de un diff de
versiones sucesivas de `Odontograma` — se descartó porque el modelo local-first ya sobrescribe
el registro en cada sync; reconstruir un diff retroactivo requeriría guardar snapshots
completos de cada versión (más pesado que una tabla de eventos), y porque el cliente offline
necesita poder generar y mostrar la entrada del historial de inmediato, sin depender de un
cálculo de servidor.

## #4 — `CambioOdontograma` es solo-inserción (append-only): sin `version` ni resolución de conflictos

**Decisión**: A diferencia de `Odontograma`/`Paciente`/`Cita`, las filas de `CambioOdontograma`
nunca se editan ni se sobrescriben — cada operación de outbox sobre esta entidad es siempre
`CREAR`, nunca `EDITAR`.

**Racional**: Es un registro de auditoría (Principio III) — por definición no debe cambiar una
vez escrito. Al ser siempre inserción nueva, dos dispositivos que sincronizan offline nunca
pueden pisarse una entrada del historial entre sí (a diferencia de una edición concurrente del
mismo `Odontograma`, que sí necesita el mecanismo `version`/`conflictoPendiente`); dos cambios
concurrentes al odontograma simplemente producen dos entradas de historial distintas, ambas
preservadas.

**Alternativas consideradas**: Ninguna — es la única opción consistente con "no perder estado
previo" (Principio III) para un registro de auditoría.

## #5 — `ItemPlanTratamiento`: tabla propia, independiente de la dentición, con guardado inmediato (sin borrador)

**Decisión**: Cada línea del plan de tratamiento (fecha, diente opcional, tratamiento
ejecutado) es una fila de una tabla `ItemPlanTratamiento` con relación muchos-a-uno hacia
`Paciente` directamente — no hacia `Odontograma` ni ligada a una dentición — y se guarda de
inmediato al crear/editar/eliminar una línea, sin pasar por el modelo de borrador de
005-atencion-paciente.

**Racional**: El campo `diente` es de texto libre justamente para no exigir que una línea de
tratamiento corresponda a una dentición específica (spec: "puede quedar vacío" para
tratamientos generales) — ligarlo a un `Odontograma` (Adulto o Niño) obligaría a elegir uno de
los dos sin necesidad real. Sobre el guardado inmediato: el spec reemplaza un campo que en
005 ya se guardaba solo al "Finalizar atención" (texto libre en Diagnóstico) por una tabla en
un tab que — igual que Antecedentes (005, revisión del modelo de borrador) — no depende del
ciclo de vida de ninguna Cita en curso; no tiene sentido perder una línea de tratamiento ya
cargada si el odontólogo presiona "Volver a la ficha" sin finalizar la atención.

**Alternativas consideradas**: Embeber `itemsPlanTratamiento` dentro de `Cita` (como
`recetaItems`) — se descartó porque el spec explícitamente saca esta información del ciclo de
vida de la Cita (FR-017: se elimina de la pestaña Diagnóstico) y la vuelve una vista del
estado del paciente, no de una atención puntual.

## #6 — El tab Odontograma se guarda de inmediato, igual que Antecedentes — no participa del modelo de borrador de 005

**Decisión**: Dentro del panel de Atención (005-atencion-paciente), el tab Odontograma
(hallazgos, historial, plan de tratamiento) escribe directamente a través de sus casos de uso
respectivos en cuanto el odontólogo confirma una acción — no acumula estado en un borrador de
React que solo se persiste al presionar "Finalizar atención".

**Racional**: 005 (revisión posterior de su plan.md) ya estableció que Antecedentes es la
única excepción al modelo de borrador porque "es un dato del paciente, no del borrador de la
Cita". El Odontograma es exactamente el mismo caso: es el estado bucal *del paciente*
(FR-006), no de la cita que se está atendiendo — presionar "Volver a la ficha" sin finalizar
la atención no debe hacer que un hallazgo recién marcado desaparezca. `ItemPlanTratamiento`
(#5) sigue el mismo criterio por la misma razón.

**Alternativas consideradas**: Ninguna — es la única opción consistente con el modelo de datos
ya decidido en el spec ("una sola foto que se actualiza", no versionada por cita).

## #7 — Numeración FDI (Adulto 11-48, Niño 51-85): dato estático, igual que el catálogo

**Decisión**: Los dos conjuntos de números de diente (32 piezas adultas, 20 piezas
temporales) viven como arrays estáticos en el dominio, junto al catálogo de condiciones (#1).

**Racional**: Son estándares clínicos fijos (FDI/ISO 3950), no datos que el usuario configura
ni que cambian entre pacientes.

**Alternativas consideradas**: Ninguna considerada seriamente — es un estándar internacional
sin variantes relevantes para este sistema.

## #8 — Símbolos: sistema de "badge" (texto + color) para la mayoría, un set pequeño de símbolos SVG a medida para el resto — sin librería de gráficos

**Decisión**: ~30 de las 44 condiciones se renderizan con un componente genérico "badge"
(círculo/etiqueta de color con 1-4 letras, ej. "OT", "PD", "MAC") parametrizado por color y
texto. Las ~14 restantes (X, flechas de migración/rotación/transposición/intrusión/extrusión,
zigzag de fractura/rebordes desiguales, línea doble de diastema, línea sólida/punteada de
puente fijo/prótesis removible/edentulismo, círculo de absceso/obturación defectuosa) usan un
set acotado de símbolos SVG a medida, dibujados a mano con SVG nativo de React — sin agregar
ninguna librería de gráficos/canvas nueva.

**Racional**: Reutilizar un único componente "badge" para la mayoría del catálogo evita
construir 44 iconos a medida (Principio V) — el diseño gráfico real solo es necesario para el
puñado de símbolos que no se pueden expresar como texto+color. SVG nativo es suficiente para
formas simples (líneas, flechas, círculos) sin el costo de una dependencia nueva.

**Alternativas consideradas**: Librería de iconos de terceros — se descartó porque ninguna
librería genérica tiene estos símbolos clínicos específicos (son convención odontológica, no
iconografía de UI estándar); se seguiría necesitando dibujar el set a medida de todos modos.

## #9 — Sincronización: `EntidadOutbox` se extiende con `"ODONTOGRAMA"`, `"CAMBIO_ODONTOGRAMA"`, `"ITEM_PLAN_TRATAMIENTO"`

**Decisión**: Se agregan tres valores nuevos al discriminador `EntidadOutbox` ya generalizado
en 004-consultorios (research.md #1 de esa feature), reutilizando el mismo motor de outbox y
`syncEngine` sin cambios estructurales.

**Racional**: Mismo patrón ya probado tres veces (`PACIENTE`, `CONSULTORIO`, `CITA`) — no hay
motivo para desviarse.

**Alternativas consideradas**: Ninguna — es la extensión directa de un patrón ya establecido.

## #10 — `obtenerOCrearOdontograma`: no existe un "crear odontograma" explícito por parte del usuario

**Decisión**: El caso de uso que obtiene el `Odontograma` de un paciente para una dentición
dada lo crea vacío de forma transparente la primera vez que se necesita (al abrir el tab, o al
registrar el primer hallazgo) — el odontólogo nunca ve un paso de "crear odontograma".

**Racional**: El spec no describe ninguna acción de creación explícita — el odontograma
"existe" conceptualmente desde que el paciente existe, simplemente empieza vacío. Mismo
criterio que 003 usó para la historia clínica (campos del paciente con default vacío, no un
registro que haya que crear aparte).

**Alternativas consideradas**: Exigir una acción explícita "Crear odontograma" antes de poder
marcar el primer hallazgo — se descartó por agregar un paso sin valor (SC-001 exige poder
marcar un hallazgo en menos de 15 segundos).
