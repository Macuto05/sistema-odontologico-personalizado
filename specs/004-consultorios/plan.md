# Implementation Plan: Consultorios (clasificación de pacientes por sede)

**Branch**: `004-consultorios` | **Date**: 2026-07-31 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-consultorios/spec.md`

## Summary

Nueva entidad `Consultorio` (id, nombre único) que la odontóloga administra desde
Configuración (crear/eliminar) y puede asignar opcionalmente a cada paciente. Es
local-first como `Paciente`: vive en IndexedDB, funciona sin conexión, y se sincroniza con
el servidor. El motor de sync actual es 100% específico de `Paciente` — se generaliza la
cola del outbox (agrega un discriminador de entidad) para que un mismo lote pueda llevar
operaciones de `Paciente` y de `Consultorio`, pero la lógica de "cómo aplicar" cada tipo de
operación se mantiene separada y deliberadamente más simple para `Consultorio` (solo
`CREAR`/`ELIMINAR`, sin `version`/`conflictoPendiente` — no hay edición). Eliminar un
consultorio deja `null` el consultorio de los pacientes que lo tenían asignado, tanto en el
servidor (FK `onDelete: SetNull`) como en cada dispositivo (reconciliación explícita en el
motor de sync, porque IndexedDB no tiene FKs).

## Technical Context

**Language/Version**: TypeScript 5.x sobre Node.js 20+ (sin cambios respecto a features
previas)

**Primary Dependencies**: Las mismas ya ratificadas (Next.js, Prisma, Dexie.js, Zod,
Auth.js) — no se agrega ninguna dependencia nueva para esta feature.

**Storage**: PostgreSQL (`Consultorio` nueva tabla, FK opcional desde `Paciente`) +
IndexedDB vía Dexie (nueva tabla `consultorios`, espejo local-first igual que `pacientes`)

**Testing**: Vitest (casos de uso y repositorios de `Consultorio`, generalización del
outbox), Playwright (flujos de Configuración, selector en el formulario de paciente,
columna del listado, y el escenario de sincronización entre "dispositivos")

**Target Platform**: Web (misma PWA), responsive en los tres breakpoints de
`docs/design-system.md`

**Project Type**: Aplicación web — mismo proyecto Next.js único

**Performance Goals**: La lista de consultorios es corta (unas pocas sedes por
odontóloga) — se lee/escribe siempre contra Dexie local, sin espera de red; el pull
completo de consultorios en cada ciclo de sync es barato precisamente por ser una lista
corta (research.md #4), a diferencia del pull incremental paginado que sí necesita
`Paciente`.

**Constraints**: Crear y eliminar consultorios, y asignarlos a un paciente, deben
funcionar completamente sin conexión (FR-011). Ningún dato se pierde silenciosamente ante
un conflicto de sincronización (nombre duplicado creado en dos dispositivos offline) —
Principio III, mismo criterio que `DOCUMENTO_DUPLICADO` de `Paciente`.

**Scale/Scope**: Un solo usuario; se espera un puñado de consultorios (unidades, no
cientos) — no se diseña para un catálogo grande.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Cumplimiento planeado |
|---|---|
| I. Test-First | Vitest para `IConsultorioRepository` (ambas implementaciones), casos de uso (`crearConsultorio`, `eliminarConsultorio`) y la generalización de `outboxQueue`/`syncEngine`; Playwright para los 3 flujos de UI y el escenario de sync entre dispositivos, escritos antes de la implementación de cada historia. |
| II. Arquitectura en capas | `src/domain/entities/Consultorio.ts` e `IConsultorioRepository` (puerto) sin dependencias de framework, análogos a `Paciente`; `ConsultorioRepositoryPrisma` y `ConsultorioRepositoryDexie` en `infrastructure`; casos de uso en `application/use-cases` no conocen Prisma ni Dexie directamente. |
| III. Integridad y auditoría de datos | Un nombre duplicado detectado durante la sincronización se responde `RECHAZADO` (mismo mecanismo que `DOCUMENTO_DUPLICADO`), nunca se descarta en silencio. Eliminar un consultorio nunca borra ni corrompe datos del paciente — solo su referencia a él pasa a `null` (FR-005), de forma consistente en servidor y en cada dispositivo. |
| IV. Control de acceso por rol | Las rutas nuevas (`GET /api/consultorios`, operaciones de consultorio dentro de `POST /api/sync`) quedan protegidas por el middleware existente, mismo criterio que `/api/patients`. |
| V. Simplicidad y YAGNI | `Consultorio` NO reutiliza el modelo de `version`/`conflictoPendiente` de `Paciente` — no tiene edición, así que esa maquinaria no aplica y no se copia especulativamente. El pull es una lista completa simple, no incremental/paginado (research.md #4) — proporcional al tamaño real esperado (unidades de consultorios), no al patrón que sí necesitó `Paciente` a mayor volumen. Se generaliza únicamente la cola del outbox (mecánica de reintento/lote, 100% idéntica para ambas entidades); la lógica de "cómo aplicar" cada operación se mantiene separada y simple para cada una — con solo 2 entidades, generalizarla también sería abstracción especulativa (research.md #1). |
| VI. Consistencia de UI, responsive y design system | El selector de consultorio reutiliza `Select` (§6.2); la sección de Configuración reutiliza `Card`/`Input`/`Button`/`Alert` ya existentes — sin componentes nuevos. |
| VII. Seguridad y prevención de vulnerabilidades | Prisma parametriza toda consulta nueva; el nombre único se valida en la capa de aplicación antes de tocar la base, igual que `documentoIdentidad`. Sin datos sensibles nuevos. |
| VIII. Rendimiento y acceso eficiente a datos | Lecturas de UI (Configuración y el selector del formulario) contra Dexie local. El listado de pacientes resuelve el nombre del consultorio desde la lista local ya cargada (sin N+1 por fila) — ver research.md #5. |

**Resultado (pre-diseño)**: sin violaciones. La única decisión no trivial (generalizar la
cola del outbox pero no la lógica de aplicación) está documentada en research.md #1 y
justificada por Principio V.

**Re-chequeo post-Fase 1** (tras `data-model.md`, `contracts/`, `quickstart.md`): el diseño
resultante no introduce violaciones nuevas. La reconciliación de borrado en Dexie (research.md
#3) es la única lógica genuinamente nueva del motor de sync — es consecuencia directa de que
`Consultorio` sí admite borrado real (a diferencia de `Paciente`, que solo archiva), no una
abstracción especulativa.

## Project Structure

### Documentation (this feature)

```text
specs/004-consultorios/
├── plan.md              # Este archivo (/speckit-plan)
├── research.md          # Fase 0 (/speckit-plan)
├── data-model.md         # Fase 1 (/speckit-plan)
├── quickstart.md         # Fase 1 (/speckit-plan)
├── contracts/            # Fase 1 (/speckit-plan)
└── tasks.md              # Fase 2 (/speckit-tasks — no generado por este comando)
```

### Source Code (repository root)

```text
src/
├── domain/
│   ├── entities/
│   │   ├── Paciente.ts                        # MODIFICADO — agrega `consultorioId`
│   │   └── Consultorio.ts                     # NUEVO — { id, nombre, createdAt }
│   ├── repositories/
│   │   ├── IPacienteRepository.ts             # MODIFICADO — `consultorioId` en datos de alta/edición
│   │   └── IConsultorioRepository.ts          # NUEVO (puerto) — crear, listar, eliminar
│   └── errors.ts                              # MODIFICADO — agrega NombreConsultorioDuplicadoError
│
├── application/
│   ├── use-cases/
│   │   ├── crearPaciente.ts / editarPaciente.ts  # MODIFICADOS — validan `consultorioId` opcional
│   │   ├── crearConsultorio.ts                # NUEVO
│   │   └── eliminarConsultorio.ts             # NUEVO
│   └── dto/
│       ├── pacienteDto.ts                     # MODIFICADO — `consultorioId` opcional
│       ├── consultorioDto.ts                  # NUEVO
│       └── syncDto.ts                         # MODIFICADO — operación de sync genérica (research.md #1)
│
├── infrastructure/
│   ├── db/
│   │   ├── prisma/
│   │   │   ├── PacienteRepositoryPrisma.ts    # MODIFICADO — incluye/actualiza `consultorioId`
│   │   │   └── ConsultorioRepositoryPrisma.ts # NUEVO
│   │   └── dexie/
│   │       ├── db.ts                          # MODIFICADO — tabla `consultorios`, outbox genérico
│   │       ├── PacienteRepositoryDexie.ts     # MODIFICADO
│   │       └── ConsultorioRepositoryDexie.ts  # NUEVO
│   └── sync/
│       ├── outboxQueue.ts                     # MODIFICADO — genérico por `entidad` (research.md #1)
│       └── syncEngine.ts                      # MODIFICADO — push mixto, pull de Paciente sin cambios
│                                               # + pull/reconciliación nueva de Consultorio (research.md #3)
│
└── app/
    ├── (shell)/
    │   ├── configuracion/page.tsx             # MODIFICADO — sección "Consultorios"
    │   └── pacientes/page.tsx                 # MODIFICADO — columna "Consultorio"
    └── api/
        ├── consultorios/route.ts              # NUEVO — GET (usado por el pull del sync)
        └── sync/route.ts                      # MODIFICADO — despacha por `entidad`

src/components/pacientes/
└── PacienteFormulario.tsx                     # MODIFICADO — Select "Consultorio" (opcional)

prisma/schema.prisma                            # MODIFICADO — modelo Consultorio + FK en Paciente

tests/
├── unit/           # + Consultorio: casos de uso, ambos repositorios, outbox genérico
├── integration/    # + /api/consultorios, /api/sync con operaciones mixtas
└── e2e/            # + Configuración (alta/baja), selector en el formulario, columna del listado,
                     #   sincronización entre dos contextos de navegador (research.md #6)
```

**Structure Decision**: Mismo proyecto Next.js único. `Consultorio` sigue la misma
separación en capas que `Paciente` (`domain` → `application` → `infrastructure`), con
implementaciones paralelas Prisma/Dexie. La única pieza compartida entre ambas entidades es
la cola del outbox (mecánica de lote/reintento) — todo lo demás (entidades, repositorios,
casos de uso, aplicación de operaciones en `/api/sync`) permanece separado y específico de
cada una.

## Complexity Tracking

*Sin violaciones de la Constitution Check — sección no aplica para esta feature.*
