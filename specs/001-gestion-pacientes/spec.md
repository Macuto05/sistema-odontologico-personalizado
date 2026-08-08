# Feature Specification: Gestión de Pacientes (Ficha y Control Propio del Odontólogo)

**Feature Branch**: `001-gestion-pacientes`

**Created**: 2026-07-30

**Status**: Draft

**Input**: User description: "Gestión de pacientes — ficha y control propio del odontólogo. Como odontólogo, necesito un módulo para llevar el registro de mis propios pacientes: Alta (crear ficha con nombre completo, documento de identidad, fecha de nacimiento, teléfono, email y dirección), identificador único por documento de identidad (avisar si ya existe en vez de crear duplicado), búsqueda por nombre o documento, edición de ficha existente, archivado (dar de baja sin borrar, manteniendo historial). Sistema de un solo usuario (el propio odontólogo), sin portal de pacientes ni multi-usuario. Fuera de alcance: historia clínica/odontograma, turnos/agenda, facturación."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Registrar un paciente nuevo (Priority: P1)

Como odontólogo, cuando atiendo a alguien por primera vez, quiero crear su ficha con sus
datos básicos para tener un registro propio de quién es y cómo contactarlo.

**Why this priority**: Sin esta capacidad no existe registro alguno de pacientes; es el
punto de entrada de todo lo demás (búsqueda, edición, archivado).

**Independent Test**: Se puede probar de forma aislada creando una ficha con datos válidos
y verificando que queda guardada y disponible para búsqueda posterior. Entrega valor por sí
sola: reemplaza una libreta o planilla externa de pacientes.

**Acceptance Scenarios**:

1. **Given** que no existe ningún paciente con un documento de identidad dado, **When** el
   odontólogo completa nombre completo, documento, fecha de nacimiento y guarda la ficha,
   **Then** el sistema crea el registro y lo muestra como paciente activo.
2. **Given** que ya existe un paciente activo o archivado con el mismo documento de
   identidad, **When** el odontólogo intenta crear una ficha nueva con ese mismo documento,
   **Then** el sistema rechaza la creación y le avisa que ya existe un paciente con ese
   documento, indicando de cuál se trata.
3. **Given** un formulario de alta, **When** el odontólogo intenta guardar sin completar
   nombre completo, documento de identidad o fecha de nacimiento, **Then** el sistema
   impide guardar y señala qué campos obligatorios faltan.

---

### User Story 2 - Buscar un paciente existente (Priority: P2)

Como odontólogo, quiero encontrar rápidamente la ficha de un paciente por su nombre o su
documento para consultar o actualizar sus datos durante o entre consultas.

**Why this priority**: Una vez que hay pacientes cargados, la utilidad diaria del módulo
depende de poder encontrarlos rápido; sin búsqueda, el registro crece pero se vuelve
inutilizable.

**Independent Test**: Con varios pacientes ya creados, se puede probar de forma aislada
buscando por un nombre parcial y por un documento exacto, y verificando que los resultados
correctos aparecen y los que no coinciden quedan excluidos.

**Acceptance Scenarios**:

1. **Given** varios pacientes activos cargados, **When** el odontólogo busca por parte del
   nombre, **Then** el sistema muestra todos los pacientes activos cuyo nombre contiene ese
   texto, sin distinguir mayúsculas/minúsculas.
2. **Given** varios pacientes cargados, **When** el odontólogo busca por el número de
   documento exacto, **Then** el sistema muestra únicamente el paciente cuyo documento
   coincide.
3. **Given** una búsqueda que no coincide con ningún paciente activo, **When** el
   odontólogo ejecuta la búsqueda, **Then** el sistema indica claramente que no se
   encontraron resultados.

---

### User Story 3 - Editar los datos de un paciente (Priority: P3)

Como odontólogo, quiero corregir o actualizar los datos de contacto o personales de un
paciente ya cargado, porque esa información cambia con el tiempo (nuevo teléfono, nueva
dirección, corrección de un dato mal cargado).

