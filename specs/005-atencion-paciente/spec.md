# Feature Specification: Atención de Paciente (Cita Clínica)

**Feature Branch**: `005-atencion-paciente`

**Created**: 2026-08-01

**Status**: Draft

**Input**: User description: "Atención de paciente (cita clínica): agregar a la ficha de cada
paciente (001-gestion-pacientes) un botón 'Nueva cita' / 'Atender paciente'. Al presionarlo,
el sistema abre de inmediato un panel de 'Atención' para trabajar esa consulta — esto NO es
un sistema de agenda/turnos a futuro: la atención se arma en el momento en que el odontólogo
va a atender al paciente, no se programa para una fecha posterior. El panel de Atención se
organiza en: Diagnóstico (motivo de consulta, diagnóstico, plan de tratamiento, categoría del
tipo de consulta), Receta médica/Prescripción, Estudios complementarios, Antecedentes
(historia clínica de 003-historia-clinica-paciente, mostrada y editable en el contexto de la
atención) y un placeholder deshabilitado para Odontograma. Tras discutir el diseño del panel,
se agregó además un panel lateral de Historial de citas anteriores, y se definió que una cita
se puede 'Finalizar', quedando de solo lectura salvo por la posibilidad de seguir adjuntando
archivos de resultado a sus estudios complementarios.

Revisión posterior (tras ver una primera versión funcionando): se decidió que la Cita (el
registro persistido) recién se crea al presionar 'Finalizar atención' — hasta ese momento,
todo lo cargado en Diagnóstico/Receta/Estudios es un borrador que vive solo en el navegador,
sin guardarse. 'Finalizar atención' pasa a ser la única acción que crea y guarda todo junto
(ya no hay botones de guardado sueltos por sección, salvo Antecedentes, que sigue siendo un
dato del paciente con guardado propio e independiente). Se agrega también un botón para
volver a la ficha del paciente sin guardar nada, para cuando el odontólogo abrió el panel por
error."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Iniciar la atención de un paciente (Priority: P1)

Como odontólogo, cuando voy a atender a un paciente, quiero presionar un botón desde su
ficha para que el sistema me lleve de inmediato al panel donde voy a trabajar durante la
consulta, sin tener que programar nada con anticipación y sin que se cree ningún registro
todavía si termino sin usarlo.

**Why this priority**: Es el punto de entrada de toda la feature; sin el panel abierto no
existe dónde cargar diagnóstico, receta, estudios ni consultar antecedentes.

**Independent Test**: Se puede probar de forma aislada abriendo la ficha de un paciente
activo, presionando "Nueva cita" / "Atender paciente", y verificando que el panel de
Atención se abre inmediatamente en blanco (borrador), sin que se haya creado ningún
registro en la base de datos todavía.

**Acceptance Scenarios**:

1. **Given** la ficha de un paciente activo, **When** el odontólogo presiona "Nueva cita" /
   "Atender paciente", **Then** el sistema abre de inmediato el panel de Atención en modo
   borrador (vacío), sin crear ningún registro de Cita en ese momento.
2. **Given** el panel de Atención abierto en modo borrador, **When** el odontólogo presiona
   "Volver a la ficha" sin haber finalizado la atención, **Then** el sistema descarta
   cualquier dato cargado en el borrador y vuelve a la ficha del paciente sin haber creado
   ni guardado nada.
3. **Given** la ficha de un paciente archivado, **When** el odontólogo busca la opción de
   iniciar una atención, **Then** el sistema no la ofrece, consistente con la restricción ya
   existente de que un paciente archivado requiere reactivarse antes de poder operar sobre
   su ficha.

---

### User Story 2 - Registrar el diagnóstico de la consulta (Priority: P1)

Como odontólogo, durante la atención quiero registrar el motivo de la consulta, mi
diagnóstico, el plan de tratamiento y una categoría que clasifique el tipo de consulta, para
dejar constancia clínica de lo evaluado en ese encuentro.

**Why this priority**: Es el contenido clínico central de cualquier atención; sin esto la
atención queda vacía de valor médico aunque el resto del panel funcione.

