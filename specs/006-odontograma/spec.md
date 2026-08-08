# Feature Specification: Odontograma

**Feature Branch**: `006-odontograma`

**Created**: 2026-08-01

**Status**: Draft

**Input**: User description: "Odontograma: reemplazar el placeholder deshabilitado 'Odontograma' (tab, hoy fuera de alcance) de 005-atencion-paciente por la funcionalidad real. Gráfico dental interactivo por paciente que muestra su estado bucal actual y permite registrar hallazgos clínicos por diente, con catálogo de 44 condiciones en 8 categorías, dentición adulto/niño, historial de cambios visible, y una tabla de plan de tratamiento que reemplaza el campo de texto libre equivalente en 005-atencion-paciente."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Registrar un hallazgo en el odontograma (Priority: P1)

El odontólogo abre el tab "Odontograma" de un paciente, ve el diagrama de boca completa (arcada superior e inferior) para la dentición correspondiente, hace clic en un diente o en una de sus superficies, elige una condición del catálogo categorizado que aparece en un modal, y la condición queda marcada de inmediato en el diagrama con su símbolo y color estándar, como parte del estado bucal actual del paciente.

**Why this priority**: Es la razón de ser de la feature — sin poder registrar hallazgos, el odontograma es solo un dibujo decorativo. Sin esto no hay MVP.

**Independent Test**: Puede probarse por completo abriendo el tab Odontograma de un paciente, marcando al menos una condición sobre un diente, y verificando que queda reflejada visualmente y persiste al recargar la página.

**Acceptance Scenarios**:

1. **Given** el tab Odontograma abierto para un paciente sin hallazgos previos, **When** el odontólogo hace clic sobre un diente completo y selecciona "Ausente" del catálogo, **Then** el diente queda marcado con una X azul y el hallazgo se guarda como parte del estado actual.
2. **Given** el tab Odontograma abierto, **When** el odontólogo hace clic sobre una superficie específica de un diente (por ejemplo, la cara oclusal) y selecciona "Caries", **Then** solo esa superficie queda marcada, sin afectar las otras 4 superficies del mismo diente.
3. **Given** un hallazgo que admite variante (por ejemplo "Exudado"), **When** el odontólogo lo selecciona del catálogo, **Then** el sistema le pide elegir la variante correspondiente (Purulento/Hemorrágico) antes de confirmar.
4. **Given** un hallazgo que abarca más de un diente (por ejemplo "Puente fijo"), **When** el odontólogo lo selecciona y elige los dientes pilares, **Then** el símbolo se dibuja abarcando el tramo completo entre esos dientes.
5. **Given** cualquier hallazgo del catálogo, **When** el odontólogo lo confirma, **Then** puede opcionalmente agregar una nota de texto libre asociada a ese hallazgo específico.

---

### User Story 2 - Alternar entre dentición Adulto y Niño (Priority: P1)

El odontólogo alterna entre dos pestañas — Adulto (numeración FDI 11-48) y Niño (numeración FDI 51-85) — cada una mostrando el diagrama y los hallazgos correspondientes a esa dentición, de forma independiente.

**Why this priority**: Sin esto, el odontograma no sirve para pacientes pediátricos, que son parte normal de la práctica. Es tan esencial como el registro de hallazgos mismo.

**Independent Test**: Puede probarse abriendo el tab Odontograma de un paciente, marcando un hallazgo en la vista Adulto, cambiando a la vista Niño, marcando un hallazgo distinto ahí, y verificando que ambas vistas conservan sus propios datos sin mezclarse.

**Acceptance Scenarios**:

1. **Given** el tab Odontograma abierto en la vista Adulto con hallazgos ya marcados, **When** el odontólogo cambia a la pestaña Niño, **Then** ve el diagrama de dentición temporal (numeración 51-85), vacío o con sus propios hallazgos previos, sin ningún dato de la vista Adulto.
2. **Given** una condición exclusiva de dentición infantil (Pulpotomía o Pulpectomía), **When** el odontólogo está en la vista Adulto, **Then** esa condición no aparece disponible en el catálogo.
3. **Given** hallazgos ya registrados en ambas vistas, **When** el odontólogo vuelve a abrir la ficha del paciente en otro momento, **Then** ambas vistas conservan exactamente los hallazgos que tenían.

---

### User Story 3 - Corregir un hallazgo ya registrado (Priority: P2)

El odontólogo edita o elimina un hallazgo previamente marcado, por ejemplo porque se equivocó de condición o de diente, o porque el estado cambió (de "por realizar" a "realizado").

