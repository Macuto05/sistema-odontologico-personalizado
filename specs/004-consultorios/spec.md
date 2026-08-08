# Feature Specification: Consultorios (clasificación de pacientes por sede)

**Feature Branch**: `004-consultorios`

**Created**: 2026-07-31

**Status**: Draft

**Input**: User description: "Consultorios como forma de clasificar pacientes. La odontóloga gestiona su propia lista de consultorios (sedes/lugares de trabajo) desde Configuración: puede agregar nuevos consultorios (nombre) y eliminarlos. No es un catálogo fijo del sistema — es una lista propia que cada odontóloga arma. El sistema es local-first, así que Consultorio también debe funcionar sin conexión y sincronizarse entre dispositivos. En el formulario de alta/edición de paciente se agrega un selector opcional para asignarle un consultorio al paciente. En el listado de pacientes se agrega una columna mostrando el consultorio del paciente. Si se elimina un consultorio que ya tiene pacientes asignados, esos pacientes quedan con el consultorio en null."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Administrar la lista de consultorios (Priority: P1)

Como odontóloga, quiero agregar y eliminar los consultorios (sedes) donde atiendo, para
tener mi propia lista de lugares de trabajo lista para clasificar a mis pacientes.

**Why this priority**: Es la base de toda la feature — sin una lista de consultorios no
hay nada que asignar a un paciente ni que mostrar en el listado.

**Independent Test**: Desde Configuración, crear un consultorio nuevo y verificar que
queda disponible; eliminarlo y verificar que desaparece de la lista. Se puede probar de
forma aislada, sin pacientes involucrados.

**Acceptance Scenarios**:

1. **Given** que la odontóloga está en Configuración, **When** agrega un consultorio con
   un nombre válido, **Then** el sistema lo guarda y lo muestra en su lista de
   consultorios.
2. **Given** que ya existe un consultorio con un nombre dado, **When** la odontóloga
   intenta crear otro con el mismo nombre (sin distinguir mayúsculas/minúsculas), **Then**
   el sistema rechaza la creación y avisa que ya existe.
3. **Given** un consultorio existente, **When** la odontóloga lo elimina, **Then** el
   sistema lo quita de la lista de consultorios disponibles.

---

### User Story 2 - Asignar un consultorio a un paciente (Priority: P2)

Como odontóloga, quiero indicar desde qué consultorio atiendo a cada paciente al crear o
editar su ficha, para saber en qué sede corresponde cada uno.

**Why this priority**: Depende de que exista al menos la posibilidad de gestionar
consultorios (US1), pero es lo que le da valor real a la clasificación.

**Independent Test**: Con uno o más consultorios ya creados, dar de alta un paciente
asignándole un consultorio y verificar que queda guardado; editar un paciente existente
para cambiarle o quitarle el consultorio asignado.

**Acceptance Scenarios**:

1. **Given** que existen consultorios creados, **When** la odontóloga da de alta un
   paciente y selecciona uno de ellos, **Then** el sistema guarda esa asignación junto con
   el resto de la ficha.
2. **Given** que no existe ningún consultorio creado todavía, **When** la odontóloga da de
   alta o edita un paciente, **Then** el sistema le permite completar y guardar la ficha
   igual, sin exigir un consultorio (es un dato opcional).
3. **Given** un paciente con un consultorio ya asignado, **When** la odontóloga lo edita y
   cambia el consultorio (o lo deja sin ninguno), **Then** el sistema guarda el nuevo
   valor.

---

### User Story 3 - Ver el consultorio de cada paciente en el listado (Priority: P3)

Como odontóloga, quiero ver a qué consultorio pertenece cada paciente directamente en el
listado, para identificarlo sin tener que abrir su ficha.

**Why this priority**: Es la forma en que la clasificación por consultorio se aprovecha en
el uso diario, pero no bloquea que las historias 1 y 2 ya entreguen valor por sí solas.

**Independent Test**: Con pacientes que tienen distintos consultorios asignados (y alguno
sin ninguno), abrir el listado y verificar que cada fila muestra el consultorio
correspondiente o una indicación clara de que no tiene.

**Acceptance Scenarios**:

1. **Given** un paciente con un consultorio asignado, **When** la odontóloga ve el
   listado de pacientes, **Then** la fila de ese paciente muestra el nombre de su
   consultorio.
2. **Given** un paciente sin consultorio asignado, **When** la odontóloga ve el listado,
   **Then** la fila muestra claramente que no tiene consultorio asignado (no queda en
   blanco de forma ambigua).

---

### Edge Cases

- ¿Qué sucede si se elimina un consultorio que ya tiene pacientes asignados? Los pacientes
  que lo tenían asignado quedan sin consultorio (valor nulo) — no se archivan, no se
  bloquea el borrado del consultorio, y ningún otro dato del paciente se ve afectado
  (decisión confirmada).
