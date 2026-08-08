# Feature Specification: Pantalla de Inicio (Home) del Sistema

**Feature Branch**: `002-pantalla-inicio`

**Created**: 2026-07-31

**Status**: Draft

**Input**: User description: "Pantalla de inicio principal (home/dashboard) que se ve al entrar al sistema después del login. Debe incluir: saludo personalizado al odontólogo (usuario del sistema), resumen con total de pacientes activos, barra de búsqueda de pacientes accesible desde el inicio, y una sidebar de navegación con las secciones: Pacientes (lleva a la pantalla de gestión de pacientes ya existente), Insumos (placeholder, sin funcionalidad todavía), Configuración (para editar los datos del usuario/odontólogo del sistema) y Cerrar sesión. Sistema de un solo usuario (el propio odontólogo)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver el resumen de bienvenida al ingresar (Priority: P1)

Como odontólogo, al iniciar sesión quiero ver un saludo con mi nombre y el total de
pacientes activos, para confirmar que ingresé correctamente y tener de inmediato una
noción de mi carga de pacientes.

**Why this priority**: Sin esto la pantalla de inicio no cumple su propósito básico; es
lo primero que ve el odontólogo después del login y de ahí depende el resto de la
pantalla.

**Independent Test**: Se puede probar de forma aislada iniciando sesión y verificando que
aparece el nombre correcto del odontólogo y que el conteo de pacientes activos mostrado
coincide con el listado real de pacientes.

**Acceptance Scenarios**:

1. **Given** una sesión iniciada exitosamente, **When** el odontólogo llega al inicio,
   **Then** el sistema muestra un saludo que incluye su nombre.
2. **Given** que existen N pacientes activos, **When** el odontólogo ve el inicio,
   **Then** el resumen muestra ese número N.
3. **Given** que no existe ningún paciente activo, **When** el odontólogo ve el inicio,
   **Then** el resumen muestra 0 junto con una indicación de que puede crear su primer
   paciente, sin mostrar ningún error.

---

### User Story 2 - Navegar a las secciones del sistema desde la sidebar (Priority: P2)

Como odontólogo, quiero una sidebar visible desde el inicio con acceso a Pacientes,
Insumos, Configuración y Cerrar sesión, para moverme entre las partes del sistema sin
perderme.

**Why this priority**: Es el mecanismo central de navegación del sistema; sin él, el
inicio sería una pantalla aislada que no conecta con el resto de las funciones ya
existentes (gestión de pacientes) ni futuras.

**Independent Test**: Se puede probar de forma aislada haciendo clic en cada opción de la
sidebar desde el inicio y verificando que cada una lleva al destino correcto o muestra el
estado esperado (en el caso de Insumos).

**Acceptance Scenarios**:

1. **Given** que el odontólogo está en el inicio, **When** selecciona "Pacientes" en la
   sidebar, **Then** el sistema lo lleva a la pantalla de gestión de pacientes ya
   existente.
2. **Given** que el odontólogo está en el inicio, **When** selecciona "Insumos" en la
   sidebar, **Then** el sistema muestra una sección marcada como no disponible o
   "próximamente", sin funcionalidad real.
3. **Given** que el odontólogo está en el inicio o en cualquier otra pantalla del
   sistema, **When** selecciona "Cerrar sesión", **Then** el sistema termina la sesión
   activa y lo redirige a la pantalla de inicio de sesión.
4. **Given** que no hay una sesión activa, **When** se intenta acceder directamente al
   inicio, **Then** el sistema redirige a la pantalla de inicio de sesión.

---

### User Story 3 - Buscar un paciente desde el inicio (Priority: P3)

Como odontólogo, quiero buscar un paciente por nombre o documento directamente desde el
inicio, para no tener que entrar primero a Pacientes cuando ya sé a quién busco.

**Why this priority**: Agrega valor de conveniencia, pero depende de que Pacientes y su
búsqueda ya existan (spec `001-gestion-pacientes`); no es indispensable para que el
inicio cumpla su función básica.

**Independent Test**: Se puede probar de forma aislada ingresando un nombre o documento
en la barra de búsqueda del inicio y verificando que se llega a Pacientes mostrando los
mismos resultados que si se hubiera buscado directamente ahí.

**Acceptance Scenarios**:

1. **Given** que el odontólogo está en el inicio, **When** ingresa parte de un nombre y
   ejecuta la búsqueda, **Then** el sistema lo lleva a Pacientes mostrando los pacientes
   activos cuyo nombre contiene ese texto.
2. **Given** que el odontólogo está en el inicio, **When** ingresa un documento exacto y
   ejecuta la búsqueda, **Then** el sistema lo lleva a Pacientes mostrando únicamente el
   paciente correspondiente.
3. **Given** que el campo de búsqueda está vacío, **When** el odontólogo intenta
   ejecutar la búsqueda, **Then** el sistema no ejecuta ninguna búsqueda y le indica que
   debe ingresar al menos un criterio.

---

### User Story 4 - Editar los datos propios del odontólogo (Priority: P4)

Como odontólogo, quiero ver y editar mi nombre, email y contraseña desde Configuración,
para mantener mis datos correctos y poder actualizar mi contraseña cuando lo necesite.

**Why this priority**: Es de uso poco frecuente comparado con el resto del inicio; el
sistema es utilizable sin esto, pero es necesario para el mantenimiento de la cuenta a
largo plazo.

**Independent Test**: Se puede probar de forma aislada entrando a Configuración,
cambiando el nombre y el email, guardando, y verificando que tanto el saludo del inicio
como los datos guardados reflejan los nuevos valores.

**Acceptance Scenarios**:

1. **Given** que el odontólogo está en Configuración, **When** actualiza su nombre y/o
   email con valores válidos y guarda, **Then** el sistema conserva los nuevos valores y
   el saludo del inicio los refleja de ahí en adelante.
2. **Given** que el odontólogo está en Configuración, **When** intenta guardar un email
   con formato inválido, **Then** el sistema rechaza el cambio y señala el error, sin
   modificar el dato guardado.
3. **Given** que el odontólogo quiere cambiar su contraseña, **When** ingresa
   correctamente su contraseña actual junto con la nueva, **Then** el sistema actualiza
   la contraseña y la exige en el siguiente inicio de sesión.
4. **Given** que el odontólogo quiere cambiar su contraseña, **When** ingresa
   incorrectamente su contraseña actual, **Then** el sistema rechaza el cambio y no
   modifica la contraseña existente.

---

### Edge Cases

- ¿Qué sucede si el odontólogo no tiene pacientes activos aún? El resumen debe mostrar 0
  con una indicación de que puede crear su primer paciente, no un espacio vacío ni un
  error.
- ¿Qué sucede si alguien intenta acceder al inicio o a Configuración sin una sesión
  activa? El sistema debe redirigir a la pantalla de inicio de sesión.
- ¿Qué sucede si se ejecuta la búsqueda del inicio con el campo vacío? El sistema debe
  pedir al menos un criterio de búsqueda, igual que en el listado de pacientes, en lugar
  de mostrar todos los pacientes sin filtro.
- ¿Qué sucede si el odontólogo hace clic en "Insumos"? Debe ver una indicación de que la
  sección estará disponible más adelante, sin errores ni pantallas en blanco.
- ¿Qué sucede si el odontólogo cierra sesión estando en Pacientes o en Configuración, no
  en el inicio? Debe terminar la sesión y redirigir a inicio de sesión igualmente,
  independientemente de la pantalla en la que se encuentre.
- ¿Qué sucede si el odontólogo ingresa mal su contraseña actual al intentar cambiarla?
  El sistema debe rechazar el cambio, no modificar la contraseña vigente y señalar el
  error.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE mostrar, al ingresar al inicio, un saludo personalizado que
  incluya el nombre del odontólogo autenticado.
- **FR-002**: El sistema DEBE mostrar en el inicio el total de pacientes activos actual,
  excluyendo a los archivados.
- **FR-003**: El sistema DEBE mostrar 0 junto con una indicación de que se puede crear el
  primer paciente cuando no exista ningún paciente activo, sin mostrar error.
- **FR-004**: El sistema DEBE proveer una sidebar de navegación, visible desde el inicio,
  con las secciones Pacientes, Insumos, Configuración y Cerrar sesión.
- **FR-005**: El sistema DEBE llevar al odontólogo a la pantalla de gestión de pacientes
  ya existente al seleccionar "Pacientes" en la sidebar.
- **FR-006**: El sistema DEBE mostrar la sección "Insumos" como no disponible o
  "próximamente" al seleccionarla, sin funcionalidad real en esta feature.