**Why this priority**: Los errores de carga son inevitables; sin poder corregir, un error queda pegado permanentemente en el registro clínico del paciente.

**Independent Test**: Puede probarse marcando un hallazgo, luego editándolo o eliminándolo, y verificando que el diagrama refleja el cambio.

**Acceptance Scenarios**:

1. **Given** un hallazgo ya marcado en un diente, **When** el odontólogo hace clic sobre ese mismo diente/superficie, **Then** puede ver el hallazgo existente y elegir editarlo o eliminarlo.
2. **Given** un hallazgo con estado "por realizar" (rojo), **When** el tratamiento se completa, **Then** el odontólogo puede cambiar su estado a "realizado" (azul) sin tener que eliminar y volver a crear el hallazgo.

---

### User Story 4 - Consultar el historial de cambios (Priority: P2)

El odontólogo abre una vista de solo lectura tipo línea de tiempo, dentro del tab Odontograma, que lista cronológicamente cada cambio realizado (qué diente/superficie, qué cambió, cuándo).

**Why this priority**: Da valor clínico real (saber cuándo se hizo cada cosa) y cumple el principio de auditabilidad del proyecto, pero no bloquea el uso básico de marcar hallazgos.

**Independent Test**: Puede probarse marcando, editando y eliminando algunos hallazgos, abriendo la vista de historial, y verificando que cada acción aparece listada con su fecha.

**Acceptance Scenarios**:

1. **Given** varios hallazgos marcados, editados y eliminados a lo largo del tiempo, **When** el odontólogo abre el historial de cambios, **Then** ve cada evento ordenado del más reciente al más antiguo, con diente, superficie (si aplica) y qué cambió.
2. **Given** un paciente sin ningún cambio registrado todavía, **When** el odontólogo abre el historial, **Then** el sistema indica claramente que no hay cambios, no una lista vacía sin explicación.

---

### User Story 5 - Registrar el plan de tratamiento (Priority: P2)

El odontólogo agrega líneas a una tabla de plan de tratamiento dentro del tab Odontograma, cada una con fecha, diente y tratamiento ejecutado.

**Why this priority**: Reemplaza una funcionalidad que ya existía (el campo de texto libre en 005-atencion-paciente), así que tiene valor propio pero no es tan crítico como poder marcar hallazgos en el diagrama.

**Independent Test**: Puede probarse agregando una línea a la tabla con fecha, diente y tratamiento, y verificando que persiste y aparece listada.

**Acceptance Scenarios**:

1. **Given** el tab Odontograma abierto, **When** el odontólogo agrega una línea con fecha, diente y descripción del tratamiento ejecutado, **Then** la línea se guarda y aparece en la tabla.
2. **Given** varias líneas ya cargadas, **When** el odontólogo necesita corregir una, **Then** puede editarla o eliminarla.
3. **Given** la pestaña Diagnóstico de la Atención de un paciente (005-atencion-paciente), **When** el odontólogo la abre después de esta feature, **Then** el campo de texto libre "Plan de tratamiento" ya no existe ahí.

---

### User Story 6 - Consultar la leyenda de símbolos (Priority: P3)

El odontólogo abre una leyenda de referencia, accesible desde el panel de herramientas, que lista cada una de las 44 condiciones del catálogo con su símbolo y color, organizada por categoría.

**Why this priority**: Es una ayuda de referencia — útil especialmente al principio, pero el catálogo ya es autoexplicativo dentro del propio modal de selección, así que no bloquea el uso diario una vez que el odontólogo memoriza los símbolos que más usa.

**Independent Test**: Puede probarse abriendo la leyenda y verificando que lista las 44 condiciones agrupadas en las 8 categorías, cada una con su símbolo y color.

**Acceptance Scenarios**:

1. **Given** el panel de herramientas del Odontograma, **When** el odontólogo abre la leyenda, **Then** ve las 8 categorías, cada una desplegable, listando sus condiciones con símbolo y color.

---

### Edge Cases