**Independent Test**: Con el panel de Atención abierto en modo borrador, se puede probar de
forma aislada completando motivo de consulta, diagnóstico, plan de tratamiento y categoría,
finalizando la atención, y verificando que los cuatro datos quedan asociados a la Cita
creada.

**Acceptance Scenarios**:

1. **Given** el panel de Atención en modo borrador, **When** el odontólogo completa motivo
   de consulta, diagnóstico y/o plan de tratamiento como texto libre, **Then** el sistema
   conserva lo escrito en el borrador mientras el odontólogo sigue trabajando en el panel
   (sin persistirlo todavía, ver User Story 6).
2. **Given** el panel de Atención en modo borrador, **When** el odontólogo selecciona una
   categoría del tipo de consulta (por ejemplo Control, Urgencia, Limpieza/Profilaxis,
   Endodoncia), **Then** el sistema conserva esa categoría en el borrador junto con el resto
   del diagnóstico.
3. **Given** el panel de Atención en modo borrador, **When** el odontólogo deja motivo,
   diagnóstico o plan de tratamiento vacíos y finaliza la atención, **Then** el sistema lo
   permite — ninguno de estos campos es obligatorio.

---

### User Story 3 - Indicar receta médica (Priority: P2)

Como odontólogo, durante la atención quiero indicar los medicamentos que el paciente debe
consumir —cada uno con su dosis, frecuencia y duración—, para dejar una prescripción clara
asociada a esa consulta.

**Why this priority**: Aporta valor clínico real (la prescripción), pero depende de que ya
esté abierto el panel de Atención (US1) y no bloquea el resto del panel si no se usa en una
consulta que no requiere medicación.

**Independent Test**: Con el panel de Atención en modo borrador, se puede probar de forma
aislada agregando uno o más ítems de medicación (medicamento, dosis, frecuencia, duración),
quitando alguno, finalizando la atención, y verificando que la lista final queda asociada a
la Cita creada.

**Acceptance Scenarios**:

1. **Given** el panel de Atención en modo borrador, **When** el odontólogo agrega un ítem de
   receta con medicamento, dosis, frecuencia y duración, **Then** el sistema lo agrega a la
   lista de receta del borrador.
2. **Given** el borrador con uno o más ítems de receta ya cargados, **When** el odontólogo
   agrega otro ítem o quita uno existente, **Then** el sistema refleja la lista actualizada
   en el borrador.
3. **Given** el panel de Atención en modo borrador sin ningún ítem de receta cargado,
   **When** el odontólogo finaliza la atención así, **Then** el sistema lo permite — la
   receta puede quedar vacía si la consulta no requirió medicación.

---

### User Story 4 - Indicar estudios complementarios (Priority: P2)

Como odontólogo, durante la atención quiero dejar indicado qué exámenes o estudios debe
realizarse el paciente, para tener registro de lo solicitado y poder cargar después el
resultado cuando el paciente lo traiga o lo envíe.

**Why this priority**: Igual que la receta, aporta valor clínico real y depende de que ya
esté abierto el panel de Atención (US1); no bloquea el resto del panel.

**Independent Test**: Con el panel de Atención en modo borrador, se puede probar de forma
aislada agregando uno o más estudios solicitados (con su nombre/descripción), finalizando la
atención, y verificando que quedan asociados a la Cita creada.

**Acceptance Scenarios**:

1. **Given** el panel de Atención en modo borrador, **When** el odontólogo agrega un estudio
   complementario con su nombre o descripción (por ejemplo "Radiografía panorámica"),
   **Then** el sistema lo agrega a la lista de estudios solicitados del borrador.
2. **Given** el borrador con uno o más estudios cargados, **When** el odontólogo quita uno
   de la lista, **Then** el sistema lo elimina de los estudios del borrador.
3. **Given** el panel de Atención en modo borrador sin ningún estudio cargado, **When** el
   odontólogo finaliza la atención así, **Then** el sistema lo permite — los estudios pueden
   quedar vacíos si la consulta no los requirió. Adjuntar archivos a un estudio (User Story
   8) solo tiene sentido una vez que la Cita existe, es decir, después de finalizar.

