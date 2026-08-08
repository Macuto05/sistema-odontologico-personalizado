# Research: Planes de tratamiento

Decisiones técnicas no triviales de la Fase 0, mismo formato que las specs anteriores:
Decisión / Racional / Alternativas consideradas.

## #1 — Extender `ItemPlanTratamiento` (006-odontograma), no crear una entidad nueva

**Decisión**: `fechaRealizado` y `nota` se agregan como columnas opcionales de
`ItemPlanTratamiento`, la misma entidad que ya crea/edita/elimina la tabla "Plan de
tratamiento" del tab Odontograma. No se crea una entidad `PlanTratamiento`/`Registro` nueva.

**Racional**: El spec (Assumptions) es explícito: la pestaña Planes no agrega ningún punto de
creación — es la misma línea, vista desde otro lado. Modelarla como una entidad distinta
obligaría a decidir cómo mantenerla sincronizada con el origen (¿espejo? ¿referencia?), un
problema que no existe si es literalmente la misma fila de la misma tabla. Consistente con
Principio V (YAGNI): no hay ningún requisito que pida que "Planes" tenga un ciclo de vida
propio.

**Alternativas consideradas**: Tabla `PlanTratamientoSeguimiento` con FK a `ItemPlanTratamiento`
(separando "qué se planeó" de "qué se hizo") — se descartó porque el spec pide expresamente
que editar/eliminar desde Odontograma se refleje sin ninguna sincronización manual (Edge
Cases), lo que una segunda tabla haría trivialmente romper apenas alguien tocara una sin
tocar la otra.

## #2 — "Planes Realizados" es un filtro en memoria, no una segunda consulta ni tabla

**Decisión**: `PlanesTab.tsx` hace una sola llamada a `listarPorPaciente` (ya existente) y
deriva ambas vistas de ese mismo array — "Todos los planes" sin filtrar, "Planes Realizados"
con `.filter(item => item.fechaRealizado !== null)`.

**Racional**: El spec (FR-009) es explícito: "derivada de la misma fuente de datos... no una
copia ni una entidad separada". Una segunda consulta (aunque fuera a la misma tabla) abriría
una ventana, por chica que sea, donde ambas vistas podrían mostrar datos de momentos
distintos tras una edición — un filtro sobre el mismo resultado ya en memoria no tiene esa
ventana por construcción.

**Alternativas consideradas**: Ninguna real — dado FR-009, la única alternativa (segunda
consulta filtrada por `fechaRealizado IS NOT NULL`) se descartó por la razón de arriba, no
por rendimiento (research.md #9 de 006-odontograma ya estableció que `listarPorPaciente` es
barato).

## #3 — Dos casos de uso nuevos y angostos, no reutilizar `editarItemPlanTratamiento` desde Planes

**Decisión**: `marcarRealizadoItemPlanTratamiento(repo, id, realizado, baseVersion)` y
`editarNotaItemPlanTratamiento(repo, id, nota, baseVersion)` son casos de uso nuevos, con
firma que solo acepta su campo correspondiente — no el objeto de edición completo
(`fecha`/`diente`/`tratamiento`/`fechaRealizado`/`nota`) que ya usa `editarItemPlanTratamiento`
desde Odontograma.

**Racional**: FR-010 del spec exige que la pestaña Planes no pueda tocar fecha, diente,
tratamiento, ni eliminar. Principio III pide que esa validación viva "en la frontera de
dominio/caso de uso, no solo en la UI". Si `PlanesTab.tsx` llamara al mismo
`editarItemPlanTratamiento` genérico que usa Odontograma, la única barrera contra un futuro
bug de UI que reenviara `tratamiento` sería "nadie lo programó todavía" — con una firma que
estructuralmente no acepta esos campos, ese bug ni compila.

**Alternativas consideradas**: Un único caso de uso `actualizarSeguimientoItemPlanTratamiento`
con ambos campos opcionales (`nota`, `realizado`) a la vez — se descartó por ser marginalmente
más "conveniente" pero sin ningún requisito que pida guardarlos juntos en una sola operación
(el checkbox y la nota se editan en momentos distintos, con distintos disparadores en la UI:
clic vs. blur de un campo de texto); dos funciones angostas son más simples de leer y de
testear en aislamiento (Principio V).

## #4 — `fechaRealizado` no tiene ningún control de escritura directa — solo la deriva el checkbox

**Decisión**: No existe, en ningún nivel (UI, caso de uso, schema), una forma de setear
`fechaRealizado` a un valor elegido por el usuario. `marcarRealizadoItemPlanTratamiento` recibe
un booleano `realizado`; si es `true` fija `fechaRealizado` a la fecha del día del lado del
caso de uso (no la manda el cliente como dato libre), si es `false` la limpia a `null`.

**Racional**: El spec (FR-007, Assumptions) es explícito: "no se contempla un selector manual
de fecha de realización". Calcular la fecha del lado del caso de uso (no recibirla como
parámetro) es lo que hace imposible, no solo no-ofrecido-en-la-UI, que alguien backdatee un
plan.

**Alternativas consideradas**: Recibir `fechaRealizado` como parámetro opcional (fecha elegida
o "hoy" por defecto) — se descartó por ir en contra de la Assumption explícita del spec; queda
documentado acá para no reabrir la discusión si en una futura iteración se pide backdatear.

## #5 — Checkbox y Nota: guardado inmediato, fuera del modelo de borrador de 006-odontograma

**Decisión**: `marcarRealizadoItemPlanTratamiento`/`editarNotaItemPlanTratamiento` se llaman
directamente al interactuar (clic del checkbox, blur del campo de nota) — no pasan por
ningún estado de borrador en memoria ni requieren un botón "Guardar cambios"/"Cancelar".

**Racional**: El modelo de borrador de 006-odontograma (research previo de esa feature,
revisión posterior sobre guardado diferido) existe específicamente porque marcar un hallazgo
clínico en el diagrama es una decisión que puede necesitar revisarse antes de confirmarse. El
spec de esta feature (Assumptions) es explícito en que tildar "realizado" o aclarar una nota
es de bajo riesgo comparado con eso, y pide guardado inmediato — igual criterio que
`onCambiarEstado` ya tenía en Odontograma antes de la revisión de guardado diferido, que sigue
existiendo sin cambios para el resto de las ediciones de hallazgos.

**Alternativas consideradas**: Sumar Planes al mismo borrador/"Guardar cambios" de Odontograma
— se descartó explícitamente por el usuario del sistema (conversación de diseño previa a esta
spec) por ser fricción desproporcionada a el riesgo real de la acción.

## #6 — Sin bump de `version()` en el esquema de Dexie

**Decisión**: `fechaRealizado` y `nota` se agregan como propiedades del objeto
`ItemPlanTratamiento` guardado en IndexedDB, sin declararlas en el índice de la tabla
`itemsPlanTratamiento` (`"id, pacienteId, fecha"`, sin cambios) ni crear una `version()` nueva
en `db.ts`.

**Racional**: Dexie no exige declarar en el índice los campos que no se consultan con
`.where()` — ningún caso de uso de esta feature filtra/ordena por `fechaRealizado` ni `nota`
a nivel de IndexedDB (research.md #2: el filtro de "Planes Realizados" es en memoria, sobre el
resultado ya traído por `pacienteId`). Agregar una `version()` nueva sin necesidad real violaría
Principio V.

**Alternativas consideradas**: Indexar `fechaRealizado` para poder consultar "realizados"
directo contra IndexedDB — se descartó porque research.md #2 ya fijó que ambas vistas
comparten una sola consulta en memoria; indexar sin un caso de uso que lo pida es
especulativo.
