# Implementation Plan: Gestión de Insumos (Control de Stock de Materiales)

**Branch**: `010-gestion-insumos` | **Date**: 2026-08-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/010-gestion-insumos/spec.md`

## Summary

Módulo de un solo usuario (el odontólogo) para dar de alta, buscar/filtrar, editar y
archivar insumos/materiales del consultorio, con detección automática de insumos "a reponer"
(stock actual ≤ stock mínimo) resaltada en el listado y resumida en la pantalla de Inicio.
Replica al detalle la arquitectura y el patrón de pantalla ya ratificados en
`001-gestion-pacientes`: PWA local-first en Next.js/TypeScript, la UI lee y escribe siempre
contra IndexedDB (Dexie.js) en el dispositivo, y una cola de sincronización ("outbox")
replica los cambios contra el backend Next.js + Prisma + PostgreSQL en lotes cuando hay
conexión. No se introduce ninguna decisión de arquitectura nueva — se extiende la ya
existente (ver `research.md`).

## Technical Context

**Language/Version**: TypeScript 5.x sobre Node.js 20+ (mismo proyecto que
`001-gestion-pacientes`, sin cambios de versión)

**Primary Dependencies**: Next.js 15 (App Router, UI + API routes), Prisma ORM, Dexie.js
(IndexedDB en cliente), Auth.js (NextAuth, cuenta única ya configurada), Zod (validación en
el límite de dominio/caso de uso, Principio III) — todas ya presentes en el proyecto, sin
dependencias nuevas.

**Storage**: PostgreSQL (servidor, fuente de verdad) + IndexedDB vía Dexie.js (cliente,
almacén local-first) — mismo esquema de storage que Pacientes, tabla/`store` nuevos para
`Insumo`.

**Testing**: Vitest (unit + integration), Playwright (e2e — incluye escenario de
offline/reconexión y sincronización por lotes, igual que Pacientes)

**Target Platform**: Web (PWA instalable), responsive en celular/tablet/escritorio,
navegadores evergreen modernos

**Project Type**: Aplicación web (mismo codebase Next.js que el resto del sistema; no hay
frontend/backend separados)

**Performance Goals**: Lecturas/escrituras de UI siempre contra IndexedDB local (percibidas
como instantáneas, sin esperar red); el cálculo de "a reponer" (stock actual ≤ stock mínimo)
se resuelve en el cliente sin round-trip adicional; la sincronización en segundo plano no
debe bloquear la interacción del usuario

**Constraints**: Debe funcionar completamente (alta, edición, archivado, cálculo de "a
reponer") sin conexión a internet, igual que Pacientes; ningún conflicto de sincronización
puede perder datos silenciosamente (Principio III); áreas táctiles ≥44×44px; responsive en
los tres breakpoints de `docs/design-system.md`

**Scale/Scope**: Un solo usuario; escala esperada de decenas a un par de cientos de insumos
distintos — sin necesidad de diseño para concurrencia multiusuario

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Cumplimiento planeado |
|---|---|
| I. Test-First | Vitest para casos de uso de dominio (crear/buscar/filtrar/editar/archivar/reactivar Insumo, cálculo de "a reponer") y Playwright para los flujos de usuario del spec, escritos antes de la implementación de cada historia de usuario. |
| II. Arquitectura en capas | `src/domain/entities/Insumo.ts` + `IInsumoRepository.ts` sin dependencias de framework; `src/application/use-cases/*Insumo*.ts` orquesta el dominio; `src/infrastructure` implementa los repositorios (Prisma en servidor, Dexie en cliente); `src/app` es la única capa que conoce el framework. Mismo patrón exacto que `Paciente`. |
| III. Integridad y auditoría de datos | Toda escritura queda asociada a la sesión autenticada (Auth.js, ya configurada). Conflictos de sync entre dispositivos se preservan (nunca se descartan silenciosamente), igual que Pacientes. Validación de campos obligatorios y de stock ≥ 0 ocurre en la capa de aplicación, no solo en la UI. |
| IV. Control de acceso por rol | Sistema de un solo rol (el odontólogo autenticado); toda ruta de API (`/api/insumos/*`) verifica sesión válida vía Auth.js antes de tocar datos. |
| V. Simplicidad y YAGNI | No se modela unidad de medida, proveedor, precio/costo ni kardex de movimientos (fuera de alcance del spec). El outbox/sync existente se **extiende** (campo `entidad`) en vez de crear un segundo mecanismo de sincronización paralelo — evita duplicar infraestructura para un problema ya resuelto. |
| VI. Consistencia de UI, responsive y design system | La pantalla de Insumos reutiliza al detalle los mismos componentes y patrón visual que `/pacientes` (`TopAppBar`, `Tabs`, `Button`, `Input`, `Select`, `Card`, `Alert`, tabla + paginación de 10), sin introducir tokens ni componentes nuevos. Si el resaltado "a reponer" requiere un tono no cubierto por `docs/design-system.md`, se reutiliza el color semántico de advertencia/error ya existente (ver research.md), no uno nuevo. |
| VII. Seguridad y prevención de vulnerabilidades | Prisma parametriza toda consulta; Next.js/React escapan salida por defecto; cada operación de API valida que el registro pertenece a la sesión activa; secretos vía variables de entorno (sin cambios respecto a Pacientes). |
| VIII. Rendimiento y acceso eficiente a datos | Lecturas de UI contra Dexie local. Consultas Prisma con `select`/`include` explícito. El conteo de insumos "a reponer" para la pantalla de Inicio se deriva de la misma lectura local (Dexie), sin una consulta de red adicional. |

**Resultado (pre-diseño)**: sin violaciones. No se requiere completar Complexity Tracking.

**Re-chequeo post-Fase 1** (tras `data-model.md`, `contracts/`, `quickstart.md`): el diseño
resultante no introduce violaciones nuevas.
- Extender `OutboxOperation` con un campo `entidad: "PACIENTE" | "INSUMO"` (ver
  `data-model.md`) reduce complejidad frente a la alternativa (un segundo outbox/engine),
  consistente con el Principio V.
- El campo derivado "a reponer" no se persiste — se calcula en cada lectura, evitando el
  riesgo de que quede desincronizado del stock real (Principio III, sin dato duplicado que
  pueda divergir).
- El contrato de API (`contracts/insumos-api.md`) valida y autoriza cada operación contra la
  sesión activa, consistente con los Principios IV y VII.

Sin violaciones. Complexity Tracking permanece sin completar.

## Project Structure

### Documentation (this feature)

```text
specs/010-gestion-insumos/
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
│   │   └── Insumo.ts                     # Entidad de dominio, sin dependencias de framework
│   └── repositories/
│       └── IInsumoRepository.ts          # Interfaz (puerto), implementada en infrastructure/
│
├── application/
│   ├── use-cases/
│   │   ├── crearInsumo.ts
│   │   ├── buscarInsumos.ts              # incluye filtro por categoría y por "a reponer"
│   │   ├── editarInsumo.ts
│   │   ├── archivarInsumo.ts
│   │   └── reactivarInsumo.ts
│   └── dto/
│       └── insumoDto.ts
│
├── infrastructure/
│   ├── db/
│   │   ├── prisma/
│   │   │   └── InsumoRepositoryPrisma.ts     # Implementación servidor (fuente de verdad)
│   │   └── dexie/
│   │       └── InsumoRepositoryDexie.ts      # Implementación cliente (local-first)
│   └── sync/
│       ├── outboxQueue.ts                    # Existente — se extiende con `entidad`
│       └── syncEngine.ts                     # Existente — aprende a replicar Insumo además de Paciente
│
└── app/
    ├── (shell)/
    │   ├── insumos/
    │   │   ├── page.tsx                      # Listado + búsqueda + filtro por categoría (reemplaza el placeholder actual)
    │   │   ├── nuevo/page.tsx                # Alta
    │   │   ├── archivados/page.tsx           # Vista de archivados
    │   │   └── [id]/page.tsx                 # Ficha / edición
    │   └── page.tsx                          # Inicio — agrega tarjeta "Insumos a reponer"
    └── api/
        └── insumos/
            ├── route.ts                       # GET (listar/buscar/filtrar), POST (crear)
            └── [id]/
                ├── route.ts                    # PUT (editar)
                ├── archive/route.ts            # POST (archivar)
                └── reactivate/route.ts         # POST (reactivar)

prisma/
└── schema.prisma          # + model Insumo, + enum EstadoInsumo (mismo patrón que Paciente)

tests/
├── unit/           # dominio + casos de uso (Vitest)
├── integration/    # rutas de API + Prisma (Vitest)
└── e2e/            # flujos de usuario + escenario offline/sync (Playwright)
```

**Structure Decision**: Mismo proyecto Next.js único, misma separación en capas
(`domain` → `application` → `infrastructure`) que `001-gestion-pacientes`. `Insumo` es una
entidad hermana de `Paciente`, no una variante — tiene su propio repositorio, casos de uso y
DTOs, siguiendo el mismo molde archivo por archivo. La única pieza de infraestructura
**compartida** (no duplicada) es el outbox/motor de sync, extendido para reconocer un
segundo tipo de entidad. El ítem de navegación (`Sidebar`) y el placeholder de
`(shell)/insumos/page.tsx` ya existen (creados en `002-pantalla-inicio`) y se reemplazan, no
se crean desde cero.

## Complexity Tracking

*Sin violaciones de la Constitution Check — sección no aplica para esta feature.*