---

### User Story 5 - Consultar y editar antecedentes durante la atención (Priority: P2)

Como odontólogo, durante la atención quiero ver la historia clínica del paciente
(antecedentes patológicos, heredofamiliares, medicamentos actuales, alergias) sin salir del
panel de Atención, y poder corregirla ahí mismo si detecto algo desactualizado, para decidir
el tratamiento con información completa y sin tener que ir a otra pantalla.

**Why this priority**: Es información de seguridad clínica (por ejemplo alergias antes de
prescribir) que debe estar disponible durante toda la atención; depende de que el panel esté
abierto (US1) pero es independiente de si se cargó diagnóstico, receta o estudios en el
borrador. A diferencia de esos tres, los Antecedentes son datos del **paciente** (no de la
Cita en borrador) y por eso se guardan de inmediato, con su propio botón de guardado, sin
esperar a "Finalizar atención".

**Independent Test**: Con el panel de Atención abierto (en modo borrador) para un paciente
que ya tiene historia clínica cargada (003-historia-clinica-paciente), se puede probar de
forma aislada abriendo la sección de Antecedentes, verificando que muestra esos datos,
editando alguno, guardando, y confirmando que el cambio se refleja tanto en el panel de
Atención como en la ficha del paciente — sin necesidad de finalizar la atención.

**Acceptance Scenarios**:

1. **Given** el panel de Atención abierto para un paciente con historia clínica ya cargada,
   **When** el odontólogo abre la sección de Antecedentes, **Then** el sistema muestra los
   antecedentes patológicos marcados, heredofamiliares, medicamentos actuales y alergias tal
   como están en la ficha del paciente.
2. **Given** la sección de Antecedentes abierta durante una atención, **When** el
   odontólogo modifica cualquiera de esos campos y guarda, **Then** el sistema guarda el
   cambio de inmediato en la historia clínica del paciente (no en el borrador de la Cita) y
   lo refleja también si se consulta la ficha del paciente fuera de la atención, incluso si
   el odontólogo nunca llega a finalizar (o directamente descarta) esa atención.
3. **Given** el panel de Atención en modo borrador, **When** el odontólogo abre la sección
   de Antecedentes y luego vuelve a Diagnóstico, Receta o Estudios, **Then** el sistema
   conserva lo que ya tenía cargado en el borrador de esas otras secciones sin pedirle que
   las complete de nuevo.

---

### User Story 6 - Finalizar la atención (Priority: P1)

Como odontólogo, cuando termino de atender al paciente, quiero presionar "Finalizar
atención" para que en ese momento se cree y guarde todo lo que cargué en el borrador
(diagnóstico, receta, estudios) de una sola vez, quedando registrado como un encuentro
clínico cerrado que no pueda modificarse por error más adelante.

**Why this priority**: Es la acción que efectivamente crea y persiste el registro de la
Cita — sin ella, nada de lo cargado en Diagnóstico, Receta o Estudios (US2 a US4) llega a
guardarse en ningún lado. Pasa de ser un paso de cierre opcional a ser el único punto de
guardado de toda la atención, por lo que sube de prioridad (P3 → P1).

**Independent Test**: Con el panel de Atención en modo borrador con algo cargado
(diagnóstico, receta y/o estudios, ninguno persistido todavía), se puede probar de forma
aislada finalizando la atención y verificando que se crea una Cita nueva con exactamente
esos datos, ya en estado finalizado/solo lectura.

**Acceptance Scenarios**:

1. **Given** el panel de Atención en modo borrador con datos cargados en Diagnóstico,
   Receta y/o Estudios, **When** el odontólogo presiona "Finalizar atención" y confirma,
   **Then** el sistema crea una Cita nueva afiliada al paciente con exactamente esos datos,
   ya en estado finalizado, de solo lectura.
2. **Given** una Cita ya finalizada (creada por el paso anterior), **When** el odontólogo
   intenta editar el motivo, diagnóstico, plan de tratamiento, categoría, receta o
   nombre/descripción de los estudios, **Then** el sistema lo impide y deja claro que la
   cita está finalizada.
