# Feature Specification: Tema de apariencia (Azul / Morado)

**Feature Branch**: `007-tema-apariencia`

**Created**: 2026-08-03

**Status**: Draft

**Input**: User description: "Agregar una sección \"Apariencia\" a la pestaña de Configuración (/configuracion) que permita elegir entre dos temas de color: Azul (predeterminado, el actual, basado en la escala --color-cyan) y Morado (nuevo, basado en una nueva escala --color-purple con base #6d28d9). La selección se aplica al instante (sin botón Guardar) mediante un atributo data-theme=\"morado\" en <html> que sobreescribe solo los tokens semánticos --color-primary, --color-primary-hover, --color-primary-active, --color-primary-accent y --color-ring (los colores de estado: éxito/error/advertencia/info NO cambian con el tema). La preferencia se persiste por navegador en localStorage (clave \"tema\"), siguiendo el mismo patrón ya usado para \"sidebar-colapsada\" (leer en un useEffect post-mount para evitar mismatch de hidratación SSR). La UI son dos swatches clicables (azul/morado) dentro de una nueva <Card> \"Apariencia\", ubicada entre las secciones existentes \"Tus datos\" y \"Cambiar contraseña\" en configuracion/page.tsx. Requiere: agregar la nueva escala de primitivos --color-purple-50/600/700/800/900 a docs/design-system.md (Principio VI) antes de tocar globals.css, agregar el bloque [data-theme=\"morado\"] a globals.css, y un hook useTema() en src/hooks/useTema.ts que exponga { tema, setTema } y aplique document.documentElement.dataset.theme."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Elegir el tema morado (Priority: P1)

Como usuario del sistema, quiero poder elegir un tema de color morado en vez del azul predeterminado, para personalizar la apariencia de la aplicación a mi gusto.

**Why this priority**: Es la funcionalidad central pedida: sin esto no existe la feature. Entrega valor por sí sola (el usuario puede cambiar de tema) y es la base sobre la que se apoyan las demás historias.

**Independent Test**: Puede probarse completamente entrando a Configuración, haciendo clic en el swatch morado y verificando que los botones, links y elementos de foco de la interfaz cambian de azul a morado en el momento.

**Acceptance Scenarios**:

1. **Given** el usuario está en la pestaña Configuración con el tema azul activo, **When** hace clic en el swatch morado de la sección "Apariencia", **Then** los elementos primarios de la interfaz (botones, enlaces, foco) pasan a mostrarse en morado sin necesidad de guardar ni recargar la página.
2. **Given** el tema morado está activo, **When** el usuario hace clic en el swatch azul, **Then** la interfaz vuelve a mostrarse en azul de inmediato.
3. **Given** el tema morado está activo, **When** se muestra una alerta de éxito, error o advertencia en cualquier pantalla, **Then** esa alerta conserva sus colores habituales (verde/rojo/ámbar) sin verse afectada por el tema.

---

### User Story 2 - La preferencia de tema persiste entre sesiones (Priority: P2)

Como usuario que ya eligió el tema morado, quiero que la aplicación lo recuerde la próxima vez que la abra en el mismo navegador, para no tener que volver a seleccionarlo cada vez.

**Why this priority**: Sin persistencia, la elección del usuario se pierde en cada recarga, lo cual hace la funcionalidad frustrante de usar en la práctica aunque técnicamente "funcione". Depende de que la Historia 1 exista primero.

**Independent Test**: Puede probarse eligiendo el tema morado, recargando la página (o cerrando y volviendo a abrir el navegador) y verificando que el tema morado sigue activo sin tener que volver a seleccionarlo.

**Acceptance Scenarios**:

1. **Given** el usuario eligió el tema morado, **When** recarga la página o vuelve a entrar al sistema más tarde en el mismo navegador, **Then** la interfaz se muestra en morado sin que tenga que volver a seleccionarlo.
2. **Given** un usuario nuevo que nunca eligió un tema en ese navegador, **When** entra al sistema por primera vez, **Then** ve el tema azul (predeterminado).
3. **Given** el usuario eligió el tema morado en un navegador, **When** entra al sistema desde otro dispositivo o navegador distinto, **Then** ve el tema azul predeterminado en ese otro navegador (la preferencia no viaja entre dispositivos).

---

### User Story 3 - Ver claramente cuál tema está activo (Priority: P3)

Como usuario en la sección "Apariencia" de Configuración, quiero ver con claridad cuál de los dos temas está seleccionado actualmente, para no tener dudas de en qué estado está la aplicación.

**Why this priority**: Es una mejora de claridad sobre las historias anteriores; el cambio de tema (Historia 1) ya es utilizable sin esto, pero sin una indicación visual del estado activo el usuario puede confundirse sobre cuál opción está aplicada.