- ¿Qué pasa si se marcan dos hallazgos superpuestos en el mismo diente/superficie (por ejemplo, "Caries" y luego "Restauración" en el mismo lugar)? El sistema permite que ambos coexistan; corresponde al odontólogo eliminar el hallazgo que ya no aplica (User Story 3), no hay reemplazo automático.
- ¿Qué pasa si se intenta marcar una condición exclusiva de dentición Niño (Pulpotomía/Pulpectomía) estando en la vista Adulto? No aparece disponible en el catálogo de esa vista.
- ¿Qué pasa si el paciente está archivado? El tab Odontograma se muestra en modo solo lectura, sin poder agregar, editar ni eliminar hallazgos ni líneas del plan de tratamiento — misma restricción que ya aplica en 001-gestion-pacientes.
- ¿Qué pasa si no hay conexión a internet? El odontograma funciona con normalidad, igual que el resto del sistema (local-first) — a diferencia de los adjuntos de estudios en 005-atencion-paciente, aquí no hay ninguna excepción de conectividad.
- ¿Qué pasa si se agrega una línea de plan de tratamiento que no corresponde a un diente específico (por ejemplo, una limpieza general)? El campo diente puede quedar vacío.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST mostrar, dentro del tab "Odontograma" del panel de Atención de un paciente, el estado bucal actual del paciente como un diagrama de boca completa (arcada superior e inferior), reemplazando el placeholder deshabilitado que existe hoy en 005-atencion-paciente.
- **FR-002**: El sistema MUST permitir alternar entre dos vistas de dentición — Adulto (numeración FDI 11-48) y Niño (numeración FDI 51-85) — cada una con su propio conjunto de hallazgos, conservado de forma independiente para el mismo paciente.
- **FR-003**: El sistema MUST permitir hacer clic en un diente completo o en una de sus 5 superficies (mesial, distal, vestibular, palatino/lingual, oclusal/incisal) para abrir un catálogo de condiciones clínicas.
- **FR-004**: El sistema MUST ofrecer un catálogo cerrado de 44 condiciones organizadas en 8 categorías colapsables (Ausencia/Extracción, Patología, Restauraciones, Desgaste de superficie, Endodoncia, Prótesis, Posición y anomalías, Ortodoncia), cada una con su símbolo y color definidos (ver Key Entities).
- **FR-005**: El sistema MUST aplicar la convención de color rojo = pendiente/planificado y azul = realizado/presente en las condiciones de tratamiento que la admitan.
- **FR-006**: El sistema MUST persistir cada hallazgo marcado como parte del estado bucal actual del paciente para esa dentición (no versionado por cita/visita), reflejándose de inmediato en el diagrama al confirmarse.
- **FR-007**: El sistema MUST permitir agregar una nota de texto libre opcional a cada hallazgo registrado.
- **FR-008**: El sistema MUST permitir editar o eliminar un hallazgo previamente registrado, incluido cambiar su estado de color (pendiente/realizado) sin necesidad de eliminarlo y volver a crearlo.
- **FR-009**: El sistema MUST registrar internamente un historial de auditoría de cada cambio al odontograma (qué cambió, en qué diente/superficie, cuándo), independientemente de que el diagrama solo muestre el estado vigente.
- **FR-010**: El sistema MUST exponer ese historial al odontólogo como una vista de solo lectura tipo línea de tiempo, accesible desde el propio tab Odontograma, ordenada del cambio más reciente al más antiguo.
- **FR-011**: El sistema MUST ofrecer una leyenda de referencia, accesible desde el panel de herramientas, que liste las 44 condiciones del catálogo con su símbolo y color, organizada por las mismas 8 categorías.
- **FR-012**: Las condiciones "Pulpotomía" y "Pulpectomía" MUST estar disponibles únicamente en la vista de dentición Niño.
- **FR-013**: Las condiciones "Puente fijo", "Prótesis removible", "Edentulismo" y "Fusión" MUST permitir seleccionar/abarcar más de un diente en una sola marca.
- **FR-014**: El sistema MUST permitir registrar la variante correspondiente al marcar la condición "Exudado" (Purulento u Hemorrágico).
- **FR-015**: El sistema MUST permitir registrar la variante correspondiente al marcar la condición "Corona" (Definitiva o Temporal).
- **FR-016**: El sistema MUST permitir registrar, dentro del tab Odontograma, líneas de un plan de tratamiento estructurado con los campos fecha, elemento dentario (diente, opcional) y tratamiento ejecutado, y permitir editarlas o eliminarlas.
- **FR-017**: El sistema MUST eliminar el campo de texto libre "Plan de tratamiento" de la pestaña Diagnóstico de la feature 005-atencion-paciente, dado que su función se traslada a la tabla estructurada de FR-016.
- **FR-018**: El odontograma MUST funcionar completamente offline (local-first), igual que el resto del sistema, sin ninguna de las excepciones de conectividad documentadas en 005-atencion-paciente para adjuntos de estudios.
- **FR-019**: El tab Odontograma MUST respetar la misma restricción de solo-lectura que ya aplica a pacientes archivados en 001-gestion-pacientes — no se permite agregar, editar ni eliminar hallazgos ni líneas del plan de tratamiento en un paciente archivado.
- **FR-020**: El sistema MUST permitir que dos o más hallazgos coexistan sobre el mismo diente/superficie sin reemplazo automático; la eliminación de un hallazgo obsoleto es una acción manual del odontólogo (FR-008).

