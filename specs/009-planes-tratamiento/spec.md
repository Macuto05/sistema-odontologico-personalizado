# Feature Specification: Planes de tratamiento

**Feature Branch**: `009-planes-tratamiento`

**Created**: 2026-08-05

**Status**: Draft

**Input**: User description: "Habilitar la pestaña 'Planes' (hoy deshabilitada/placeholder) en la ficha del paciente, para gestionar el plan de tratamiento que ya se crea hoy en el tab Odontograma. El origen de cada línea sigue siendo la tabla 'Plan de tratamiento' del tab Odontograma (crear/editar/eliminar, persistencia diferida vía 'Guardar cambios' de 006-odontograma) — esa tabla no cambia. Una vez guardada, cada línea aparece en la nueva pestaña 'Planes', que muestra la misma lista de datos en dos vistas: 'Todos los planes' (con columnas Fecha de creación, Elemento dentario, Tratamiento, Fecha en que se realizó, Nota, y un checkbox 'Realizado') y 'Planes Realizados' (la misma lista filtrada a los marcados como realizados — no una entidad ni tabla separada). Desde Planes solo son editables Nota y el checkbox; ni Fecha/Diente/Tratamiento ni eliminar, eso sigue siendo exclusivo de Odontograma. El checkbox y la Nota se guardan de inmediato, sin pasar por el modelo de borrador/'Guardar cambios'. Requiere agregar los campos fechaRealizado y nota a la entidad ItemPlanTratamiento."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consultar el registro consolidado de planes de tratamiento (Priority: P1)

La odontóloga abre la pestaña "Planes" de la ficha de un paciente y ve, en una sola tabla, todas las líneas de plan de tratamiento que cargó previamente desde cualquier tab Odontograma de ese paciente (tanto desde la ficha como desde cualquier Cita), con su fecha de creación, elemento dentario, tratamiento, fecha en que se realizó (si aplica) y nota.

**Why this priority**: Es la razón de ser de la feature — sin una vista consolidada, el plan de tratamiento queda disperso y solo visible línea por línea dentro de cada sesión de Odontograma. Sin esto no hay MVP.

**Independent Test**: Puede probarse cargando una línea de plan de tratamiento desde el tab Odontograma, guardando los cambios, y verificando que esa línea aparece en la pestaña Planes con los mismos datos.

**Acceptance Scenarios**:

1. **Given** un paciente con líneas de plan de tratamiento ya guardadas en Odontograma, **When** la odontóloga abre la pestaña Planes, **Then** ve todas esas líneas listadas en una tabla, con fecha de creación, elemento dentario y tratamiento.
2. **Given** una línea de plan de tratamiento recién cargada y guardada en Odontograma ("Guardar cambios"), **When** la odontóloga abre o refresca la pestaña Planes, **Then** la nueva línea aparece en el registro.
3. **Given** una línea de plan de tratamiento cargada en Odontograma pero todavía no guardada (borrador sin confirmar), **When** la odontóloga abre la pestaña Planes, **Then** esa línea NO aparece todavía — solo lo ya guardado se refleja acá.
4. **Given** un paciente sin ninguna línea de plan de tratamiento cargada, **When** la odontóloga abre la pestaña Planes, **Then** el sistema indica claramente que no hay planes registrados, no una tabla vacía sin contexto.

---

### User Story 2 - Marcar un plan de tratamiento como realizado (Priority: P1)

La odontóloga marca el checkbox "Realizado" de una línea del plan de tratamiento el día que efectivamente lo ejecuta, y el sistema completa automáticamente la fecha de realización con la fecha actual.

**Why this priority**: Es el segundo pilar de la feature — sin poder marcar qué se hizo y cuándo, la pestaña Planes es solo una copia de lectura de Odontograma, sin valor de seguimiento propio.

**Independent Test**: Puede probarse marcando el checkbox de una línea y verificando que la fecha de realización se completa con la fecha del día, persiste al recargar la página, y desmarcando el checkbox se limpia esa fecha.

**Acceptance Scenarios**:

1. **Given** una línea de plan de tratamiento sin realizar (checkbox destildado, sin fecha de realización), **When** la odontóloga tilda el checkbox "Realizado", **Then** el sistema completa la fecha de realización con la fecha actual de inmediato, sin pasos adicionales.
2. **Given** una línea ya marcada como realizada, **When** la odontóloga destilda el checkbox, **Then** la fecha de realización vuelve a quedar vacía y la línea deja de considerarse realizada.
3. **Given** una línea recién marcada como realizada, **When** la odontóloga recarga la página, **Then** el checkbox sigue tildado y la fecha de realización sigue guardada — no depende de ningún botón de "Guardar cambios" aparte.