- **FR-007**: El sistema DEBE permitir cerrar la sesión activa desde cualquier pantalla
  mediante la opción "Cerrar sesión" de la sidebar, terminando la sesión y redirigiendo a
  la pantalla de inicio de sesión.
- **FR-008**: El sistema DEBE redirigir a la pantalla de inicio de sesión cualquier
  intento de acceder al inicio o a Configuración sin una sesión activa.
- **FR-009**: El sistema DEBE proveer una barra de búsqueda de pacientes en el inicio
  que, al ejecutarse, redirija a la pantalla de Pacientes mostrando los resultados
  correspondientes, reutilizando la misma lógica de búsqueda definida en
  `001-gestion-pacientes` (parcial e insensible a mayúsculas por nombre, exacta por
  documento).
- **FR-010**: El sistema DEBE exigir al menos un criterio de búsqueda antes de ejecutar
  la búsqueda desde el inicio, igual que en el listado de pacientes.
- **FR-011**: El sistema DEBE proveer una pantalla de "Configuración" donde el
  odontólogo pueda ver y editar su propio nombre y email.
- **FR-012**: El sistema DEBE validar el formato del email al guardar cambios en
  Configuración, rechazando valores no válidos sin modificar el dato guardado.
- **FR-013**: El sistema DEBE permitir al odontólogo cambiar su contraseña desde
  Configuración, exigiendo el ingreso correcto de la contraseña actual antes de aceptar
  la nueva.
- **FR-014**: El sistema DEBE rechazar el cambio de contraseña, sin modificar la
  contraseña existente, cuando la contraseña actual ingresada sea incorrecta.
- **FR-015**: El sistema DEBE restringir el acceso al inicio y a Configuración a un único
  usuario autenticado (el propio odontólogo), consistente con el modelo de un solo
  usuario del sistema.

### Key Entities

- **Odontólogo (Usuario del sistema)**: Representa al único usuario autenticado del
  sistema, ya existente desde la funcionalidad de inicio de sesión. Esta feature agrega
  el atributo **nombre** (no existía previamente, cuando el usuario solo tenía email y
  contraseña), necesario para el saludo personalizado y editable junto con el email y la
  contraseña desde Configuración.
- **Paciente**: Ya definido en `001-gestion-pacientes`. Esta feature solo consume su
  estado (activo/archivado) para calcular el total mostrado en el inicio y su
  nombre/documento para la búsqueda; no agrega ni modifica atributos propios.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El odontólogo ve su nombre y el total de pacientes activos en el inicio
  inmediatamente después de iniciar sesión, sin pasos adicionales.
- **SC-002**: El odontólogo llega a la pantalla de Pacientes desde el inicio con una
  sola acción (un clic o toque).
- **SC-003**: Buscar desde el inicio produce exactamente los mismos resultados que
  buscar directamente en Pacientes, para el mismo criterio.
- **SC-004**: El odontólogo actualiza su nombre, email o contraseña sin necesitar ayuda
  externa ni reiniciar sesión manualmente para ver el cambio reflejado en el saludo.
- **SC-005**: El 100% de los intentos de acceder al inicio o a Configuración sin sesión
  activa terminan redirigidos a la pantalla de inicio de sesión, sin excepción.

## Assumptions

- El inicio de sesión (login) ya existe como funcionalidad previa; esta spec asume que
  el odontólogo ya está autenticado al llegar al inicio y no redefine el mecanismo de
  autenticación en sí.
- El Usuario (odontólogo) actualmente solo tiene email y contraseña; se asume razonable
  agregar el atributo nombre como parte de esta feature, ya que es necesario tanto para
  el saludo personalizado como para Configuración.
- Insumos es un placeholder sin funcionalidad real en esta feature; su alcance funcional
  completo queda para una especificación futura separada.
- La búsqueda desde el inicio reutiliza la lógica ya definida en
  `001-gestion-pacientes` (no se reimplementa una búsqueda distinta ni se muestran
  resultados inline en el inicio).
- Es un sistema de un solo usuario: no existen otros odontólogos, roles adicionales, ni
  una lista de usuarios que administrar desde Configuración.
- Cambiar la contraseña exige confirmar la contraseña actual, como práctica estándar de
  seguridad, aunque el sistema sea de un solo usuario.
- Turnos/agenda y facturación siguen fuera de alcance del sistema en general y no se
  referencian ni modelan en esta feature.
