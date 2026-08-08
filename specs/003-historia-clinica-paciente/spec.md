# Feature Specification: Historia Clínica del Paciente

**Feature Branch**: `003-historia-clinica-paciente`

**Created**: 2026-07-31

**Status**: Draft

**Input**: User description: "Historia clínica del paciente: agregar a la ficha de cada
paciente (001-gestion-pacientes) una sección de historia clínica con: Antecedentes
personales patológicos (checklist predefinido con casillas de marcar, más una opción
'Otros' que despliega un campo de texto libre), Antecedentes heredofamiliares (texto
libre), Medicamentos actuales (texto libre) y Alergias (texto libre). Se agrega al
formulario de alta de paciente, después de 'Información de contacto', y también se puede
editar después. Se muestra en la ficha del paciente. Basado en el formulario en papel que
usa hoy el odontólogo, ampliado con Hipertensión, Diabetes, Osteoporosis,
Arteriosclerosis, Convulsiones, Enfermedades de Transmisión Sexual y Hepatitis (varias de
estas ya estaban en el checklist original)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Registrar la historia clínica al dar de alta un paciente (Priority: P1)

Como odontólogo, cuando doy de alta a un paciente nuevo, quiero completar su historia
clínica (antecedentes patológicos, heredofamiliares, medicamentos actuales y alergias) en
el mismo formulario de alta, para tener desde el primer momento la información clínica
relevante antes de atenderlo.

**Why this priority**: Es el punto de entrada de la información clínica; sin poder
cargarla al momento del alta, el odontólogo tendría que volver después a completarla, lo
que aumenta el riesgo de que quede incompleta u olvidada antes de una primera consulta.

**Independent Test**: Se puede probar de forma aislada dando de alta un paciente nuevo,
marcando algunos antecedentes patológicos (incluido "Otros" con su descripción),
completando antecedentes heredofamiliares, medicamentos actuales y alergias, y verificando
que la ficha creada conserva toda esa información.

**Acceptance Scenarios**:

1. **Given** el formulario de alta de un paciente nuevo, **When** el odontólogo llega a la
   sección de historia clínica (ubicada después de "Información de contacto") y marca uno
   o más antecedentes personales patológicos del checklist, **Then** el sistema guarda la
   ficha con esos antecedentes marcados asociados al paciente.
2. **Given** el formulario de alta, **When** el odontólogo marca la casilla "Otros" dentro
   de antecedentes patológicos, **Then** el sistema despliega un campo de texto libre para
   describir el antecedente no listado, y ese texto se guarda junto con la ficha.
3. **Given** el formulario de alta, **When** el odontólogo completa antecedentes
   heredofamiliares, medicamentos actuales y/o alergias como texto libre y guarda la
   ficha, **Then** el sistema conserva ese texto asociado al paciente.
4. **Given** el formulario de alta, **When** el odontólogo no marca ningún antecedente ni
   completa ningún campo de historia clínica y guarda la ficha, **Then** el sistema
   permite guardar igualmente, dejando la historia clínica vacía (ningún campo de esta
   sección es obligatorio para completar el alta).

---

### User Story 2 - Consultar la historia clínica en la ficha del paciente (Priority: P2)

Como odontólogo, quiero ver la historia clínica de un paciente junto al resto de su
información en su ficha, para revisar sus antecedentes antes o durante una consulta sin
tener que buscar un papel aparte.

**Why this priority**: Una vez cargada la información (US1), su valor está en poder
consultarla rápido; sin visualización clara en la ficha, cargarla no aporta beneficio
práctico en el consultorio.

**Independent Test**: Con un paciente que ya tiene historia clínica cargada, se puede
probar de forma aislada abriendo su ficha y verificando que se muestran los antecedentes
patológicos marcados (incluida la descripción de "Otros" si aplica), los antecedentes
heredofamiliares, los medicamentos actuales y las alergias.

**Acceptance Scenarios**:

1. **Given** un paciente con antecedentes patológicos marcados, **When** el odontólogo
   abre su ficha, **Then** el sistema muestra claramente cuáles antecedentes están
   marcados, junto al resto de la información del paciente.
2. **Given** un paciente con la opción "Otros" marcada y su descripción cargada, **When**
   el odontólogo abre su ficha, **Then** el sistema muestra esa descripción junto al resto
   de antecedentes patológicos.
3. **Given** un paciente sin historia clínica cargada (por ejemplo, dado de alta antes de
   existir esta sección, o dado de alta sin completarla), **When** el odontólogo abre su
   ficha, **Then** el sistema muestra la sección de historia clínica vacía en lugar de
   ocultarla o producir un error.