### Key Entities *(include if feature involves data)*

- **Odontograma**: representa el estado bucal actual de un paciente para una dentición específica (Adulto o Niño). Un mismo paciente tiene hasta dos odontogramas independientes (uno por dentición), cada uno con su propia colección de hallazgos vigentes.
- **Hallazgo dental**: un hallazgo/condición marcado en uno o más dientes o en una superficie específica. Atributos: condición (referencia al catálogo), diente(s) afectado(s) por número FDI, superficie afectada (si aplica: mesial/distal/vestibular/palatino-lingual/oclusal-incisal, o "diente completo"), variante (si la condición la requiere, ej. Purulento/Hemorrágico, Definitiva/Temporal), estado de color (pendiente/realizado, si la condición lo admite), nota de texto libre opcional, fecha del último cambio.
- **Condición del catálogo**: entrada fija y predefinida (44 en total) — nombre, categoría (una de 8), símbolo visual, color(es) posibles, si aplica a diente completo, superficie, o múltiples dientes, y si es exclusiva de la dentición Niño. No editable por el usuario en esta versión.
- **Cambio de odontograma (registro de auditoría)**: entrada del historial de cambios — tipo de cambio (agregado/editado/eliminado), diente/superficie afectado, descripción del cambio, fecha y hora.
- **Ítem de plan de tratamiento**: línea de la tabla de plan de tratamiento — fecha, diente (opcional), descripción del tratamiento ejecutado.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El odontólogo puede marcar un hallazgo sobre un diente, desde el clic inicial hasta verlo reflejado en el diagrama, en menos de 15 segundos.
- **SC-002**: Las 44 condiciones del catálogo son accesibles sin scroll excesivo, gracias a que las 8 categorías se pueden expandir y colapsar de forma independiente.
- **SC-003**: El odontólogo puede distinguir, con solo mirar el diagrama y sin abrir ningún modal, si un hallazgo está pendiente o ya realizado, gracias al código de color rojo/azul.
- **SC-004**: El odontólogo puede ubicar cuándo se registró un hallazgo específico consultando el historial de cambios, sin salir del tab Odontograma.
- **SC-005**: Cambiar entre las vistas de dentición Adulto y Niño nunca provoca pérdida ni mezcla de los datos de ninguna de las dos vistas.
- **SC-006**: El odontólogo puede cargar una línea de plan de tratamiento (fecha, diente, tratamiento) en menos de 30 segundos.
- **SC-007**: El odontograma es completamente utilizable sin conexión a internet, igual que el resto del sistema.

## Assumptions

- El catálogo de 44 condiciones es fijo y cerrado para esta versión; ampliarlo (agregar una condición nueva) requeriría una iteración futura, no es configurable por el usuario.
- Cuando dos hallazgos se superponen en el mismo diente/superficie, el sistema permite que coexistan visualmente; no hay reemplazo ni resolución automática — es responsabilidad del odontólogo eliminar el hallazgo obsoleto manualmente.
- Un mismo paciente puede tener datos de odontograma en ambas denticiones (Adulto y Niño) conservados de forma independiente y simultánea, de modo que el historial de un paciente atendido de niño no se pierde al pasar a usar la vista Adulto en la adultez.
- La dentición mixta (dientes temporales y permanentes presentes a la vez en la boca) queda explícitamente fuera de alcance de esta versión — solo se soportan las dos vistas binarias Adulto/Niño.
- El periodontograma (mediciones de bolsillos periodontales, movilidad dentaria, sangrado, recesión gingival) queda explícitamente fuera de alcance de esta feature — es una herramienta clínica distinta, con mediciones numéricas por sitio en vez de íconos por diente; será una especificación futura separada, ya conversada y confirmada con la odontóloga.
- No se implementa captura de firma digital (del odontólogo ni del paciente) en el plan de tratamiento en esta versión.
- El campo de texto libre "Plan de tratamiento" de la pestaña Diagnóstico de 005-atencion-paciente se elimina como parte de esta feature; su función se traslada por completo a la tabla estructurada del tab Odontograma.
- Multi-usuario y portal de pacientes siguen fuera de alcance, igual que en el resto de las specs del proyecto.