**Why this priority**: Es necesaria para mantener la ficha útil en el tiempo, pero depende
de que ya existan pacientes cargados y de poder encontrarlos (historias 1 y 2).

**Independent Test**: Se puede probar de forma aislada editando uno o varios campos de un
paciente activo ya existente y confirmando que los cambios se guardan y se reflejan en
búsquedas posteriores.

**Acceptance Scenarios**:

1. **Given** un paciente activo existente, **When** el odontólogo modifica su teléfono,
   email o dirección y guarda, **Then** el sistema conserva los nuevos valores y los
   muestra en futuras búsquedas o consultas de la ficha.
2. **Given** un paciente activo existente, **When** el odontólogo intenta cambiar su
   documento de identidad a uno que ya pertenece a otro paciente (activo o archivado),
   **Then** el sistema rechaza el cambio y avisa del conflicto, sin modificar la ficha.
3. **Given** un paciente archivado, **When** el odontólogo intenta editar sus datos
   directamente, **Then** el sistema requiere reactivar la ficha antes de permitir la
   edición.

---

### User Story 4 - Archivar un paciente que ya no se atiende (Priority: P4)

Como odontólogo, quiero dar de baja (archivar) a un paciente que ya no atiendo, para que
deje de aparecer en mi listado activo del día a día sin perder su historial si vuelve más
adelante.

**Why this priority**: Mantiene el listado activo limpio y manejable a largo plazo; es
valiosa pero no bloquea el uso básico del módulo (alta, búsqueda, edición) mientras la
cantidad de pacientes es baja.

**Independent Test**: Se puede probar de forma aislada archivando un paciente activo y
verificando que desaparece del listado/búsqueda por defecto pero sigue existiendo y es
recuperable mediante una vista explícita de archivados.

**Acceptance Scenarios**:

1. **Given** un paciente activo, **When** el odontólogo lo archiva, **Then** el sistema lo
   marca como archivado, conserva todos sus datos y lo excluye del listado y búsqueda por
   defecto.
2. **Given** un paciente archivado, **When** el odontólogo consulta la vista de pacientes
   archivados, **Then** el sistema lo muestra junto con todos sus datos originales.
3. **Given** un paciente archivado, **When** el odontólogo decide reactivarlo, **Then** el
   sistema lo vuelve a marcar como activo y lo incluye nuevamente en el listado y búsqueda
   por defecto.

---

### Edge Cases

- ¿Qué sucede si el odontólogo intenta archivar un paciente que ya está archivado? El
  sistema debe indicar que ya se encuentra archivado, sin generar error ni duplicar acción.
- ¿Qué sucede si se busca con el campo vacío? El sistema debe pedir al menos un criterio de
  búsqueda (nombre o documento) en lugar de devolver todos los pacientes sin filtro.
- ¿Qué sucede si dos pacientes distintos comparten el mismo nombre completo pero tienen
  documentos distintos? El sistema debe permitir ambas fichas, ya que el documento de
  identidad —no el nombre— es el identificador único.
- ¿Qué sucede si el odontólogo edita el documento de identidad de un paciente para que
  coincida con el de otro paciente archivado (no solo activo)? El sistema debe rechazar el
  cambio igualmente, ya que la unicidad del documento aplica a todos los pacientes,
  archivados o no.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE permitir crear una ficha de paciente con los siguientes
  datos: nombre completo, documento de identidad, fecha de nacimiento, teléfono, email y
  dirección.
- **FR-002**: El sistema DEBE exigir como obligatorios el nombre completo, el documento de
  identidad y la fecha de nacimiento; teléfono, email y dirección son opcionales.
- **FR-003**: El sistema DEBE usar el documento de identidad como identificador único de
  cada paciente, considerando tanto pacientes activos como archivados al validar unicidad.