---

### User Story 3 - Editar la historia clínica de un paciente existente (Priority: P3)

Como odontólogo, quiero actualizar la historia clínica de un paciente ya cargado (nuevo
antecedente, cambio de medicación, nueva alergia detectada), porque esta información
cambia con el tiempo y necesito que la ficha refleje el estado clínico actual.

**Why this priority**: Mantiene la historia clínica útil en el tiempo, pero depende de que
ya exista la ficha del paciente y la sección de historia clínica (US1 y US2).

**Independent Test**: Se puede probar de forma aislada editando la historia clínica de un
paciente activo existente —marcando o desmarcando antecedentes patológicos, cambiando el
texto de heredofamiliares, medicamentos o alergias— y confirmando que los cambios se
guardan y se reflejan al volver a consultar la ficha.

**Acceptance Scenarios**:

1. **Given** un paciente activo con historia clínica ya cargada, **When** el odontólogo
   marca un antecedente patológico adicional o desmarca uno existente y guarda, **Then**
   el sistema conserva el nuevo conjunto de antecedentes marcados.
2. **Given** un paciente activo con "Otros" marcado y una descripción cargada, **When** el
   odontólogo desmarca "Otros", **Then** el sistema oculta el campo de texto libre y no
   conserva esa descripción como antecedente activo del paciente.
3. **Given** un paciente activo, **When** el odontólogo edita el texto de antecedentes
   heredofamiliares, medicamentos actuales o alergias y guarda, **Then** el sistema
   reemplaza el texto anterior por el nuevo en la ficha.
4. **Given** un paciente archivado, **When** el odontólogo intenta editar su historia
   clínica directamente, **Then** el sistema lo trata igual que cualquier otro dato de la
   ficha y requiere reactivar al paciente antes de permitir la edición (consistente con el
   comportamiento ya definido para la edición de fichas en 001-gestion-pacientes).

---

### Edge Cases

- ¿Qué sucede si el odontólogo marca "Otros" pero no escribe ninguna descripción antes de
  guardar? El sistema debe permitir guardar la ficha, pero la marca de "Otros" sin
  descripción se considera equivalente a no haberla marcado (no debe mostrarse como un
  antecedente vacío en la ficha).
- ¿Qué sucede si el odontólogo desmarca "Otros" después de haber escrito una descripción?
  El sistema debe ocultar el campo de texto y descartar esa descripción; si vuelve a
  marcar "Otros", el campo aparece vacío nuevamente.
- ¿Qué sucede con la historia clínica de pacientes que ya existían antes de esta feature?
  El sistema debe mostrarles la sección de historia clínica vacía (sin ningún antecedente
  marcado), editable normalmente como la de cualquier paciente.
- ¿Qué sucede si dos antecedentes del checklist se refieren a condiciones relacionadas
  (por ejemplo, "Diabetes" e "Hipertensión/Hipotensión")? El sistema debe permitir marcar
  cualquier combinación de antecedentes de forma independiente, sin restricciones de
  exclusión mutua entre ellos.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE incluir en el formulario de alta de paciente, inmediatamente
  después de la sección "Información de contacto", una sección de historia clínica con:
  antecedentes personales patológicos, antecedentes heredofamiliares, medicamentos
  actuales y alergias.
- **FR-002**: El sistema DEBE presentar los antecedentes personales patológicos como un
  checklist predefinido de casillas de marcar independientes entre sí, con las siguientes
  opciones: Diabetes, Hepatitis, Artritis, Asma/EPOC, Anemia, Infarto, Enfermedades
  Pulmonares, Hipertiroidismo, Hipotiroidismo, Convulsiones/Desmayos,
  Hipertensión/Hipotensión, Sinusitis, Angina de Pecho, Fiebre Reumática, Gastritis, Úlcera
  Gástrica, Enfermedades de Transmisión Sexual, Arteriosclerosis, Alteraciones
  metabólicas, Enfermedades Endocrinas y Osteoporosis.
- **FR-003**: El sistema DEBE incluir, como última opción del checklist de antecedentes
  personales patológicos, una casilla "Otros" que, al marcarse, despliega un campo de
  texto libre para describir antecedentes no incluidos en la lista predefinida.
- **FR-004**: El sistema DEBE ocultar el campo de texto libre de "Otros" cuando la casilla
  no está marcada, y DEBE descartar su contenido si el odontólogo desmarca "Otros" después
  de haber escrito una descripción.
- **FR-005**: El sistema DEBE permitir marcar cualquier combinación de antecedentes
  personales patológicos, sin límite de cantidad ni exclusiones entre opciones.
