# Feature Specification: Indicador de Estado de Sincronización

**Feature Branch**: `011-indicador-sincronizacion`

**Created**: 2026-08-07

**Status**: Draft

**Input**: User description: "Indicador de estado de sincronización, visible en toda la app. El sistema es offline-first: hoy el motor de sincronización no expone ningún estado hacia la UI — el odontólogo no tiene forma de saber si está online/offline, si hay cambios sin enviar, o si algo quedó en conflicto. Se necesita un indicador visual (pill con ícono + texto corto), visible en todas las pantallas del sistema autenticado, en la esquina superior derecha (antes del ícono de Configuración), que comunique: si está online u offline; si hay cambios pendientes de enviar y con qué progreso; y si algún cambio quedó en conflicto sin resolver. Al hacer click se despliega el detalle de cada estado."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Saber si estoy trabajando sin conexión (Priority: P1)

Como odontólogo, quiero ver de un vistazo, en cualquier pantalla, si estoy trabajando sin
conexión a internet, para tener la confianza de que puedo seguir usando el sistema (crear,
editar, archivar) y que mis cambios no se van a perder.

**Why this priority**: Es la base de todo lo demás — sin un indicador de conectividad, el
progreso de sincronización y las alertas de conflicto no tienen dónde mostrarse. Además
resuelve por sí sola la ansiedad más básica del uso offline: "¿esto se está guardando?".

**Independent Test**: Se puede probar de forma aislada cortando la conexión (modo avión o
DevTools → Network → Offline) estando en cualquier pantalla del sistema, y verificando que el
indicador cambia de estado sin necesidad de recargar la página.

**Acceptance Scenarios**:

1. **Given** el odontólogo trabajando con conexión, **When** se corta la conexión a internet,
   **Then** el indicador cambia a un estado "Sin conexión", visible en la esquina superior
   derecha de cualquier pantalla del sistema autenticado.
2. **Given** el odontólogo sin conexión con cambios guardados localmente, **When** hace click
   en el indicador, **Then** ve cuántos cambios quedaron guardados localmente pendientes de
   enviar.
3. **Given** el odontólogo sin conexión, **When** la conexión vuelve, **Then** el indicador
   refleja el nuevo estado (sincronizando o al día) sin necesidad de recargar la página.

---

### User Story 2 - Ver el progreso de envío de mis cambios pendientes (Priority: P2)

Como odontólogo, quiero ver cuánto falta para que mis cambios pendientes terminen de enviarse
al reconectar, para saber si ya es seguro cerrar el sistema o cambiar de dispositivo sin
perder nada.

**Why this priority**: Una vez resuelto el P1 (saber que hay algo pendiente), esto da
confianza activa de que el sistema realmente está trabajando y cuánto falta, en vez de dejar
al odontólogo esperando sin información.

**Independent Test**: Se puede probar de forma aislada generando varios cambios estando sin
conexión (ej. crear o editar varios pacientes), reconectando, y observando que el indicador
muestra el envío en curso con un porcentaje que avanza hasta completarse.

**Acceptance Scenarios**:

1. **Given** varios cambios pendientes de enviar y conexión disponible, **When** el sistema
   empieza a enviarlos, **Then** el indicador muestra que está sincronizando junto con un
   porcentaje que avanza a medida que se envía cada cambio.
2. **Given** que ya se enviaron todos los cambios pendientes y el sistema está trayendo
   actualizaciones del servidor, **Then** el indicador sigue mostrando que está sincronizando,
   sin necesidad de un porcentaje para esta etapa.
3. **Given** que no queda nada pendiente de enviar ni de traer, **Then** el indicador pasa a
   un estado "al día" y, al hacer click, muestra cuándo fue la última sincronización exitosa.

---

### User Story 3 - Enterarme si algún cambio quedó en conflicto (Priority: P3)

Como odontólogo, quiero enterarme si algún cambio que hice no pudo guardarse correctamente en
el servidor (por ejemplo, porque otro dispositivo modificó lo mismo antes), para poder
revisarlo y no asumir por error que ya quedó guardado.

**Why this priority**: Ocurre con menor frecuencia que estar offline o sincronizar, pero es
crítico: sin este aviso, un cambio podría quedar sin aplicarse de forma indefinida y
silenciosa.

**Independent Test**: Se puede probar de forma aislada forzando un conflicto (por ejemplo,
editando el mismo registro desde dos sesiones antes de reconectar una de ellas) y verificando
que el indicador cambia a un estado de alerta y que el detalle lista la entidad afectada.

**Acceptance Scenarios**:

