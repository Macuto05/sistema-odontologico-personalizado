# Feature Specification: Rediseño visual del sistema (estilo mockup DentalPro)

**Feature Branch**: `008-rediseno-visual-sistema`

**Created**: 2026-08-04

**Status**: Draft

**Input**: User description: "Adoptar formalmente la nueva identidad visual moderna (paleta teal/cyan tipo Material 3, tipografía Inter, sombras suaves, topbar con glassmorphism, tarjetas de métricas tipo bento, tabs tipo switch animado, tabla de datos con hover y badges) como el sistema de diseño oficial del proyecto, documentándola en docs/design-system.md, y corregir los 4 bugs concretos que quedaron de la primera pasada aplicada sobre /pacientes."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - El listado de Pacientes se ve y se comporta correctamente (Priority: P1)

La odontóloga abre la pantalla de Pacientes en su laptop. La barra superior (buscador,
configuración, botón "+Nuevo paciente") ocupa todo el ancho disponible sin dejar huecos, el
listado de pacientes está pegado al borde de la sidebar sin espacio en blanco desperdiciado a
la izquierda, y al colapsar o expandir la sidebar todo el contenido (barra superior y listado)
se reacomoda junto con ella, en vez de quedar desalineado.

**Why this priority**: Es el bug más visible y repetido — la odontóloga lo reportó en varias
rondas de feedback y actualmente hace que la pantalla principal del sistema se vea rota.

**Independent Test**: Abrir `/pacientes`, alternar el botón de colapso de la sidebar varias
veces, y confirmar visualmente que no aparece espacio en blanco entre la sidebar y el
contenido en ningún estado (expandida o colapsada).

**Acceptance Scenarios**:

1. **Given** la sidebar está expandida, **When** la odontóloga abre `/pacientes`, **Then** la
   barra superior llega hasta el borde derecho de la ventana y el listado de pacientes queda
   pegado al borde derecho de la sidebar, sin franja en blanco entre ambos.
2. **Given** la odontóloga está en `/pacientes` con la sidebar expandida, **When** colapsa la
   sidebar, **Then** tanto la barra superior como el listado se desplazan hacia la izquierda
   para ocupar el espacio liberado, con una transición suave.
3. **Given** la odontóloga está en `/pacientes` con la sidebar colapsada, **When** la expande
   de nuevo, **Then** la barra superior y el listado vuelven a acomodarse sin quedar más
   desplazados hacia la derecha de lo que corresponde al ancho real de la sidebar.

---

### User Story 2 - Los íconos y botones de la barra superior se ven correctamente (Priority: P1)

La odontóloga mira el ícono de configuración y lo reconoce como un engranaje (no como una
figura confusa superpuesta), y ve el botón "+Nuevo paciente" con su texto limpio, sin líneas
de subrayado que no pidió.

**Why this priority**: Son defectos visuales concretos y fáciles de notar que dan una
impresión de descuido en la pantalla que la odontóloga usa a diario.

**Independent Test**: Abrir `/pacientes` e inspeccionar visualmente el ícono de configuración
y el botón "+Nuevo paciente" en la barra superior.

**Acceptance Scenarios**:

1. **Given** la odontóloga está en cualquier pantalla con la barra superior visible, **When**
   mira el ícono de la derecha, junto al botón "+Nuevo paciente", **Then** ve un único ícono
   de engranaje reconocible, sin líneas ni figuras adicionales superpuestas.
2. **Given** la odontóloga está en cualquier pantalla con la barra superior visible, **When**
   mira el botón "+Nuevo paciente", **Then** el texto no tiene subrayado ni cambia a un color
   de enlace visitado — se ve como un botón sólido normal.

---

### User Story 3 - El nuevo estilo visual queda documentado para uso futuro (Priority: P2)

Cuando la odontóloga pida agregar o rediseñar otra pantalla más adelante, el nuevo estilo
visual (colores, tipografía, sombras, patrones de componentes ya construidos) está descrito
en un único documento de referencia del proyecto, de forma que cualquier trabajo futuro lo
siga por defecto sin tener que volver a explicar el mockup desde cero.

**Why this priority**: Es una inversión para reducir fricción en rondas futuras de trabajo
visual — no bloquea el uso diario del sistema, pero evita que el estilo se vuelva
inconsistente a medida que se toquen más pantallas.

**Independent Test**: Abrir el documento de sistema de diseño del proyecto y confirmar que
describe la paleta de colores, tipografía, sombras y los patrones de componentes nuevos
(barra superior, tarjetas de métricas, switch de pestañas, tabla de datos) con el detalle
suficiente para aplicarlos a una pantalla nueva sin mirar el mockup original.

**Acceptance Scenarios**:

1. **Given** alguien va a diseñar una pantalla nueva del sistema, **When** consulta el
   documento de sistema de diseño, **Then** encuentra los valores de color, tipografía,
   radios de borde y sombras del nuevo estilo, junto con una nota de qué pantallas ya lo usan
   y cuáles siguen pendientes de migrar.

