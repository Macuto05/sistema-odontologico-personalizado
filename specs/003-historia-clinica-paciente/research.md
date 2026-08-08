# Research: Historia Clínica del Paciente

## 1. ¿Entidad separada o campos embebidos en `Paciente`?

**Decision**: Los campos de historia clínica se agregan directamente a la entidad/tabla
`Paciente` existente (`src/domain/entities/Paciente.ts`, modelo `Paciente` de
`prisma/schema.prisma`), no como una entidad ni tabla separada con relación 1:1.

**Rationale**: El spec (§Assumptions) establece explícitamente que la historia clínica es
un estado actual editable en el lugar, sin historial de versiones propio — exactamente el
mismo régimen que ya tienen el resto de los campos de `Paciente` (`telefono`, `direccion`,
etc.). Una tabla separada solo se justificaría si hubiera necesidad de versionado propio,
cardinalidad distinta de 1:1, o consultas que no siempre requieren traer también los datos
personales — ninguna de las tres aplica: la ficha del paciente (US2) siempre muestra
historia clínica junto al resto de la información en una sola pantalla. Agregar una tabla y
un join que siempre se resuelve junto al padre violaría el Principio VIII (evitar
consultas/joins innecesarios) y el Principio V (YAGNI) sin ganar nada a cambio.

**Alternatives considered**: Tabla `HistoriaClinica` con `pacienteId` único (1:1) —
descartada; agrega una segunda tabla, un segundo repositorio y una segunda consulta para un
dato que siempre viaja junto al paciente y nunca se versiona.

## 2. Representación de "Antecedentes personales patológicos"

**Decision**: Enum fijo `AntecedentePatologico` (Prisma) con los 21 valores de FR-002,
almacenado como arreglo nativo de Postgres (`antecedentesPatologicos AntecedentePatologico[]`,
`@default([])`). En el dominio (TypeScript), un union type + `AntecedentePatologico[]`. En
Dexie (cliente), el mismo arreglo de strings — IndexedDB no tiene enums nativos, pero el
tipo TypeScript ya garantiza que solo se guarden valores válidos antes de llegar a Dexie.

**Rationale**: El catálogo es fijo y cerrado por el spec (FR-002, "no configurable por el
odontólogo"); un enum lo hace explícito y auto-documentado en el schema, y Prisma valida en
el límite de escritura (Principio III) que no entren valores fuera de la lista. Un arreglo
nativo evita una tabla puente (`PacienteAntecedente`) — de nuevo, no hay necesidad de
consultar "todos los pacientes con Diabetes" como caso de uso de esta feature, así que la
tabla puente sería especulativa (Principio V).

**Alternatives considered**: Tabla puente `PacienteAntecedente(pacienteId, antecedente)` —
descartada, sobredimensionada para un checklist que solo se lee/escribe completo junto con
el paciente, nunca se filtra por antecedente individual en el spec actual.

## 3. "Otros": ¿casilla + texto, o solo texto?

**Decision**: No existe un booleano `otrosMarcado` separado. La única fuente de verdad es
`antecedentesPatologicosOtros: string | null`. La UI controla la casilla "Otros" como
estado de presentación (mostrar/ocultar el textarea), pero al enviar el formulario:
- si la casilla está desmarcada → se envía `null` sin importar lo que hubiera escrito antes
  (FR-004);
- si está marcada pero el texto queda vacío tras `trim()` → también se envía `null`
  (Edge Cases del spec: "Otros" marcado sin descripción es equivalente a no marcado).

**Rationale**: Con un solo campo de texto como fuente de verdad, no hay forma de que el
estado guardado quede inconsistente (ej. `otrosMarcado: true` con texto vacío) — el edge
case de "Otros marcado sin texto" se resuelve por construcción, no con una validación
adicional que podría olvidarse en un caso de uso futuro.

**Alternatives considered**: Guardar un booleano `otrosMarcado` además del texto —
descartada, introduce un estado redundante que puede desincronizarse del texto real.

## 4. Migración de datos existentes (Postgres + Dexie)

**Decision**: Migración de Prisma puramente aditiva: 4 columnas nuevas, todas con default
seguro (`antecedentesPatologicos` → `[]`, las otras tres `String?` → `null`). No requiere
backfill ni script de datos. En Dexie, se agrega una tabla (`this.version(3)`, ver
`src/infrastructure/db/dexie/db.ts`) siguiendo el mismo patrón aditivo que v1→v2 — los
registros de `pacientes` ya existentes en IndexedDB simplemente no tienen esas propiedades
hasta la próxima sincronización o edición, y el código de lectura las trata como
ausentes/vacías (mismo comportamiento que el default del servidor).

**Rationale**: Satisface SC-005 (pacientes existentes muestran historia clínica vacía sin
error) sin necesidad de un script de backfill — los valores por defecto ya representan
"sin historia clínica cargada".

## 5. Componentes de UI: checklist y texto libre

**Decision**: Se agregan dos componentes nuevos a `src/components/ui/` y se documentan en
`docs/design-system.md` (extensión, no bypass — requerido por el Principio VI):
- `Checkbox.tsx`: casilla individual (label + input), reutilizando los mismos tokens de
  foco/borde/estado que `Input` (§6.2) — el documento ya anticipa "textarea" en el título
  de §6.2 pero ninguna variante de casilla existe todavía.
- `Textarea.tsx`: variante multilínea de `Input` para heredofamiliares, medicamentos y
  alergias (textos potencialmente largos, a diferencia de "Dirección" que es una sola
  línea) — mismos tokens de borde/foco/error que `Input`, altura mínima mayor.

**Rationale**: Principio VI exige revisar el inventario existente antes de crear un
componente y, si no cubre el caso, extender el design system con los mismos tokens en vez
de inventar estilos nuevos. Ninguno de los dos requiere un color, tipografía o espaciado
nuevo — ambos reutilizan la paleta y escala ya ratificadas.

**Alternatives considered**: Un solo `<input type="checkbox">` sin componente reutilizable
por marcado — descartado: son 21 casillas repetidas en este formulario, y un componente
propio evita duplicar el markup de accesibilidad (label asociado, foco, área táctil
≥44×44px) 21 veces.

## 6. Layout del checklist (responsive)

**Decision**: El checklist de antecedentes patológicos se muestra como una grilla de 3
columnas en escritorio (igual criterio que "Datos personales", §6.11), 2 columnas en
tablet y 1 columna en celular — no la grilla fija de 3 columnas del formulario en papel de
referencia, que no es responsive.

**Rationale**: El Principio VI (NON-NEGOTIABLE) exige que toda pantalla funcione en
celular/tablet/escritorio sin scroll horizontal; replicar el layout fijo del papel violaría
esto. El criterio de "3 columnas en desktop, colapsa en breakpoints menores" ya es el
patrón establecido en §6.11 para otras secciones del mismo formulario — se reutiliza en
vez de inventar un layout ad-hoc para 21 ítems.

## 7. Endpoints de API

**Decision**: No se agregan endpoints nuevos. `POST /api/patients` y `PUT /api/patients/:id`
(`specs/001-gestion-pacientes/contracts/patients-api.md`) extienden su body con los 4
campos nuevos; la respuesta (`Paciente` completo) ya los incluye una vez agregados a la
entidad. Se documenta como un addendum en
`specs/003-historia-clinica-paciente/contracts/patients-api-historia-clinica.md` en vez de
duplicar el contrato completo de 001.

**Rationale**: La historia clínica no es un recurso con ciclo de vida propio (no se crea,
archiva o consulta independientemente del paciente) — viaja siempre junto al alta/edición
del paciente, consistente con la decisión #1 de este documento.