3. **Given** el panel de Atención en modo borrador sin ningún dato cargado, **When** el
   odontólogo finaliza la atención igual, **Then** el sistema lo permite, creando una Cita
   sin hallazgos cargados en vez de exigir contenido mínimo.
4. **Given** una Cita ya finalizada, **When** el odontólogo la busca en el historial de
   citas del paciente, **Then** el sistema no ofrece ninguna acción para reabrirla, editarla
   o devolverla a un estado editable — es definitiva desde el momento en que se crea.

---

### User Story 7 - Consultar el historial de citas anteriores (Priority: P3)

Como odontólogo, durante una atención quiero ver rápidamente qué se hizo en consultas
anteriores de este paciente, para retomar el contexto sin tener que buscar en otro lado.

**Why this priority**: Aporta contexto valioso durante la atención, pero solo tiene datos
para mostrar una vez que existen citas finalizadas anteriores (depende de US1 y US6 haberse
completado antes, en atenciones previas).

**Independent Test**: Con un paciente que ya tiene una o más citas finalizadas, se puede
probar de forma aislada abriendo una atención nueva, desplegando el panel de Historial de
citas anteriores, y verificando que lista esas citas y que al abrir una se ve completa en
solo lectura.

**Acceptance Scenarios**:

1. **Given** un paciente con una o más citas finalizadas, **When** el odontólogo despliega
   el panel de Historial de citas anteriores durante una atención, **Then** el sistema
   muestra esas citas ordenadas de la más reciente a la más antigua, con al menos su fecha,
   categoría/motivo y diagnóstico resumido.
2. **Given** el panel de Historial de citas anteriores desplegado, **When** el odontólogo
   selecciona una de las citas listadas, **Then** el sistema muestra su diagnóstico, receta
   y estudios completos (incluidos los archivos adjuntos de los estudios) en modo solo
   lectura.
3. **Given** un paciente sin ninguna cita finalizada todavía, **When** el odontólogo
   despliega el panel de Historial de citas anteriores, **Then** el sistema indica
   claramente que no hay citas anteriores, sin error ni lista ambigua.
4. **Given** una atención que todavía está en modo borrador (sin finalizar, por lo tanto sin
   una Cita creada todavía), **When** el odontólogo consulta el Historial de citas
   anteriores en ese mismo panel, **Then** esa atención en curso no aparece en la lista — el
   historial muestra únicamente citas ya finalizadas, que son las únicas que llegan a
   existir como registro.

---

### User Story 8 - Adjuntar resultado a un estudio después de finalizada la cita (Priority: P4)

Como odontólogo, cuando el paciente me envía el resultado de un estudio que le pedí en una
consulta ya finalizada (por ejemplo una radiografía), quiero poder adjuntarlo a ese estudio
igual, para tener centralizado en el sistema todo lo relacionado con esa atención aunque el
resultado haya llegado después.

**Why this priority**: Es una excepción puntual y valiosa a la inmutabilidad de una cita
finalizada (US6), pero depende de que ya exista un estudio solicitado en una cita finalizada
(US4 y US6 completados antes) y no bloquea el resto de la feature si el resultado nunca
llega.

**Independent Test**: Con una cita finalizada que tiene al menos un estudio solicitado, y
con conexión a internet disponible, se puede probar de forma aislada adjuntando un archivo
de imagen o PDF a ese estudio y verificando que queda asociado a él y visible desde el
historial de citas.

**Acceptance Scenarios**:

1. **Given** una cita finalizada con un estudio solicitado y conexión a internet disponible,
   **When** el odontólogo adjunta un archivo de resultado (imagen o PDF) a ese estudio,
   **Then** el sistema lo guarda asociado a ese estudio sin necesidad de reabrir la cita.
2. **Given** un estudio con un archivo ya adjunto, **When** el odontólogo adjunta otro
   archivo más al mismo estudio, **Then** el sistema conserva ambos archivos asociados a ese
   estudio.