---

### Edge Cases

- ¿Qué pasa en pantallas angostas (tablet/celular) donde la sidebar ya cambia de forma por su
  propio breakpoint responsive? La barra superior y el contenido deben seguir alineados con el
  ancho de sidebar que corresponda a ese breakpoint, sin reintroducir el espacio en blanco.
- ¿Qué pasa en una pantalla que todavía no fue migrada al nuevo estilo (por ejemplo Inicio o
  Insumos) pero que sí queda dentro del mismo layout con sidebar? Debe seguir viéndose como
  hasta ahora — esta spec no la toca — y no debe romperse por los cambios de layout compartido
  (`ShellLayout`) que sí se tocan acá.
- ¿Qué pasa si el usuario alterna la sidebar muy rápido varias veces seguidas? La barra
  superior y el contenido deben mantenerse sincronizados entre sí en todo momento, sin quedar
  uno adelantado respecto al otro.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El contenido principal de cualquier pantalla dentro del layout con sidebar
  (empezando por Pacientes) MUST desplazarse exactamente una vez para compensar el ancho de la
  sidebar — no debe haber compensaciones duplicadas que dejen espacio en blanco extra.
- **FR-002**: La barra superior fija (buscador, configuración, acción principal) MUST
  mantenerse alineada al borde de la sidebar en todo momento, incluyendo cuando la sidebar
  cambia entre su estado expandido y colapsado.
- **FR-003**: El desplazamiento del contenido principal y de la barra superior al
  expandir/colapsar la sidebar MUST ocurrir con una transición suave, consistente con la
  transición que ya usa la propia sidebar (no debe verse como un salto instantáneo).
- **FR-004**: El ícono de configuración de la barra superior MUST mostrar un único símbolo de
  engranaje, sin figuras adicionales superpuestas.
- **FR-005**: El botón de acción principal de la barra superior ("+Nuevo paciente" u
  equivalente en otras pantallas) MUST mostrarse sin subrayado ni color de enlace, aunque
  internamente navegue a otra ruta.
- **FR-006**: El sistema MUST tener un único documento de referencia (sistema de diseño del
  proyecto) que describa los tokens visuales del nuevo estilo (paleta de colores, tipografía,
  radios de borde, sombras) y los patrones de componentes construidos en esta ronda (barra
  superior, tarjetas de métricas, switch de pestañas, tabla de datos moderna).
- **FR-007**: El documento de sistema de diseño MUST indicar explícitamente qué pantallas del
  sistema ya usan el nuevo estilo visual y cuáles todavía no, para que trabajo futuro sepa
  dónde aplicar el patrón nuevo por defecto y dónde todavía convive con el estilo anterior.
- **FR-008**: Los cambios de esta ronda MUST limitarse a corregir el comportamiento visual del
  layout compartido y de la barra superior — no deben alterar el comportamiento funcional ya
  aceptado del listado de Pacientes (columnas mostradas, paginación, búsqueda, el switch
  Activos/Archivados).

### Key Entities

No aplica — esta funcionalidad es exclusivamente de presentación (layout y estilos visuales),
no introduce ni modifica entidades de datos.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Al expandir o colapsar la sidebar desde `/pacientes`, no queda ningún espacio en
  blanco visible entre el borde de la sidebar y el contenido principal, en ninguno de los dos
  estados.
- **SC-002**: El ícono de configuración y el botón de acción principal de la barra superior se
  ven visualmente limpios (sin superposiciones ni subrayados no deseados) en el 100% de las
  pantallas que usan la barra superior.
- **SC-003**: Una persona que consulte el documento de sistema de diseño puede identificar los
  valores de color, tipografía y sombra del nuevo estilo, y qué pantallas ya lo adoptaron, sin
  tener que pedir el mockup original de nuevo.
- **SC-004**: El comportamiento del listado de Pacientes (columnas, paginación, búsqueda,
  Activos/Archivados) permanece idéntico al que ya fue validado antes de esta ronda.

## Assumptions

- El layout compartido (`ShellLayout`, sidebar con colapso manual/por ruta) es el único punto
  donde se resuelve el desplazamiento por sidebar; cualquier página o componente fijo dentro de
  ese layout debe sincronizarse con ese mismo estado en vez de manejar su propio ancho de
  sidebar por separado.
- El resto de las pantallas del sistema (Inicio, Insumos, ficha de paciente, Odontograma,
  Citas, Configuración) sigue con el estilo visual anterior y queda explícitamente fuera de
  esta ronda — se migrarán en specs futuras, pantalla por pantalla.
- El toggle Activos/Archivados y las columnas de la tabla de Pacientes ya quedaron correctos en
  la iteración visual anterior y no se tocan en esta spec.
- La documentación del nuevo estilo se agrega como una nueva sección versionada dentro del
  documento de sistema de diseño ya existente del proyecto, siguiendo su mismo formato de
  versión y registro de cambios que ya usa para rondas anteriores.