---

### User Story 3 - Consultar solo los planes ya realizados (Priority: P2)

La odontóloga abre, dentro de la misma pestaña Planes, una segunda vista — "Planes Realizados" — que lista únicamente las líneas ya marcadas como realizadas, para revisar rápido el historial de tratamientos ejecutados sin tener que buscar entre los pendientes.

**Why this priority**: Da valor de seguimiento clínico (qué se hizo y cuándo) pero no bloquea el registro ni el marcado de planes, que ya funcionan sin esta vista.

**Independent Test**: Puede probarse marcando dos líneas como realizadas y dejando una tercera pendiente, y verificando que "Planes Realizados" lista solo las dos marcadas.

**Acceptance Scenarios**:

1. **Given** varias líneas de plan de tratamiento, algunas marcadas como realizadas y otras no, **When** la odontóloga mira "Planes Realizados", **Then** ve únicamente las marcadas, con su fecha de realización.
2. **Given** una línea marcada como realizada, **When** la odontóloga la desmarca desde "Todos los planes", **Then** esa línea desaparece de "Planes Realizados" de inmediato.
3. **Given** ningún plan marcado como realizado todavía, **When** la odontóloga abre "Planes Realizados", **Then** el sistema indica claramente que no hay planes realizados todavía.

---

### User Story 4 - Agregar una aclaración a un plan de tratamiento (Priority: P3)

La odontóloga escribe una nota libre sobre una línea del plan de tratamiento (por ejemplo, una observación sobre cómo se realizó, o por qué se pospuso), directamente desde la pestaña Planes.

**Why this priority**: Es una ayuda de contexto adicional — útil pero no bloquea el registro ni el seguimiento de qué está pendiente o realizado.

**Independent Test**: Puede probarse escribiendo una nota en una línea, sacando el foco del campo, y verificando que la nota persiste al recargar la página.

**Acceptance Scenarios**:

1. **Given** una línea de plan de tratamiento sin nota, **When** la odontóloga escribe una nota y saca el foco del campo, **Then** la nota se guarda de inmediato, sin necesidad de un botón de guardado aparte.
2. **Given** una línea con una nota ya cargada, **When** la odontóloga la modifica, **Then** la nueva nota reemplaza a la anterior al perder el foco del campo.

---

### Edge Cases

- ¿Qué pasa si se elimina una línea de plan de tratamiento desde el tab Odontograma (su único origen)? Desaparece también de ambas vistas de la pestaña Planes, porque leen la misma fuente de datos — no hay ninguna acción manual adicional que hacer en Planes.
- ¿Qué pasa si se edita la fecha, el elemento dentario o el tratamiento de una línea desde Odontograma después de haberla marcado como realizada o haberle agregado una nota? Los cambios se reflejan en Planes; la fecha de realización y la nota no se pierden ni se resetean, ya que son campos independientes de esos tres.
- ¿Qué pasa si se intenta editar el tratamiento, el diente o la fecha de creación, o eliminar una línea, desde la pestaña Planes? El sistema no lo permite — esas acciones son exclusivas del tab Odontograma.
- ¿Qué pasa si el paciente está archivado? La pestaña Planes se muestra en modo solo lectura, sin poder tildar el checkbox ni editar la nota — mismo criterio que ya aplica al resto del sistema para pacientes archivados.
- ¿Qué pasa si no hay conexión a internet? Consultar Planes, tildar el checkbox y editar la nota funcionan con normalidad, igual que el resto del sistema (local-first).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST mostrar una pestaña "Planes" en la ficha del paciente, habilitada (hoy es un placeholder deshabilitado).
- **FR-002**: El sistema MUST listar, en la pestaña Planes, todas las líneas de plan de tratamiento del paciente que ya fueron guardadas (persistidas) desde cualquier tab Odontograma, con las columnas: fecha de creación, elemento dentario, tratamiento, fecha en que se realizó (si aplica), nota, y un checkbox "Realizado".
- **FR-003**: El sistema MUST NOT mostrar en la pestaña Planes ninguna línea que todavía esté en borrador sin guardar en el tab Odontograma (FR-006 de 006-odontograma) — solo lo ya persistido.
- **FR-004**: El sistema MUST permitir tildar/destildar el checkbox "Realizado" de una línea desde la pestaña Planes, y persistir ese cambio de inmediato, sin depender de ningún flujo de guardado diferido.
- **FR-005**: Al tildar el checkbox "Realizado", el sistema MUST completar automáticamente la fecha de realización de esa línea con la fecha actual.
- **FR-006**: Al destildar el checkbox "Realizado", el sistema MUST vaciar la fecha de realización de esa línea.
- **FR-007**: La fecha de realización MUST ser de solo lectura salvo a través del checkbox — el sistema no ofrece ningún control para escribirla o elegirla manualmente.
- **FR-008**: El sistema MUST permitir escribir/editar una nota de texto libre por línea desde la pestaña Planes, y persistir ese cambio de inmediato al perder el foco del campo, sin depender de ningún flujo de guardado diferido.
- **FR-009**: El sistema MUST ofrecer, dentro de la pestaña Planes, una segunda vista "Planes Realizados" que lista únicamente las líneas con el checkbox "Realizado" tildado, derivada de la misma fuente de datos que "Todos los planes" (no una copia ni una entidad separada) — cualquier cambio (edición, eliminación desde Odontograma, marcado/desmarcado) se refleja en ambas vistas sin ninguna sincronización manual.
- **FR-010**: El sistema MUST impedir editar la fecha de creación, el elemento dentario, el tratamiento, o eliminar una línea, desde la pestaña Planes — esas acciones siguen siendo exclusivas del tab Odontograma (FR-016 de 006-odontograma).
- **FR-011**: El tab Odontograma y su tabla "Plan de tratamiento" MUST mantenerse sin cambios de comportamiento ni de columnas — sigue siendo el único punto de creación, edición completa y eliminación.
- **FR-012**: La pestaña Planes MUST respetar la misma restricción de solo-lectura que ya aplica a pacientes archivados en el resto del sistema — no se permite tildar el checkbox ni editar la nota en un paciente archivado.
- **FR-013**: La pestaña Planes MUST funcionar completamente offline (local-first), igual que el resto del sistema.