- **FR-004**: El sistema DEBE impedir la creación de una ficha nueva cuando el documento de
  identidad ingresado ya pertenece a un paciente existente, informando al odontólogo que ya
  existe un registro con ese documento.
- **FR-005**: El sistema DEBE permitir buscar pacientes por nombre completo (coincidencia
  parcial, sin distinguir mayúsculas/minúsculas) y por documento de identidad (coincidencia
  exacta).
- **FR-006**: El sistema DEBE excluir a los pacientes archivados de los resultados de
  búsqueda y listados por defecto, salvo que el odontólogo consulte explícitamente la vista
  de archivados.
- **FR-007**: El sistema DEBE permitir editar cualquier dato de una ficha de paciente
  activo, incluido el documento de identidad, re-validando la unicidad si este cambia.
- **FR-008**: El sistema DEBE impedir la edición directa de los datos de un paciente
  archivado hasta que el odontólogo lo reactive.
- **FR-009**: El sistema DEBE permitir archivar (dar de baja) a un paciente activo sin
  eliminar ninguno de sus datos.
- **FR-010**: El sistema DEBE permitir reactivar a un paciente archivado, devolviéndolo al
  listado y búsqueda por defecto con todos sus datos intactos.
- **FR-011**: El sistema DEBE conservar el historial completo de datos de un paciente
  archivado, sin pérdida de información, mientras permanezca archivado.
- **FR-012**: El sistema DEBE restringir el acceso a este módulo a un único usuario (el
  propio odontólogo), sin exponer portal ni funcionalidad alguna a los pacientes.

### Key Entities

- **Paciente**: Representa a una persona atendida por el odontólogo. Atributos: nombre
  completo, documento de identidad (identificador único), fecha de nacimiento, teléfono
  (opcional), email (opcional), dirección (opcional), estado (activo/archivado). No incluye
  en esta feature historia clínica, odontograma, turnos ni datos de facturación —esos
  pertenecen a especificaciones futuras separadas.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El odontólogo puede crear una ficha de paciente nueva completando los datos
  obligatorios en menos de 1 minuto.
- **SC-002**: El sistema detecta el 100% de los intentos de crear o editar un paciente con
  un documento de identidad ya registrado, antes de guardar el cambio.
- **SC-003**: El odontólogo encuentra la ficha correcta de un paciente activo mediante
  nombre o documento en el primer intento de búsqueda, sin necesidad de recorrer listados
  manualmente.
- **SC-004**: El 100% de los datos de un paciente archivado permanecen accesibles e
  íntegros tras el archivado, sin pérdida de información.
- **SC-005**: El odontólogo puede distinguir en todo momento, sin ambigüedad, qué pacientes
  están activos y cuáles archivados en cualquier listado o resultado de búsqueda.

## Assumptions

- Es un sistema de un solo usuario (el propio odontólogo); el mecanismo de autenticación o
  inicio de sesión en sí queda fuera del alcance de esta feature.
- Teléfono, email y dirección son opcionales porque no todos los pacientes los proveen al
  momento del alta; nombre completo, documento y fecha de nacimiento sí son obligatorios.
- El formato del documento de identidad (DNI/cédula) no se restringe a un país o formato
  específico en esta feature; solo se valida que no esté vacío y que sea único.
- La búsqueda por nombre y por documento son por coincidencia parcial, filtrando en tiempo
  real a medida que se escribe cada carácter; la de documento además compara solo los
  dígitos de la cédula (ignora el prefijo V-/E- y cualquier separador), no una igualdad
  literal con todo lo guardado.
- "Archivar" es una baja lógica (soft-delete): el paciente y todos sus datos se conservan y
  pueden reactivarse; no existe una operación de borrado definitivo en esta feature.
- Historia clínica/odontograma, turnos/agenda y facturación son funcionalidades futuras y
  no se modelan ni se referencian como dependencias de esta feature.
