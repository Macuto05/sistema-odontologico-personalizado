# Feature Specification: Gestión de Insumos (Control de Stock de Materiales)

**Feature Branch**: `010-gestion-insumos`

**Created**: 2026-08-06

**Status**: Draft

**Input**: User description: "Gestión de insumos — control de stock de materiales del odontólogo. Como odontólogo, necesito un módulo para registrar todos los insumos o materiales que utiliza y manejar el stock: ingresar el stock actual y cuál debe ser el stock mínimo para que el sistema avise cuando deba reponer. La pantalla debe replicar el mismo diseño, patrón de listado paginado (10 por página) y comportamiento que la pantalla de Gestión de Pacientes, cambiando 'Nuevo paciente' por 'Nuevo insumo'. Columnas del listado: Nombre, Categoría, Stock actual, Stock mínimo, Estado. Búsqueda por nombre y filtro por categoría. Los insumos pueden archivarse (baja lógica) y reactivarse, igual que los pacientes. Además del resaltado visual en la fila cuando el stock está en o por debajo del mínimo, debe existir un aviso en la pantalla de Inicio con la cantidad de insumos a reponer. Fuera de alcance: unidad de medida, proveedor, precio/costo, kardex de movimientos, integración con compras o facturación."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Registrar un insumo nuevo (Priority: P1)

Como odontólogo, cuando incorporo un material o insumo a mi consultorio, quiero crear su
ficha con su nombre, categoría, stock actual y stock mínimo, para empezar a llevar control
de cuánto tengo y cuándo debo reponerlo.

**Why this priority**: Sin esta capacidad no existe registro alguno de insumos; es el punto
de entrada de todo lo demás (control de stock, alertas, búsqueda, edición, archivado).

**Independent Test**: Se puede probar de forma aislada creando un insumo con datos válidos y
verificando que queda guardado y visible en el listado. Entrega valor por sí sola: reemplaza
una planilla o libreta externa de inventario.

**Acceptance Scenarios**:

1. **Given** un formulario de alta de insumo, **When** el odontólogo completa nombre,
   categoría, stock actual y stock mínimo y guarda, **Then** el sistema crea el insumo y lo
   muestra como activo en el listado.
2. **Given** un formulario de alta, **When** el odontólogo intenta guardar sin completar
   nombre, stock actual o stock mínimo, **Then** el sistema impide guardar y señala qué
   campos obligatorios faltan.
3. **Given** un formulario de alta, **When** el odontólogo ingresa un stock actual o un stock
   mínimo negativo, **Then** el sistema rechaza el valor e indica que debe ser un número
   igual o mayor a cero.

---

### User Story 2 - Ver qué insumos deben reponerse (Priority: P2)

Como odontólogo, quiero identificar de un vistazo qué insumos tienen el stock igual o por
debajo del mínimo que definí, para saber qué debo comprar antes de quedarme sin materiales
en plena atención.

**Why this priority**: Es la razón de ser del módulo — llevar el stock sin una forma clara
de detectar faltantes no resuelve el problema que lo origina (reponer a tiempo).

**Independent Test**: Se puede probar de forma aislada cargando insumos con distintos niveles
de stock y verificando que los que están en o por debajo del mínimo quedan visualmente
marcados en el listado y contabilizados en el aviso de la pantalla de Inicio.

**Acceptance Scenarios**:

1. **Given** un insumo cuyo stock actual es menor o igual a su stock mínimo, **When** el
   odontólogo abre el listado de Insumos, **Then** el sistema resalta visualmente esa fila
   como "a reponer".
2. **Given** uno o más insumos activos a reponer, **When** el odontólogo abre la pantalla de
   Inicio, **Then** el sistema muestra la cantidad de insumos a reponer en una tarjeta de
   resumen.
3. **Given** ningún insumo activo en estado de reposición, **When** el odontólogo consulta el
   listado de Insumos o la pantalla de Inicio, **Then** el sistema no muestra ningún insumo
   resaltado y la tarjeta de resumen indica cero insumos a reponer.
4. **Given** un insumo archivado con stock por debajo del mínimo, **When** el odontólogo
   consulta el listado activo o la pantalla de Inicio, **Then** el sistema no lo incluye en
   el resaltado ni en el conteo de insumos a reponer.

---

### User Story 3 - Buscar y filtrar insumos (Priority: P3)

Como odontólogo, quiero encontrar rápidamente un insumo por su nombre o filtrarlos por
categoría, para consultar o actualizar su stock sin recorrer todo el listado.

**Why this priority**: Una vez que hay insumos cargados, la utilidad diaria del módulo
depende de poder encontrarlos rápido; sin búsqueda, el listado crece pero se vuelve
inutilizable.

**Independent Test**: Con varios insumos ya creados en distintas categorías, se puede probar
de forma aislada buscando por un nombre parcial y filtrando por una categoría, y verificando
que los resultados correctos aparecen y los que no coinciden quedan excluidos.

