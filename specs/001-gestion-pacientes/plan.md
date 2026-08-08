# Implementation Plan: Gestión de Pacientes (Ficha y Control Propio del Odontólogo)

**Branch**: `001-gestion-pacientes` | **Date**: 2026-07-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-gestion-pacientes/spec.md`

## Summary

Módulo de un solo usuario (el odontólogo) para dar de alta, buscar, editar y archivar
fichas de pacientes, con el documento de identidad como identificador único. Se construye
como una PWA local-first en Next.js/TypeScript: la UI lee y escribe siempre contra
IndexedDB (Dexie.js) en el dispositivo, y una cola de sincronización ("outbox") replica los
cambios contra un backend Next.js + Prisma + PostgreSQL en lotes cuando hay conexión — esto
resuelve el requisito de uso sin internet en el consultorio, confirmado con el usuario.

## Technical Context

**Language/Version**: TypeScript 5.x sobre Node.js 20+

**Primary Dependencies**: Next.js 15 (App Router, UI + API routes), Prisma ORM, Dexie.js
(IndexedDB en cliente), Auth.js (NextAuth, cuenta única), Zod (validación en el límite de
dominio/caso de uso, Principio III), bcrypt/argon2 (hash de contraseña, vía Auth.js)

**Storage**: PostgreSQL (servidor, fuente de verdad) + IndexedDB vía Dexie.js (cliente,
almacén local-first)

**Testing**: Vitest (unit + integration), Playwright (e2e — incluye escenario de
offline/reconexión y sincronización por lotes)

**Target Platform**: Web (PWA instalable), responsive en celular/tablet/escritorio,
navegadores evergreen modernos

**Project Type**: Aplicación web (un solo código Next.js para UI + API; no hay
frontend/backend separados como proyectos distintos)

**Performance Goals**: Lecturas/escrituras de UI siempre contra IndexedDB local (percibidas
como instantáneas, sin esperar red); la sincronización en segundo plano no debe bloquear la
interacción del usuario

**Constraints**: Debe funcionar completamente (lectura y escritura de fichas) sin conexión a
internet; ningún conflicto de sincronización puede perder datos silenciosamente (Principio
III); áreas táctiles ≥44×44px; responsive en los tres breakpoints de
`docs/design-system.md`

**Scale/Scope**: Un solo usuario; escala esperada de cientos a pocos miles de fichas de
paciente a lo largo de varios años — sin necesidad de diseño para concurrencia multiusuario

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Cumplimiento planeado |
|---|---|
| I. Test-First | Vitest para casos de uso de dominio (crear/buscar/editar/archivar/reactivar) y Playwright para los flujos de usuario del spec, escritos antes de la implementación de cada historia de usuario. |
| II. Arquitectura en capas | `src/domain` (entidad `Paciente`, interfaz de repositorio) sin dependencias de framework; `src/application` (casos de uso) orquesta el dominio; `src/infrastructure` implementa los repositorios (Prisma en servidor, Dexie en cliente) y el motor de sync; `src/app` (Next.js) es la única capa que conoce el framework. Dependencias solo hacia adentro. |
| III. Integridad y auditoría de datos | Toda escritura queda asociada a la sesión autenticada (Auth.js). Las ediciones no se pierden ante conflicto de sync entre dispositivos — se preservan ambas versiones y se marca para revisión, nunca se descarta silenciosamente. Validación de campos obligatorios/unicidad ocurre en la capa de aplicación (casos de uso), no solo en la UI. |
| IV. Control de acceso por rol | Sistema de un solo rol (el odontólogo autenticado); toda ruta de API (`/api/patients/*`, `/api/sync`) verifica sesión válida vía Auth.js antes de tocar datos — no hay confianza implícita del lado del cliente. |
| V. Simplicidad y YAGNI | Se descartó un motor de sync de terceros (RxDB/ElectricSQL/PowerSync) por sobredimensionado para un solo usuario; outbox casero es la solución proporcional. No se modelan historia clínica, turnos ni facturación — fuera de alcance del spec. |
| VI. Consistencia de UI, responsive y design system | Toda la UI usa los tokens y componentes de `docs/design-system.md` (v1.2.0); layout responsive verificado en los tres breakpoints (4.0) antes de dar una pantalla por terminada. |
| VII. Seguridad y prevención de vulnerabilidades | Prisma parametriza toda consulta (previene SQL injection); Next.js/React escapan salida por defecto (previene XSS); cada operación de API valida que el registro pertenece a la sesión activa (previene IDOR, aunque de un solo usuario); Auth.js + bcrypt/argon2 para autenticación; secretos vía variables de entorno. |
| VIII. Rendimiento y acceso eficiente a datos | Lecturas de UI contra Dexie local, no contra red, en el camino normal. Consultas Prisma con `select`/`include` explícito, sin N+1. Sincronización en lotes, no una request por operación pendiente. |

**Resultado (pre-diseño)**: sin violaciones. No se requiere completar Complexity Tracking.

**Re-chequeo post-Fase 1** (tras `data-model.md`, `contracts/`, `quickstart.md`): el diseño
resultante no introduce violaciones nuevas.
- El manejo de conflictos de sync (`conflictoPendiente` en `Paciente`, ver `data-model.md`)
  refuerza el Principio III en vez de tensionarlo — ninguna edición se descarta
  silenciosamente.
- `OutboxOperation` es una entidad técnica adicional (no prevista originalmente en el spec),
  pero es consecuencia directa del requisito de funcionamiento offline confirmado con el
  usuario, no una abstracción especulativa — no viola el Principio V.
- Los contratos de API (`contracts/patients-api.md`, `contracts/sync-api.md`) validan y
  autorizan cada operación contra la sesión activa, consistente con los Principios IV y VII.

Sin violaciones. Complexity Tracking permanece sin completar.

## Project Structure

### Documentation (this feature)

```text
specs/001-gestion-pacientes/
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
│   │   └── Paciente.ts               # Entidad de dominio, sin dependencias de framework
│   └── repositories/
│       └── IPacienteRepository.ts    # Interfaz (puerto), implementada en infrastructure/
│
├── application/
│   ├── use-cases/
│   │   ├── crearPaciente.ts
│   │   ├── buscarPacientes.ts
│   │   ├── editarPaciente.ts
│   │   ├── archivarPaciente.ts
│   │   └── reactivarPaciente.ts
│   └── dto/
│       └── pacienteDto.ts
│
├── infrastructure/
│   ├── db/
│   │   ├── prisma/
│   │   │   └── PacienteRepositoryPrisma.ts   # Implementación servidor (fuente de verdad)
│   │   └── dexie/
│   │       └── PacienteRepositoryDexie.ts    # Implementación cliente (local-first)
│   ├── sync/
│   │   ├── outboxQueue.ts                    # Cola de operaciones pendientes (Dexie)
│   │   └── syncEngine.ts                     # Replay en lotes al reconectar
│   └── auth/
│       └── auth.config.ts                    # Auth.js, cuenta única
│
└── app/                                       # Next.js App Router — presentación
    ├── pacientes/
    │   ├── page.tsx                           # Listado + búsqueda
    │   ├── nuevo/page.tsx                     # Alta
    │   ├── archivados/page.tsx                # Vista de archivados
    │   └── [id]/page.tsx                      # Ficha / edición
    └── api/
        ├── patients/
        │   ├── route.ts                       # GET (listar/buscar), POST (crear)
        │   └── [id]/
        │       ├── route.ts                   # PUT (editar)
        │       ├── archive/route.ts           # POST (archivar)
        │       └── reactivate/route.ts        # POST (reactivar)
        └── sync/
            └── route.ts                       # POST — recibe lote de operaciones del outbox

prisma/
└── schema.prisma

tests/
├── unit/           # dominio + casos de uso (Vitest)
├── integration/    # rutas de API + Prisma (Vitest)
└── e2e/            # flujos de usuario + escenario offline/sync (Playwright)
```

**Structure Decision**: Un único proyecto Next.js (no hay "backend" y "frontend" como
carpetas/proyectos separados — Next.js provee ambos). La separación en capas del Principio
II se expresa dentro de `src/` (`domain` → `application` → `infrastructure`), con `src/app`
como única capa que depende de Next.js/React. `infrastructure/db` tiene dos implementaciones
de la misma interfaz de repositorio (`Prisma` en servidor, `Dexie` en cliente) — el
`application/use-cases` no sabe cuál de las dos está usando.

## Complexity Tracking

*Sin violaciones de la Constitution Check — sección no aplica para esta feature.*