**Independent Test**: Puede probarse entrando a la sección "Apariencia" y verificando que el swatch correspondiente al tema activo se distingue visualmente del otro (por ejemplo, con un borde o marca de selección).

**Acceptance Scenarios**:

1. **Given** el tema azul está activo, **When** el usuario abre la sección "Apariencia", **Then** el swatch azul se muestra visualmente marcado como seleccionado y el morado no.
2. **Given** el usuario cambia de tema, **When** la selección se aplica, **Then** la marca de "seleccionado" se mueve de inmediato al swatch correspondiente al nuevo tema.

---

### Edge Cases

- ¿Qué pasa si el usuario tiene bloqueado o deshabilitado el localStorage del navegador (modo privado estricto, política corporativa)? La aplicación debe seguir funcionando con el tema azul predeterminado, sin errores visibles para el usuario.
- ¿Qué pasa durante el primer instante de carga de la página, antes de que se pueda leer la preferencia guardada? Puede haber un parpadeo breve mostrando el tema azul antes de aplicar el morado guardado; es un comportamiento aceptado, ya presente en otras preferencias de interfaz del sistema (por ejemplo, el colapso de la barra lateral).
- ¿Qué pasa si el valor guardado en la preferencia de tema no es "azul" ni "morado" (dato corrupto o de una versión futura)? El sistema debe tratarlo como si no hubiera preferencia guardada y mostrar el tema azul predeterminado.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE ofrecer, dentro de la pestaña Configuración, una sección "Apariencia" donde el usuario pueda elegir entre el tema "Azul" y el tema "Morado".
- **FR-002**: El sistema DEBE aplicar el tema elegido de inmediato al hacer la selección, sin requerir un paso adicional de confirmación o guardado.
- **FR-003**: El sistema DEBE usar el tema "Azul" como predeterminado para cualquier usuario que no haya elegido un tema previamente en ese navegador.
- **FR-004**: El sistema DEBE recordar el tema elegido por el usuario en ese navegador y aplicarlo automáticamente en visitas posteriores, sin que el usuario deba volver a seleccionarlo.
- **FR-005**: La preferencia de tema DEBE ser específica del navegador/dispositivo donde se eligió, y no debe compartirse ni sincronizarse automáticamente hacia otros navegadores o dispositivos del mismo usuario.
- **FR-006**: El cambio de tema DEBE afectar únicamente los colores primarios/de acento de la interfaz (botones, enlaces, indicadores de foco); los colores que comunican estado (éxito, error, advertencia, información) DEBEN mantenerse iguales sin importar el tema activo.
- **FR-007**: La sección "Apariencia" DEBE indicar visualmente, en todo momento, cuál de los dos temas está activo actualmente.
- **FR-008**: Si la preferencia de tema no puede leerse o guardarse (por ejemplo, por restricciones del navegador), el sistema DEBE seguir funcionando normalmente mostrando el tema azul predeterminado, sin mostrar errores al usuario.

### Key Entities

- **Preferencia de tema**: valor elegido por el usuario ("azul" o "morado"), asociado al navegador/dispositivo actual, no a la cuenta de usuario. Determina qué paleta de colores primarios se aplica en toda la interfaz.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un usuario puede cambiar del tema azul al morado (o viceversa) en menos de 5 segundos desde que entra a la sección Apariencia, sin recargar la página.
- **SC-002**: El 100% de las alertas de éxito, error y advertencia conservan su color habitual sin importar el tema de apariencia activo.
- **SC-003**: Un usuario que eligió el tema morado lo vuelve a ver activo en el 100% de sus visitas posteriores desde el mismo navegador, sin tener que reseleccionarlo.
- **SC-004**: Un usuario puede identificar cuál tema está activo con solo mirar la sección Apariencia, sin necesidad de probar a hacer clic.

## Assumptions

- La preferencia de tema es por navegador (almacenamiento local), no por cuenta de usuario ni por consultorio/clínica — así se decidió explícitamente para esta primera versión; sincronizar el tema entre dispositivos queda fuera de alcance.
- Los únicos dos temas disponibles en esta versión son "Azul" y "Morado"; no se contempla un modo oscuro ni temas adicionales.
- Los colores de estado (éxito, error, advertencia, información) son independientes del tema de apariencia y no se ven afectados por esta funcionalidad.
- El tono exacto del morado (basado en el color de referencia provisto por el usuario) queda sujeto a un ajuste fino de diseño durante la implementación, siempre que mantenga contraste y legibilidad equivalentes a los del tema azul actual.