**Acceptance Scenarios**:

1. **Given** varios insumos activos cargados, **When** el odontólogo busca por parte del
   nombre, **Then** el sistema muestra todos los insumos activos cuyo nombre contiene ese
   texto, sin distinguir mayúsculas/minúsculas.
2. **Given** varios insumos cargados en distintas categorías, **When** el odontólogo filtra
   por una categoría, **Then** el sistema muestra únicamente los insumos activos de esa
   categoría.
3. **Given** una búsqueda o filtro que no coincide con ningún insumo activo, **When** el
   odontólogo ejecuta la búsqueda, **Then** el sistema indica claramente que no se
   encontraron resultados.

---

### User Story 4 - Editar y actualizar el stock de un insumo (Priority: P4)

Como odontólogo, quiero corregir los datos de un insumo o actualizar su stock actual después
de usarlo o reponerlo, porque esa información cambia constantemente con el uso diario.

**Why this priority**: Es necesaria para que el control de stock siga siendo confiable en el
tiempo, pero depende de que ya existan insumos cargados y de poder encontrarlos (historias 1
y 3).

**Independent Test**: Se puede probar de forma aislada editando el stock actual (para arriba
o para abajo) u otros datos de un insumo activo existente, y confirmando que los cambios se
guardan y se reflejan en el listado y en el resaltado de "a reponer".

**Acceptance Scenarios**:

1. **Given** un insumo activo existente, **When** el odontólogo actualiza su stock actual
   tras reponer o consumir unidades y guarda, **Then** el sistema conserva el nuevo valor y
   recalcula si el insumo queda o deja de estar en estado de reposición.
2. **Given** un insumo activo existente, **When** el odontólogo modifica su nombre, categoría
   o stock mínimo y guarda, **Then** el sistema conserva los nuevos valores y los refleja en
   el listado.
3. **Given** un insumo archivado, **When** el odontólogo intenta editar sus datos
   directamente, **Then** el sistema requiere reactivar el insumo antes de permitir la
   edición.

---

### User Story 5 - Archivar un insumo que ya no se usa (Priority: P5)

Como odontólogo, quiero dar de baja (archivar) un insumo que dejé de usar, para que deje de
aparecer en mi listado activo y en las alertas de reposición sin perder su historial si vuelvo
a necesitarlo.

**Why this priority**: Mantiene el listado activo limpio y manejable a largo plazo; es
valiosa pero no bloquea el uso básico del módulo (alta, control de stock, búsqueda, edición)
mientras la cantidad de insumos es baja.

**Independent Test**: Se puede probar de forma aislada archivando un insumo activo y
verificando que desaparece del listado, la búsqueda y el conteo de reposición por defecto,
pero sigue existiendo y es recuperable mediante una vista explícita de archivados.

**Acceptance Scenarios**:

1. **Given** un insumo activo, **When** el odontólogo lo archiva, **Then** el sistema lo
   marca como archivado, conserva todos sus datos y lo excluye del listado, búsqueda y aviso
   de reposición por defecto.
2. **Given** un insumo archivado, **When** el odontólogo consulta la vista de insumos
   archivados, **Then** el sistema lo muestra junto con todos sus datos originales.
3. **Given** un insumo archivado, **When** el odontólogo decide reactivarlo, **Then** el
   sistema lo vuelve a marcar como activo y lo incluye nuevamente en el listado, búsqueda y
   aviso de reposición por defecto.

---

### Edge Cases

- ¿Qué sucede si el odontólogo intenta archivar un insumo que ya está archivado? El sistema
  debe indicar que ya se encuentra archivado, sin generar error ni duplicar acción.
- ¿Qué sucede si se busca o filtra con ambos campos vacíos? El sistema debe mostrar el
  listado completo de insumos activos, igual que si no se hubiera aplicado ningún filtro.
- ¿Qué sucede si dos insumos distintos tienen el mismo nombre? El sistema debe permitir
  ambas fichas, ya que no existe un identificador único de negocio para los insumos (a
  diferencia del documento de identidad de los pacientes).
- ¿Qué sucede si el odontólogo baja el stock mínimo por debajo del stock actual, o sube el
  stock actual por encima del mínimo? El sistema debe recalcular de inmediato si el insumo
  sigue o deja de estar en estado de reposición.
- ¿Qué sucede si el odontólogo define el stock mínimo en cero? El sistema debe aceptarlo
  como válido (equivale a "avisar solo cuando el insumo se agote por completo").
- ¿Qué sucede si no existe ninguna categoría cargada todavía? El filtro por categoría debe
  quedar disponible pero sin opciones hasta que se registre al menos un insumo con una
  categoría.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE permitir crear un insumo con los siguientes datos: nombre,
  categoría, stock actual y stock mínimo.
- **FR-002**: El sistema DEBE exigir como obligatorios el nombre, el stock actual y el stock
  mínimo; la categoría es opcional.