- ¿Qué sucede si la odontóloga intenta crear un consultorio con un nombre que ya existe?
  El sistema lo rechaza y avisa cuál es el existente, igual que la detección de duplicados
  ya usada para el documento de identidad del paciente.
- ¿Qué sucede si se intenta crear o eliminar un consultorio sin conexión a internet? Debe
  funcionar igual que el resto del sistema (local-first): la acción se refleja de inmediato
  y se sincroniza cuando vuelve la conexión.
- ¿Qué sucede si dos dispositivos, ambos sin conexión, eliminan el mismo consultorio o
  crean uno con el mismo nombre al mismo tiempo? Al reconectar, ninguna acción se pierde
  silenciosamente: el resultado final es consistente en todos los dispositivos (un
  consultorio eliminado permanece eliminado; un nombre duplicado se resuelve sin duplicar
  la lista).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE permitir crear un consultorio nuevo indicando un nombre,
  desde Configuración.
- **FR-002**: El sistema DEBE exigir que el nombre del consultorio no esté vacío.
- **FR-003**: El sistema DEBE impedir crear un consultorio con el mismo nombre que uno ya
  existente (comparación insensible a mayúsculas/minúsculas), avisando del duplicado.
- **FR-004**: El sistema DEBE permitir eliminar cualquier consultorio existente desde
  Configuración.
- **FR-005**: Al eliminar un consultorio, el sistema DEBE dejar sin consultorio asignado
  (valor nulo) a todos los pacientes que lo tenían, sin modificar ningún otro dato de esos
  pacientes y sin impedir la eliminación.
- **FR-006**: El sistema DEBE permitir asignar, de forma opcional, un consultorio a un
  paciente al crear su ficha.
- **FR-007**: El sistema DEBE permitir asignar, cambiar o quitar el consultorio de un
  paciente al editar su ficha.
- **FR-008**: El selector de consultorio en la ficha de paciente DEBE ofrecer únicamente
  consultorios existentes, no un valor de texto libre.
- **FR-009**: El sistema DEBE permitir crear y editar la ficha de un paciente sin
  consultorio asignado, incluso cuando no exista ningún consultorio creado todavía.
- **FR-010**: El listado de pacientes DEBE mostrar, para cada paciente, el nombre de su
  consultorio asignado o una indicación explícita de que no tiene ninguno.
- **FR-011**: La creación y eliminación de consultorios DEBE funcionar sin conexión a
  internet, igual que el resto de las operaciones sobre pacientes.
- **FR-012**: Los consultorios creados o eliminados en un dispositivo DEBEN quedar
  disponibles en los demás dispositivos de la misma cuenta una vez que recuperan conexión.
- **FR-013**: El consultorio asignado a un paciente DEBE sincronizarse entre dispositivos
  junto con el resto de los datos de ese paciente.

### Key Entities

- **Consultorio**: Representa una sede o lugar de trabajo definido libremente por la
  odontóloga. Atributos: nombre (obligatorio, único sin distinguir mayúsculas de
  minúsculas). No tiene más datos en esta feature (sin dirección, horario ni otra
  información).
- **Paciente** (ya existente, `001-gestion-pacientes`): se le agrega una referencia
  opcional a un Consultorio. Un paciente tiene como máximo un consultorio asignado a la
  vez; puede no tener ninguno.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: La odontóloga crea un consultorio nuevo y puede asignarlo a un paciente
  inmediatamente después, sin recargar la aplicación ni esperar sincronización.
- **SC-002**: El 100% de los pacientes cuyo consultorio fue eliminado quedan mostrando
  "sin consultorio" en vez de un dato inconsistente o una referencia rota.
- **SC-003**: La odontóloga identifica el consultorio de cualquier paciente directamente
  desde el listado, sin abrir su ficha, en el 100% de los casos.
- **SC-004**: Crear, eliminar y asignar consultorios funciona de forma idéntica con o sin
  conexión a internet.
- **SC-005**: Un consultorio creado en un dispositivo está disponible para asignar en
  cualquier otro dispositivo de la misma cuenta apenas ese dispositivo recupera conexión.

## Assumptions

- El nombre del consultorio es único por cuenta (sin distinguir mayúsculas/minúsculas);
  no se especificó explícitamente, pero evita una lista con entradas indistinguibles entre
  sí.
- No hay límite máximo de consultorios que la odontóloga pueda crear.
- Esta feature no incluye renombrar un consultorio existente — el pedido original solo
  menciona agregar y eliminar. Renombrar queda fuera de alcance (se puede lograr eliminando
  y creando uno nuevo, asumiendo el costo de que los pacientes que lo tenían asignado
  queden sin consultorio).
- Un paciente tiene como máximo un consultorio asignado; no se contempla más de uno.
- Esta feature no incluye filtrar ni buscar pacientes por consultorio en el listado — la
  columna nueva es solo informativa.
- El sistema sigue siendo de un solo usuario (la odontóloga); Consultorio es parte de sus
  propios datos, no un catálogo compartido entre múltiples cuentas.