3. **Given** una cita finalizada y sin conexión a internet en ese momento, **When** el
   odontólogo intenta adjuntar un archivo a un estudio, **Then** el sistema le informa que
   esa acción requiere conexión y no lo deja avanzar, sin perder ni corromper el resto de la
   cita.
4. **Given** un archivo que no es imagen ni PDF, **When** el odontólogo intenta adjuntarlo a
   un estudio, **Then** el sistema rechaza el archivo e indica qué formatos acepta.

---

### Edge Cases

- ¿Qué sucede si el odontólogo cierra el panel de Atención (o el navegador) a mitad de una
  consulta sin finalizarla? Se pierde todo lo cargado en el borrador (motivo, diagnóstico,
  plan de tratamiento, categoría, receta, estudios) — es una consecuencia aceptada
  explícitamente de que nada se persiste hasta "Finalizar atención" (spec §Assumptions). No
  hay forma de retomar un borrador interrumpido; el odontólogo tiene que volver a cargarlo
  desde cero en una nueva atención. Los Antecedentes son la excepción: lo que se haya
  guardado ahí (User Story 5) no se pierde, porque se guarda de inmediato, no como parte del
  borrador.
- ¿Qué pasa si el odontólogo abre "Nueva cita" dos veces para el mismo paciente (por
  ejemplo, dos pestañas del navegador) y termina finalizando ambas? El sistema no intenta
  reconciliarlas ni impedirlo — cada borrador es independiente, y finalizar cada uno crea su
  propia Cita. Es responsabilidad del odontólogo no finalizar dos borradores que representan
  la misma consulta.
- ¿Qué pasa si se edita la historia clínica (Antecedentes) del paciente desde el panel de
  Atención mientras la atención todavía está en modo borrador, o después de finalizada?
  Los antecedentes pertenecen al paciente, no a la Cita puntual (son la misma historia
  clínica de 003-historia-clinica-paciente); siguen siendo editables con su propio guardado
  en cualquier momento, sin relación con el estado del borrador ni con que la Cita ya exista
  o esté finalizada.
- ¿Qué pasa si se pierde la conexión mientras se está subiendo un archivo adjunto a un
  estudio? El sistema informa que la carga no se completó y permite reintentarla cuando
  vuelva la conexión, sin dejar un archivo parcial o corrupto asociado al estudio.
- ¿Qué sucede si el paciente al que pertenece una cita se archiva después de que la cita ya
  fue finalizada? La cita finalizada y su historial permanecen accesibles igual que el resto
  de la ficha archivada; solo se restringe iniciar una atención *nueva* sobre ese paciente
  mientras esté archivado (User Story 1, escenario 3).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE mostrar en la ficha de cada paciente activo un botón "Nueva
  cita" / "Atender paciente"; ese botón NO DEBE estar disponible en la ficha de un paciente
  archivado.
- **FR-002**: Al presionar ese botón, el sistema DEBE abrir de inmediato el panel de
  Atención en modo borrador, sin crear ningún registro de Cita en ese momento.
- **FR-003**: El sistema NO DEBE intentar reconciliar ni reabrir un borrador anterior — cada
  vez que se presiona "Nueva cita" / "Atender paciente" se abre un panel de Atención en
  blanco (ver Edge Cases sobre borradores simultáneos).
- **FR-004**: El sistema NO DEBE incluir en esta feature ninguna forma de programar una cita
  para una fecha u hora futura — la Cita, cuando se crea (FR-014), se crea con la fecha/hora
  en que se finaliza la atención.
- **FR-005**: El panel de Atención DEBE permitir registrar, en el borrador, motivo de
  consulta (texto libre), diagnóstico (texto libre) y plan de tratamiento (texto libre),
  ninguno de los cuales es obligatorio.
- **FR-006**: El panel de Atención DEBE permitir clasificar el borrador con una categoría de
  tipo de consulta, elegida de un catálogo fijo: Control, Urgencia, Limpieza/Profilaxis,
  Endodoncia, Extracción, Restauración/Obturación, Ortodoncia, Cirugía, Consulta general y
  Otro. Esta categoría no es obligatoria.