- **FR-006**: El sistema DEBE permitir registrar antecedentes heredofamiliares como texto
  libre, sin estructura ni checklist predefinido.
- **FR-007**: El sistema DEBE permitir registrar medicamentos actuales como texto libre.
- **FR-008**: El sistema DEBE permitir registrar alergias como texto libre.
- **FR-009**: Ninguno de los campos de la sección de historia clínica (antecedentes
  patológicos, heredofamiliares, medicamentos actuales, alergias) es obligatorio para
  completar el alta de un paciente.
- **FR-010**: El sistema DEBE permitir editar la historia clínica de un paciente activo ya
  existente después del alta, con los mismos campos y comportamiento que en el alta.
- **FR-011**: El sistema DEBE mostrar la historia clínica del paciente (antecedentes
  patológicos marcados, descripción de "Otros" si corresponde, antecedentes
  heredofamiliares, medicamentos actuales y alergias) en la ficha del paciente, junto al
  resto de su información.
- **FR-012**: El sistema DEBE mostrar la sección de historia clínica de forma clara aunque
  esté vacía (paciente sin antecedentes cargados), sin ocultarla ni producir errores.
- **FR-013**: El sistema DEBE sujetar la edición de la historia clínica de un paciente
  archivado a la misma restricción ya definida en 001-gestion-pacientes para el resto de
  la ficha: requiere reactivar al paciente antes de permitir la edición.

### Key Entities

- **Historia Clínica**: Representa la información clínica de un paciente, complementaria a
  sus datos personales y de contacto (definidos en 001-gestion-pacientes). Atributos:
  conjunto de antecedentes personales patológicos marcados (de la lista predefinida en
  FR-002), descripción de "Otros" (texto libre, presente solo si "Otros" está marcado),
  antecedentes heredofamiliares (texto libre), medicamentos actuales (texto libre),
  alergias (texto libre). Relación uno a uno con **Paciente**: cada paciente tiene una
  única historia clínica, que puede estar vacía. No introduce por sí sola un historial de
  cambios ni versiones anteriores de la historia clínica —eso queda fuera de alcance de
  esta feature (ver Assumptions).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El odontólogo puede completar la sección de historia clínica al dar de alta
  un paciente en menos de 2 minutos.
- **SC-002**: El 100% de los antecedentes patológicos marcados (incluida la descripción de
  "Otros" cuando corresponde) y del texto de heredofamiliares, medicamentos y alergias
  quedan visibles al reabrir la ficha del paciente, sin pérdida de información.
- **SC-003**: El odontólogo puede identificar, con una sola mirada a la ficha del
  paciente, cuáles antecedentes patológicos tiene marcados, sin necesidad de abrir
  pantallas o formularios adicionales.
- **SC-004**: El odontólogo puede actualizar la historia clínica de un paciente existente
  (agregar, quitar o modificar cualquier campo) en menos de 1 minuto.
- **SC-005**: El 100% de los pacientes existentes antes de esta feature muestran su
  sección de historia clínica correctamente (vacía), sin errores, al abrir su ficha por
  primera vez después de la actualización.

## Assumptions

- La historia clínica es un estado actual editable en el lugar (como el resto de la ficha
  del paciente en 001-gestion-pacientes), no un historial versionado de cambios pasados;
  cada edición reemplaza el valor anterior del campo modificado.
- El checklist de antecedentes personales patológicos es fijo y predefinido por esta
  especificación (no configurable por el odontólogo); nuevas opciones requerirían una
  actualización futura de esta lista.
- "Osteoporosis" se agrega como opción nueva respecto del formulario en papel de
  referencia; el resto de los ítems pedidos explícitamente (Hipertensión, Diabetes,
  Arteriosclerosis, Convulsiones, Enfermedades de Transmisión Sexual, Hepatitis) ya
  estaban cubiertos por el checklist original (como "Hipertensión/Hipotensión" y
  "Convulsiones/Desmayos", entre otros) y no se duplican.
- La sección de historia clínica se rige por las mismas reglas de acceso y de un solo
  usuario ya establecidas en 001-gestion-pacientes (FR-012 de esa feature): sin portal de
  pacientes ni multi-usuario.
- La edición de la historia clínica de un paciente archivado sigue la misma restricción ya
  definida en 001-gestion-pacientes para el resto de sus datos (reactivar antes de
  editar), en vez de introducir una excepción para este dato en particular.
- No se definen en esta feature reglas clínicas de validación cruzada entre antecedentes
  (por ejemplo, alertas automáticas por interacción entre medicamentos y alergias); el
  registro es descriptivo, no un motor de reglas clínicas.