1. **Given** un cambio que el servidor rechazó o marcó en conflicto, **When** ya no hay envíos
   en curso, **Then** el indicador muestra un estado de alerta distinto de los demás ("N con
   conflicto").
2. **Given** el indicador en estado de alerta, **When** el odontólogo hace click, **Then** ve
   una lista de qué registros están afectados (ej. "Paciente Juana Pérez — editar").
3. **Given** un cambio en conflicto sin resolver, **When** el odontólogo navega a cualquier
   otra pantalla del sistema, **Then** el estado de alerta se sigue mostrando — no desaparece
   hasta que el conflicto se resuelva.

---

### Edge Cases

- ¿Qué pasa si se pierde la conexión justo en medio del envío de un lote de cambios? El
  indicador debe volver a "Sin conexión" reflejando el conteo actualizado de pendientes (los
  que se estaban enviando vuelven a contar como pendientes).
- ¿Qué pasa si el odontólogo recarga la página en medio de una sincronización? El porcentaje
  en curso se pierde — el indicador recalcula su estado desde cero al cargar la pantalla (si
  hay pendientes, si hay conflictos, si hay conexión).
- ¿Qué pasa en pantallas que hoy no cuentan con la barra superior existente del sistema (ej.
  panel de atención de una cita, ficha de paciente, odontograma, listado de archivados)? El
  indicador debe aparecer igual, en la misma esquina, sin depender de que esa pantalla tenga
  la barra superior.
- ¿Qué pasa si hay cambios pendientes de enviar y además cambios en conflicto al mismo tiempo?
  Se prioriza mostrar "sincronizando" mientras el envío está en curso; una vez que el envío
  termina, si sigue habiendo conflictos sin resolver, se prioriza la alerta de conflicto por
  sobre el estado "al día".

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST mostrar, en todas las pantallas del área autenticada, un
  indicador visual del estado de sincronización, ubicado en la esquina superior derecha.
- **FR-002**: El indicador MUST reflejar en tiempo real, sin recargar la página, si el
  dispositivo está online u offline.
- **FR-003**: Cuando el dispositivo está offline, el indicador MUST mostrar un estado
  distintivo ("Sin conexión") y, al interactuar con él, MUST mostrar cuántos cambios están
  guardados localmente pendientes de enviar.
- **FR-004**: Cuando el dispositivo está online y hay cambios pendientes de enviar, el sistema
  MUST mostrar el progreso de envío como un porcentaje que avanza a medida que se envían los
  cambios.
- **FR-005**: Mientras el sistema trae actualizaciones del servidor (después de enviar los
  cambios pendientes), el indicador MUST seguir mostrando que está sincronizando, sin mostrar
  un porcentaje para esa etapa.
- **FR-006**: Cuando no hay nada pendiente de enviar ni de traer y el dispositivo está online,
  el indicador MUST mostrar un estado "al día" ("Con conexión") y, al interactuar con él, MUST
  mostrar cuándo fue la última sincronización exitosa.
- **FR-007**: Cuando existan cambios que el servidor rechazó o marcó en conflicto, el sistema
  MUST mostrar un estado de alerta distinto de los demás, incluso si el dispositivo está
  online y no hay nada más pendiente de enviar.
- **FR-008**: Al interactuar con el indicador en estado de alerta, el sistema MUST mostrar qué
  registros están afectados por el conflicto (identificación del registro y tipo de
  operación).
- **FR-009**: El indicador MUST priorizar qué estado mostrar cuando aplica más de uno a la
  vez, en este orden: sin conexión, sincronizando, con conflicto, al día.
- **FR-010**: El indicador MUST aparecer también en las pantallas que no cuentan con la barra
  superior existente del sistema (ej. panel de atención de una cita, ficha de paciente,
  odontograma, listado de archivados), sin duplicarse en las pantallas que sí la tienen.

### Key Entities

- **Cambio pendiente de sincronizar**: un cambio hecho localmente (crear, editar, archivar,
  etc.) que todavía no fue confirmado por el servidor. Ya existe como concepto en el sistema
  (la cola de sincronización); esta funcionalidad solo lo hace visible.
- **Cambio en conflicto**: un cambio pendiente que el servidor rechazó o marcó como
  conflictivo (por ejemplo, porque otro dispositivo modificó el mismo registro antes). Se
  identifica por el registro afectado y el tipo de operación que se intentó.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El odontólogo puede determinar si está trabajando online u offline mirando
  cualquier pantalla del sistema, sin usar herramientas técnicas.
- **SC-002**: Al reconectar después de trabajar offline con cambios pendientes, el odontólogo
  puede ver en todo momento qué porcentaje de sus cambios ya se enviaron, hasta llegar al
  100%.
- **SC-003**: Ante un cambio que no pudo sincronizarse, el odontólogo se entera sin tener que
  revisar cada pantalla individualmente en busca del problema.
- **SC-004**: El indicador está visible en el 100% de las pantallas del área autenticada del
  sistema.

## Assumptions

- El progreso de sincronización mostrado es efímero: si se recarga la página en medio de un
  ciclo, el porcentaje se recalcula desde cero, no se persiste entre sesiones.
- La resolución de conflictos (qué hacer con un cambio rechazado) queda fuera de esta
  funcionalidad — el indicador solo informa cuáles existen, no ofrece una acción para
  resolverlos desde ahí.
- El progreso de envío se calcula sobre los cambios pendientes de enviar (push); la etapa de
  traer cambios del servidor (pull) se muestra como "sincronizando" sin porcentaje, porque no
  tiene una cantidad total conocida de antemano al ser un proceso paginado.
- No incluye notificaciones sonoras ni del sistema operativo, ni un historial de
  sincronizaciones pasadas — solo el estado actual y la fecha de la última sincronización
  exitosa.
- Se apoya en el motor de sincronización por lotes ya existente; esta funcionalidad únicamente
  lo hace visible al odontólogo, no cambia su lógica de reintentos ni de resolución de
  conflictos.