- **FR-007**: El panel de Atención DEBE permitir agregar al borrador cero o más ítems de
  receta, cada uno con medicamento, dosis, frecuencia y duración como campos propios, más
  indicaciones adicionales opcionales en texto libre.
- **FR-008**: El sistema DEBE permitir quitar un ítem de receta ya agregado al borrador,
  mientras la atención no se haya finalizado.
- **FR-009**: El panel de Atención DEBE permitir agregar al borrador cero o más estudios
  complementarios solicitados, cada uno con un nombre o descripción en texto libre.
- **FR-010**: El sistema DEBE permitir quitar un estudio complementario ya agregado al
  borrador, mientras la atención no se haya finalizado.
- **FR-011**: El panel de Atención DEBE incluir una sección de Antecedentes que muestra y
  permite editar la misma historia clínica del paciente definida en
  003-historia-clinica-paciente (antecedentes patológicos, heredofamiliares, medicamentos
  actuales, alergias), sin introducir un modelo de datos separado o duplicado; cualquier
  cambio hecho ahí DEBE reflejarse también en la ficha del paciente fuera del panel de
  Atención.
- **FR-012**: La edición de Antecedentes desde el panel de Atención DEBE estar disponible en
  todo momento —con el borrador vacío, a medio completar, o después de haber finalizado la
  atención—, con guardado propio e inmediato, independiente de "Finalizar atención", ya que
  ese dato pertenece al paciente y no a la Cita puntual.
- **FR-013**: El panel de Atención DEBE incluir una sección de Odontograma visible pero
  deshabilitada, con una indicación de "Próximamente" y sin ninguna funcionalidad en esta
  feature.
- **FR-014**: El sistema DEBE permitir "Finalizar atención" desde el borrador; al hacerlo,
  DEBE crear una Cita nueva afiliada al paciente con el motivo de consulta, diagnóstico,
  plan de tratamiento, categoría, receta y estudios cargados en el borrador hasta ese
  momento, y marcarla como finalizada, todo en una sola operación desde la perspectiva del
  odontólogo.
- **FR-015**: Una vez creada (FR-014), el sistema DEBE bloquear la edición del motivo de
  consulta, diagnóstico, plan de tratamiento, categoría, todos los ítems de receta y el
  nombre/descripción de todos los estudios complementarios de esa cita — queda de solo
  lectura desde el momento en que existe.
- **FR-016**: El sistema NO DEBE ofrecer ninguna acción para volver a un estado editable una
  vez finalizada la atención (no existe "reabrir" ni "guardar borrador para después" en esta
  feature).
- **FR-017**: A pesar del bloqueo de FR-015, el sistema DEBE seguir permitiendo adjuntar uno
  o más archivos de resultado a un estudio complementario ya existente, incluso después de
  que la cita a la que pertenece esté finalizada.
- **FR-018**: El sistema DEBE aceptar únicamente archivos de imagen o PDF como adjunto de
  resultado de un estudio, y DEBE rechazar cualquier otro tipo de archivo indicando los
  formatos aceptados.
- **FR-019**: Adjuntar un archivo de resultado a un estudio DEBE requerir conexión a
  internet; si no hay conexión disponible, el sistema DEBE informarlo claramente y no
  completar la carga, sin afectar el resto de los datos de la cita.
- **FR-020**: "Finalizar atención" (que crea la Cita y guarda motivo, diagnóstico, plan de
  tratamiento, categoría, receta y estudios sin adjuntos de una vez) y la edición de
  Antecedentes DEBEN funcionar sin conexión a internet, igual que el resto del sistema,
  sincronizándose cuando la conexión esté disponible. El borrador en sí (mientras no se
  finaliza) vive en el navegador y no requiere conexión ni sincroniza nada todavía.
- **FR-021**: El panel de Atención DEBE incluir un panel de Historial de citas anteriores que
  lista las citas ya finalizadas de ese paciente, ordenadas de la más reciente a la más
  antigua, mostrando al menos fecha, categoría/motivo y diagnóstico resumido de cada una.
- **FR-022**: El borrador de la atención que se está armando en ese momento NO DEBE aparecer
  en su propio panel de Historial de citas anteriores — el historial solo puede listar
  Citas que ya existen como registro, es decir, ya finalizadas.
