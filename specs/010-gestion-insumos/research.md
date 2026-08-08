# Research: Gestión de Insumos

Fase 0 del plan. A diferencia de `001-gestion-pacientes`, esta feature no parte de cero: hereda
el stack y la arquitectura ya ratificados (`.specify/memory/constitution.md`,
`001-gestion-pacientes/research.md`). Las decisiones acá son las que son **específicas de
Insumos** o las que exigen extender algo que ya existe.

## 1. Reutilizar el stack y la arquitectura de Pacientes sin cambios

- **Decision**: mismo stack (Next.js/TypeScript, Prisma/PostgreSQL, Dexie/IndexedDB,
  Auth.js, Zod, Vitest/Playwright) y misma arquitectura local-first que `001-gestion-pacientes`.
- **Rationale**: es la arquitectura ratificada a nivel de proyecto
  (`constitution.md` §Technology & Architecture Constraints), no una decisión por-feature.
  Insumos se usa en el mismo consultorio, con la misma necesidad de funcionar sin conexión
  intermitente que ya motivó local-first para Pacientes — no hay ninguna razón específica de
  este dominio para desviarse.
- **Alternatives considered**: CRUD server-only (sin Dexie/outbox) — se evaluó explícitamente
  con el usuario antes de escribir el spec; se descartó a favor de mantener consistencia
  arquitectónica con el resto del sistema en vez de introducir dos patrones de acceso a datos
  distintos en la misma app (violaría el espíritu del Principio V: dos formas de hacer lo
  mismo es más complejidad, no menos).

## 2. Outbox/motor de sync: extender, no duplicar

- **Decision**: `OutboxOperation` gana un campo `entidad: "PACIENTE" | "INSUMO"`; `tipo`
  sigue siendo `CREAR | EDITAR | ARCHIVAR | REACTIVAR` (genérico, ya lo era). `POST /api/sync`
  acepta operaciones de ambas entidades en el mismo lote, y las agrupa por `entidad` antes de
  aplicarlas contra el repositorio Prisma correspondiente. `syncEngine.ts` no cambia su
  mecánica (intervalo, tamaño de lote, idempotencia por `id` de operación) — solo aprende a
  despachar por `entidad`.
- **Rationale**: el outbox ya resuelve exactamente el problema que Insumos también tiene
  (mutaciones offline encoladas y replicadas en lotes). Crear un segundo mecanismo paralelo
  (`outboxQueueInsumos.ts`, `/api/sync-insumos`) duplicaría lógica ya probada para Pacientes
  sin ninguna diferencia real de requisitos — viola el Principio V (YAGNI/simplicidad:
  "cuando la lógica es similar, duplicación se prefiere solo hasta un cuarto caso de uso
  concreto que lo justifique"; acá no hay ninguna diferencia que lo justifique, es el mismo
  caso de uso con otra entidad).
- **Alternatives considered**: outbox/endpoint separado por entidad — descartado por
  duplicar infraestructura sin beneficio. Un outbox completamente genérico basado en
  `tabla`/`payload` sin tipos fuertes por entidad — descartado, se evaluó pero perdería la
  validación de forma en el límite de aplicación (Principio III); el costo de agregar un
  `enum` de dos valores es menor que ese riesgo.

## 3. Identificador de insumo

- **Decision**: igual que `Paciente` — `id` UUID v4 generado en el **cliente** al crear, no
  autoincremental de servidor.
- **Rationale**: mismo razonamiento que `001-gestion-pacientes/research.md` #3 — un insumo
  creado offline necesita un id definitivo de inmediato para poder editarlo/archivarlo antes
  de sincronizar.
- **Alternatives considered**: ninguna evaluada de nuevo — es una consecuencia directa de la
  decisión #1 (heredar la arquitectura), no una decisión independiente.

## 4. Cálculo de "a reponer": derivado, no almacenado