- **FR-003**: El sistema DEBE validar que el stock actual y el stock mínimo sean números
  enteros iguales o mayores a cero.
- **FR-004**: El sistema DEBE calcular automáticamente si un insumo está "a reponer" cuando
  su stock actual es igual o menor a su stock mínimo, sin requerir una acción manual del
  odontólogo.
- **FR-005**: El sistema DEBE resaltar visualmente en el listado principal de insumos a todo
  insumo activo que esté "a reponer".
- **FR-006**: El sistema DEBE mostrar en la pantalla de Inicio la cantidad total de insumos
  activos que están "a reponer".
- **FR-007**: El sistema DEBE listar los insumos en páginas de 10 elementos, con navegación
  entre páginas.
- **FR-008**: El sistema DEBE permitir buscar insumos por nombre (coincidencia parcial, sin
  distinguir mayúsculas/minúsculas).
- **FR-009**: El sistema DEBE permitir filtrar insumos por categoría.
- **FR-010**: El sistema DEBE excluir a los insumos archivados de los resultados de búsqueda,
  listados y del conteo de "a reponer" por defecto, salvo que el odontólogo consulte
  explícitamente la vista de archivados.
- **FR-011**: El sistema DEBE permitir editar cualquier dato de un insumo activo, incluido su
  stock actual, y recalcular su estado de reposición al guardar.
- **FR-012**: El sistema DEBE impedir la edición directa de los datos de un insumo archivado
  hasta que el odontólogo lo reactive.
- **FR-013**: El sistema DEBE permitir archivar (dar de baja) un insumo activo sin eliminar
  ninguno de sus datos.
- **FR-014**: El sistema DEBE permitir reactivar un insumo archivado, devolviéndolo al
  listado, búsqueda y conteo de reposición por defecto con todos sus datos intactos.
- **FR-015**: El sistema DEBE conservar el historial completo de datos de un insumo archivado,
  sin pérdida de información, mientras permanezca archivado.
- **FR-016**: El sistema DEBE restringir el acceso a este módulo a un único usuario (el
  propio odontólogo), sin exponer portal ni funcionalidad alguna a terceros.

### Key Entities

- **Insumo**: Representa un material o producto que el odontólogo utiliza en su consultorio.
  Atributos: nombre, categoría (opcional), stock actual, stock mínimo, estado
  (activo/archivado). El estado "a reponer" no se almacena como dato propio, es un valor
  derivado de comparar stock actual contra stock mínimo. No incluye en esta feature unidad de
  medida, proveedor, precio/costo, historial detallado de movimientos (kardex) ni integración
  con compras o facturación —esos quedan fuera de alcance o pertenecen a especificaciones
  futuras separadas.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El odontólogo puede registrar un insumo nuevo completando los datos
  obligatorios en menos de 1 minuto.
- **SC-002**: El sistema identifica el 100% de los insumos activos cuyo stock actual es igual
  o menor a su stock mínimo, y los muestra resaltados sin que el odontólogo tenga que revisar
  cada ficha manualmente.
- **SC-003**: El odontólogo puede saber, con solo abrir la pantalla de Inicio, cuántos
  insumos necesita reponer sin entrar al listado completo.
- **SC-004**: El odontólogo encuentra el insumo correcto mediante nombre o categoría en el
  primer intento de búsqueda o filtro, sin necesidad de recorrer listados manualmente.
- **SC-005**: El 100% de los datos de un insumo archivado permanecen accesibles e íntegros
  tras el archivado, sin pérdida de información.

## Assumptions

- Es un sistema de un solo usuario (el propio odontólogo); el mecanismo de autenticación o
  inicio de sesión en sí queda fuera del alcance de esta feature.
- La categoría es un dato opcional de texto libre (o selección entre categorías ya usadas
  previamente); no se modela como catálogo administrable de forma separada en esta feature.
- No existe un identificador único de negocio para los insumos (a diferencia del documento de
  identidad de los pacientes); dos insumos pueden compartir el mismo nombre.
- El stock actual se actualiza editando directamente el valor en la ficha del insumo; esta
  feature no incluye un registro histórico de movimientos de stock (kardex) ni acciones
  separadas de "reponer" / "consumir" como operaciones independientes.
- Unidad de medida, proveedor y precio/costo unitario no se registran en esta feature; el
  stock se maneja como una cantidad numérica simple definida por el propio odontólogo.
- "Archivar" es una baja lógica (soft-delete): el insumo y todos sus datos se conservan y
  pueden reactivarse; no existe una operación de borrado definitivo en esta feature.
- El diseño visual, el patrón de listado paginado (10 por página) y el comportamiento general
  de la pantalla replican los ya definidos para Gestión de Pacientes (ver
  `001-gestion-pacientes`), manteniendo consistencia entre módulos del sistema.
- Integración con compras, facturación o proveedores es una funcionalidad futura y no se
  modela ni se referencia como dependencia de esta feature.