- **FR-023**: Al seleccionar una cita del Historial de citas anteriores, el sistema DEBE
  mostrarla completa (diagnóstico, receta y estudios con sus archivos adjuntos) en modo solo
  lectura.
- **FR-024**: Si un paciente no tiene ninguna cita finalizada, el sistema DEBE indicarlo
  claramente en el panel de Historial de citas anteriores en lugar de mostrar una lista vacía
  sin explicación.
- **FR-025**: El panel de Atención DEBE ser completamente utilizable en pantalla angosta
  (mobile): la sección de Antecedentes y el panel de Historial de citas anteriores DEBEN
  quedar accesibles (por ejemplo mediante un control que los despliega) sin requerir scroll
  horizontal ni ocultar contenido de forma inalcanzable.
- **FR-026**: La cita, sus ítems de receta y sus estudios complementarios (excepto la carga
  de archivos adjuntos, ver FR-019) DEBEN sujetarse a las mismas reglas de un solo usuario ya
  establecidas en 001-gestion-pacientes: sin portal de pacientes ni multi-usuario.
- **FR-027**: El panel de Atención DEBE ofrecer una acción para volver a la ficha del
  paciente sin finalizar la atención, descartando cualquier dato cargado en el borrador
  (Diagnóstico, Receta, Estudios) sin crear ningún registro.

### Key Entities

- **Cita**: Representa un encuentro clínico puntual entre el odontólogo y un paciente. Se
  crea recién al finalizar la atención (FR-014) — antes de eso, sus datos existen solo como
  un borrador en el navegador, sin ningún registro persistido. Atributos: paciente al que
  pertenece, fecha/hora de creación (= fecha/hora en que se finalizó), motivo de consulta,
  diagnóstico, plan de tratamiento, categoría del tipo de consulta. Relación uno a muchos con
  **Ítem de Receta** y con **Estudio Complementario**. No se asocia a Consultorio en esta
  feature (evaluado y descartado explícitamente). Es inmutable desde el momento en que se
  crea, salvo por los archivos adjuntos de sus estudios (ver FR-017).
- **Ítem de Receta**: Un medicamento indicado dentro de una cita. Atributos: medicamento,
  dosis, frecuencia, duración, indicaciones adicionales (texto libre, opcional). Pertenece a
  una única Cita.
- **Estudio Complementario**: Un examen o estudio solicitado dentro de una cita. Atributos:
  nombre/descripción, cero o más archivos de resultado adjuntos (cada uno una imagen o PDF).
  Pertenece a una única Cita; a diferencia del resto de la cita, admite agregar archivos
  adjuntos aunque la cita ya esté finalizada.
- **Historia Clínica** (ya existente, 003-historia-clinica-paciente): no se modela de nuevo
  en esta feature — se muestra y edita desde el panel de Atención como la misma información
  ya asociada al Paciente.
- **Paciente** (ya existente, 001-gestion-pacientes): se le agrega la relación con sus
  Citas; el botón de iniciar atención solo está disponible mientras el paciente esté activo.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El odontólogo pasa de la ficha del paciente al panel de Atención listo para
  trabajar en un solo paso (un clic/toque), sin pantallas intermedias de configuración.
- **SC-002**: El odontólogo puede cargar diagnóstico, un ítem de receta y un estudio
  complementario de una consulta típica en menos de 3 minutos en total.
- **SC-003**: El 100% de las citas finalizadas conservan su diagnóstico, receta y estudios
  exactamente como quedaron al finalizar, sin que ninguna edición posterior los modifique
  (salvo los archivos adjuntos de estudios).
- **SC-004**: El odontólogo puede encontrar y revisar cualquier cita anterior de un paciente
  desde el propio panel de Atención, sin salir de la atención en curso ni buscar en otra
  pantalla.
- **SC-005**: El odontólogo puede consultar y corregir los antecedentes de un paciente sin
  interrumpir ni perder lo que ya había cargado en el borrador de diagnóstico, receta o
  estudios de la atención en curso.