### Key Entities *(include if feature involves data)*

- **Ítem de plan de tratamiento** (entidad existente de 006-odontograma, extendida): además de fecha de creación, elemento dentario (opcional) y tratamiento ejecutado, incorpora dos atributos nuevos — fecha de realización (opcional; se completa/vacía únicamente a través del checkbox "Realizado", nunca a mano) y nota (texto libre opcional). El origen de cada ítem sigue siendo exclusivamente el tab Odontograma; la pestaña Planes lee y puede actualizar únicamente sus dos atributos nuevos.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: La odontóloga puede ver el registro completo de planes de tratamiento de un paciente, con todos sus datos, sin salir de una única pestaña.
- **SC-002**: Marcar un plan de tratamiento como realizado toma un solo clic, con la fecha de realización reflejada de inmediato, sin pasos adicionales.
- **SC-003**: La odontóloga puede distinguir, con solo mirar la pestaña Planes, cuáles tratamientos están pendientes y cuáles ya se realizaron, sin tener que abrir ningún otro tab.
- **SC-004**: Ubicar únicamente los tratamientos ya realizados de un paciente no requiere revisar manualmente la lista completa de planes.
- **SC-005**: Ninguna acción realizada en la pestaña Planes (marcar realizado, editar nota) puede alterar ni eliminar accidentalmente el tratamiento, el diente o la fecha de creación de una línea.

## Assumptions

- Esta feature depende de 006-odontograma: reutiliza la entidad "Ítem de plan de tratamiento" y su único punto de creación/edición/eliminación (la tabla "Plan de tratamiento" del tab Odontograma), que no se modifica.
- "Todos los planes" y "Planes Realizados" son dos vistas (una filtrada) de la misma consulta de datos, no dos tablas ni entidades independientes — así se evita cualquier posibilidad de que queden desincronizadas entre sí.
- Marcar el checkbox "Realizado" y editar la Nota son acciones de bajo riesgo clínico (a diferencia de marcar un hallazgo en el odontograma) y por eso se guardan de inmediato, sin pasar por el modelo de borrador/"Guardar cambios" de 006-odontograma.
- No se agrega ninguna forma de crear, editar completamente ni eliminar líneas de plan de tratamiento desde la pestaña Planes — esas acciones siguen concentradas en Odontograma, para no duplicar el punto de entrada de datos.
- No se contempla un selector manual de fecha de realización — siempre es la fecha del día en que se tilda el checkbox.
- Multi-usuario y portal de pacientes siguen fuera de alcance, igual que en el resto de las specs del proyecto.