- **Decision**: el estado "a reponer" (`stockActual <= stockMinimo`) **no** es un campo
  guardado en `Insumo` — se calcula en cada lectura, tanto en el repositorio Dexie (para el
  resaltado en el listado y el conteo de la pantalla de Inicio) como en el Prisma (para
  cualquier consulta directa contra el servidor).
- **Rationale**: si se guardara como campo, podría desincronizarse del stock real (ej. si
  `stockMinimo` se edita sin recalcular el flag), violando el Principio III (nunca un dato
  derivado que pueda mentir sobre el estado real). Al ser una comparación simple de dos
  enteros ya presentes en el registro, calcularlo en cada lectura no tiene costo de
  performance perceptible (Principio VIII) y es imposible que quede desactualizado.
- **Alternatives considered**: campo `aReponer: boolean` recalculado en cada escritura —
  descartado, agrega una responsabilidad extra a cada caso de uso de escritura (mantenerlo
  sincronizado) para un cálculo trivial de leer; más superficie de bug para cero beneficio
  real dado el volumen esperado (decenas/pocos cientos de insumos, spec §Scale/Scope).

## 5. Categoría: texto libre, sin catálogo separado

- **Decision**: `categoria` es un campo de texto opcional en `Insumo`, sin una tabla/catálogo
  `Categoria` separado. El filtro por categoría en el listado se arma a partir de los valores
  distintos ya usados por los insumos activos existentes (`DISTINCT categoria`), no de un
  catálogo administrable aparte.
- **Rationale**: confirmado como supuesto en `spec.md` (§Assumptions). Un catálogo separado
  (con su propia pantalla de administración, unicidad, etc.) es la clase de abstracción
  especulativa que el Principio V pide evitar hasta que un cuarto caso de uso concreto lo
  justifique — hoy no existe ese caso de uso (no se pidió administrar categorías, renombrarlas
  en bloque, ni asociarles metadatos).
- **Alternatives considered**: catálogo `Categoria` con relación FK (como `Consultorio` en el
  modelo de Paciente) — descartado por ahora; si en el futuro se necesita renombrar una
  categoría en bloque o asociarle datos propios, es una migración incremental razonable, no
  una razón para complejizar esta feature hoy.

## 6. Color de resaltado "a reponer"

- **Decision**: reutilizar el color semántico de advertencia/error ya definido en
  `docs/design-system.md` para el resaltado de fila (mismo criterio que cualquier estado de
  alerta existente en el sistema, ej. badges de estado), sin introducir un tono nuevo.
- **Rationale**: Principio VI exige verificar que no exista ya un token aplicable antes de
  agregar uno — "a reponer" es semánticamente una advertencia/alerta de negocio, exactamente
  la categoría que esos tokens ya cubren.
- **Alternatives considered**: color nuevo específico para "stock bajo" — descartado sin
  haber agotado primero los tokens semánticos existentes; se retoma solo si, al implementar,
  el equipo de diseño determina que ninguno de los tokens actuales comunica correctamente la
  urgencia (decisión a confirmar contra `docs/design-system.md` durante la implementación,
  no bloqueante para este plan).

## 7. Tarjeta "Insumos a reponer" en Inicio

- **Decision**: agregar una `MetricaCard` más al patrón ya existente en la pantalla de Inicio
  (mismo componente que "Total Pacientes", "Citas Hoy", etc. en `001`/`002`), mostrando la
  cantidad de insumos activos "a reponer", calculada localmente contra Dexie (decisión #4).
- **Rationale**: reutiliza un componente y un patrón visual ya validado (Principio VI:
  reuse-before-create) en vez de introducir un tipo de aviso nuevo (banner, notificación
  push, etc.) que no tiene precedente en el sistema.
- **Alternatives considered**: badge de conteo en el ítem "Insumos" del Sidebar — evaluado
  explícitamente con el usuario antes del spec y descartado a favor de la tarjeta de Inicio
  (además del resaltado en la fila); notificación/toast — descartada, no hay precedente de
  notificaciones push en el sistema y el spec no lo pidió.