- **SC-006**: El 100% de los intentos de adjuntar un archivo con conexión a internet
  disponible se completan sin necesidad de reabrir la cita, incluso si esta ya fue
  finalizada.
- **SC-007**: El panel de Atención es completamente usable (sin scroll horizontal ni
  contenido inalcanzable) tanto en teléfono como en tablet y desktop.

## Assumptions

- Es un sistema de un solo usuario (el odontólogo), sin portal de pacientes ni multi-usuario,
  consistente con 001-gestion-pacientes y 003-historia-clinica-paciente.
- La Cita NO se asocia a un Consultorio (004-consultorios) en esta feature; se evaluó
  explícitamente durante el diseño y se decidió dejarlo fuera de alcance.
- El catálogo de categorías de tipo de consulta (Control, Urgencia, Limpieza/Profilaxis,
  Endodoncia, Extracción, Restauración/Obturación, Ortodoncia, Cirugía, Consulta general,
  Otro) es una propuesta razonable ante la falta de un catálogo previo en el sistema; no es
  configurable por el odontólogo en esta feature.
- Una cita finalizada es inmutable salvo por la posibilidad de seguir adjuntando archivos de
  resultado a sus estudios complementarios; no existe una acción de "reabrir" una cita
  finalizada en esta feature. Esta decisión conecta con el principio de auditabilidad del
  proyecto (no perder ni sobrescribir silenciosamente estado previo en registros con
  significancia clínica).
- Adjuntar un archivo de resultado a un estudio es la única operación de esta feature que
  requiere conexión a internet; se documenta como una excepción puntual y acotada al
  comportamiento local-first del resto del sistema, dado que sincronizar archivos binarios
  pesados offline (a diferencia de los datos de texto livianos del resto del sistema) es una
  complejidad de sincronización no resuelta y fuera de alcance de esta feature. El resto de
  la atención (crear la cita, diagnóstico, receta, estudios sin adjuntos, antecedentes) sigue
  funcionando 100% offline.
- Los antecedentes (historia clínica) mostrados y editables desde el panel de Atención son
  exactamente los mismos de 003-historia-clinica-paciente, sin un historial de versiones por
  cita — cada edición reemplaza el valor anterior, igual que ya funciona en la ficha del
  paciente.
- **Decisión revisada tras una primera versión funcionando**: nada de la atención (motivo,
  diagnóstico, plan de tratamiento, categoría, receta, estudios) se persiste hasta presionar
  "Finalizar atención" — todo vive como estado local del navegador (un borrador) hasta ese
  momento, en el que se crea la Cita y se guarda todo junto. Riesgo aceptado
  explícitamente: cerrar la pestaña, perder la conexión de forma abrupta, o que el navegador
  se cierre inesperadamente *antes* de finalizar hace perder todo lo cargado en esa
  atención, sin ninguna forma de retomar un borrador interrumpido. Se prefirió este
  comportamiento a cambio de que nunca quede una Cita "a medias" u orfanada en la base de
  datos, y de que el botón "Volver a la ficha" (FR-027) pueda descartar sin dejar rastro. La
  única excepción es Antecedentes, que se sigue guardando de inmediato porque es un dato del
  paciente, no de la Cita en borrador.
- Como ninguna Cita se crea hasta finalizar, no existe el concepto de "una cita en curso a
  la vez" ni de reabrir un borrador: cada "Nueva cita" / "Atender paciente" abre un borrador
  nuevo e independiente, y el sistema no intenta detectar ni impedir que el odontólogo tenga
  más de uno abierto en paralelo (ver Edge Cases).
- El Odontograma queda explícitamente fuera de alcance de esta feature (solo un placeholder
  deshabilitado); su diseño y funcionalidad se definirán en una especificación futura
  separada, tal como ya estaba acordado.
- No se definen en esta feature reglas clínicas de validación cruzada (por ejemplo alertas
  automáticas de interacción entre un ítem de receta y una alergia registrada en
  Antecedentes); mostrar ambos datos accesibles durante la atención es responsabilidad del
  odontólogo, no un motor de alertas automáticas.
